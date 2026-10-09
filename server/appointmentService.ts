import pool from './db.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { sendHospitalWebhook } from './services/hospitalIntegrationService.js';
import { notifyBookingSuccess } from './services/notificationService.js';

export type BookingSource = 'online' | 'compounder' | 'admin' | 'walk_in';
export type PaymentStatus = 'unpaid' | 'paid' | 'exempt';

export interface BookAppointmentParams {
  doctorId: number;
  chamberId: number;
  scheduleDate: string;
  serialNumber: number;
  patientId?: number | null;
  patientName: string;
  patientPhone: string;
  patientAge?: number | string | null;
  patientGender?: string | null;
  problemDescription?: string | null;
  paymentStatus?: PaymentStatus;
  bookingSource?: BookingSource;
  createdBy?: number | null;
  /** When true the doctor must have approval_status = 'approved'. */
  requireApprovedDoctor?: boolean;
  /** Restrict booking to a specific chamber (used by the compounder flow). */
  enforceChamberId?: number | null;
}

export interface BookAppointmentResult {
  recordId: number;
  appointmentId: string;
  serialNumber: number;
  appointmentTime: string;
  fee: number;
  scheduleId: number;
  chamberName: string;
  chamberAddress: string;
  doctorName: string;
  doctorTitle: string;
}

/** Raised for any expected, client-facing booking failure. */
export class BookingError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Generate a formatted unique Appointment ID: DS-YYYYMMDD-XXXXX
 */
async function generateAppointmentId(dateStr: string, serialNum: number): Promise<string> {
  const cleanDate = dateStr.replace(/-/g, '');
  const serialPad = String(serialNum).padStart(5, '0');
  let apptId = `DS-${cleanDate}-${serialPad}`;

  const [existing] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM appointments WHERE appointment_id = ?',
    [apptId]
  );
  if (existing.length > 0) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    apptId = `DS-${cleanDate}-${serialPad}-${randomSuffix}`;
  }
  return apptId;
}

function formatSlotTime(startTime: string, slotDuration: number, serialNum: number): string {
  const [startH, startM] = String(startTime).split(':').map(Number);
  const totalMinutes = startH * 60 + startM + (serialNum - 1) * slotDuration;
  const slotHour24 = Math.floor(totalMinutes / 60) % 24;
  const slotMin = totalMinutes % 60;
  const ampm = slotHour24 >= 12 ? 'PM' : 'AM';
  const slotHour12 = slotHour24 % 12 || 12;
  return `${slotHour12}:${slotMin < 10 ? '0' : ''}${slotMin} ${ampm}`;
}

/**
 * The single, shared serial-booking engine used by every booking path
 * (public online booking and compounder manual booking).
 *
 * Guarantees double-booking protection through:
 *  1. Server-side validation (doctor/chamber/schedule/serial range)
 *  2. A database transaction
 *  3. SELECT ... FOR UPDATE row locking on the slot
 *  4. The database UNIQUE constraint on (doctor, chamber, date, serial)
 */
export async function bookAppointment(params: BookAppointmentParams): Promise<BookAppointmentResult> {
  const {
    doctorId,
    chamberId,
    scheduleDate,
    serialNumber,
    patientId = null,
    patientName,
    patientPhone,
    patientAge = null,
    patientGender = 'other',
    problemDescription = null,
    paymentStatus = 'unpaid',
    bookingSource = 'online',
    createdBy = null,
    requireApprovedDoctor = false,
    enforceChamberId = null,
  } = params;

  const docIdNum = Number(doctorId);
  const chamIdNum = Number(chamberId);
  const serialNum = Number(serialNumber);

  if (!docIdNum || !chamIdNum || !scheduleDate || !serialNum || !patientName || !patientPhone) {
    throw new BookingError(
      'VALIDATION_ERROR',
      'Doctor, Chamber, Schedule Date, Serial Number, Patient Name, and Phone number are required.'
    );
  }

  if (enforceChamberId !== null && Number(enforceChamberId) !== chamIdNum) {
    throw new BookingError('FORBIDDEN_CHAMBER', 'You can only book serials for your assigned chamber.', 403);
  }

  // 1. Validate Doctor
  const doctorSql = requireApprovedDoctor
    ? `SELECT d.*, u.name as doctor_name FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ? AND d.approval_status = 'approved'`
    : `SELECT d.*, u.name as doctor_name FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?`;
  const [docRows] = await pool.query<RowDataPacket[]>(doctorSql, [docIdNum]);
  const doctor = docRows[0] as any;
  if (!doctor) {
    throw new BookingError('DOCTOR_NOT_FOUND', 'Doctor not found or not approved for booking.');
  }

  // 2. Validate Chamber & Hospital Quota
  let chamber: any = null;
  let linkedHospitalId: number | null = null;
  let allocatedOnlineQuota: number | null = null;
  let hospitalCode: string | null = null;
  let hospitalName: string | null = null;

  try {
    const [chamRows] = await pool.query<RowDataPacket[]>(`
      SELECT c.*,
        COALESCE(hd.hospital_id, c.hospital_id) as linked_hospital_id,
        COALESCE(hd.online_quota, h.online_quota) as allocated_online_quota,
        h.hospital_code,
        h.name as hospital_name
      FROM chambers c
      LEFT JOIN hospital_doctors hd ON hd.chamber_id = c.id AND hd.doctor_id = c.doctor_id
      LEFT JOIN hospitals h ON h.id = COALESCE(hd.hospital_id, c.hospital_id)
      WHERE c.id = ? AND c.doctor_id = ?
    `, [chamIdNum, docIdNum]);

    chamber = chamRows[0] as any;
    if (chamber) {
      linkedHospitalId = chamber.linked_hospital_id ? Number(chamber.linked_hospital_id) : null;
      allocatedOnlineQuota = chamber.allocated_online_quota ? Number(chamber.allocated_online_quota) : null;
      hospitalCode = chamber.hospital_code || null;
      hospitalName = chamber.hospital_name || null;
    }
  } catch {
    const [chamRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM chambers WHERE id = ? AND doctor_id = ?',
      [chamIdNum, docIdNum]
    );
    chamber = chamRows[0] as any;
  }

  if (!chamber) {
    throw new BookingError('INVALID_CHAMBER', 'Invalid chamber for this doctor.');
  }

  // 2b. If linked to an integrated hospital, enforce the online serial quota for public bookings
  if (linkedHospitalId && allocatedOnlineQuota && bookingSource === 'online') {
    if (serialNum > allocatedOnlineQuota) {
      throw new BookingError(
        'QUOTA_EXCEEDED',
        `Serial #${serialNum} exceeds the online quota (${allocatedOnlineQuota} serials) allocated to Daktar Serial at ${hospitalName || 'this hospital'}. Please select a serial from 1 to ${allocatedOnlineQuota}.`
      );
    }
  }

  // 3. Validate Day of Week and Schedule
  const dateObj = new Date(scheduleDate + 'T00:00:00');
  if (isNaN(dateObj.getTime())) {
    throw new BookingError('INVALID_DATE', 'Invalid schedule date.');
  }
  const dayOfWeek = DAY_NAMES[dateObj.getDay()];

  const [schedRows] = await pool.query<RowDataPacket[]>(`
    SELECT s.*, COALESCE(dc.consultation_fee, d.consultation_fee) as fee
    FROM doctor_schedules s
    JOIN doctors d ON s.doctor_id = d.id
    LEFT JOIN doctor_chambers dc ON s.chamber_id = dc.chamber_id AND s.doctor_id = dc.doctor_id
    WHERE s.doctor_id = ? AND s.chamber_id = ? AND s.day_of_week = ? AND s.is_active = 1
  `, [docIdNum, chamIdNum, dayOfWeek]);
  const schedule = schedRows[0] as any;

  if (!schedule) {
    throw new BookingError(
      'NO_SCHEDULE',
      `Doctor has no consultation session scheduled for ${dayOfWeek} at ${chamber.name}.`
    );
  }

  // 4. Validate Serial Range
  if (serialNum < 1 || serialNum > schedule.max_serials) {
    throw new BookingError(
      'INVALID_SERIAL',
      `Invalid serial number. Must be between 1 and ${schedule.max_serials}.`
    );
  }

  const appointmentTime = formatSlotTime(schedule.start_time, schedule.slot_duration_minutes || 10, serialNum);
  const parsedAge = patientAge ? parseInt(String(patientAge), 10) : null;
  const appointmentId = await generateAppointmentId(scheduleDate, serialNum);

  // Concurrency-safe transaction
  const conn = await pool.getConnection();
  let recordId: number;

  try {
    await conn.beginTransaction();

    // Re-check the slot while holding an exclusive lock.
    const [existingApptRows] = await conn.query<RowDataPacket[]>(`
      SELECT id FROM appointments
      WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ? AND status != 'cancelled'
      FOR UPDATE
    `, [docIdNum, chamIdNum, scheduleDate, serialNum]);

    if (existingApptRows.length > 0) {
      throw new BookingError('DUPLICATE_BOOKING', 'DUPLICATE_BOOKING', 409);
    }

    const [existingSerialRows] = await conn.query<RowDataPacket[]>(`
      SELECT id FROM serials
      WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?
      FOR UPDATE
    `, [docIdNum, chamIdNum, scheduleDate, serialNum]);

    if (existingSerialRows.length > 0) {
      await conn.execute('UPDATE serials SET status = ? WHERE id = ?', ['booked', existingSerialRows[0].id]);
    } else {
      await conn.execute(`
        INSERT INTO serials (schedule_id, doctor_id, chamber_id, schedule_date, serial_number, status)
        VALUES (?, ?, ?, ?, ?, 'booked')
      `, [schedule.id, docIdNum, chamIdNum, scheduleDate, serialNum]);
    }

    const [insertResult] = await conn.execute<ResultSetHeader>(`
      INSERT INTO appointments (
        appointment_id, patient_id, doctor_id, chamber_id, schedule_id,
        schedule_date, serial_number, appointment_time,
        patient_name, patient_phone, patient_age, patient_gender,
        problem_description, fee, payment_status, booking_source, created_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
    `, [
      appointmentId,
      patientId,
      docIdNum,
      chamIdNum,
      schedule.id,
      scheduleDate,
      serialNum,
      appointmentTime,
      patientName,
      patientPhone,
      parsedAge,
      patientGender,
      problemDescription,
      schedule.fee,
      paymentStatus,
      bookingSource,
      createdBy,
    ]);

    recordId = insertResult.insertId;
    await conn.commit();

    // 5. Trigger In-App & Firebase Push Notifications (Admin & assigned Compounder)
    notifyBookingSuccess({
      appointmentId,
      serialNumber: serialNum,
      appointmentTime,
      scheduleDate,
      doctorId: docIdNum,
      doctorName: doctor.doctor_name,
      doctorTitle: doctor.title,
      chamberId: chamIdNum,
      chamberName: chamber.name,
      patientName,
      patientPhone,
      fee: schedule.fee,
      bookingSource,
    }).catch((notifErr) => {
      console.warn('[Notification] Background booking notice error:', notifErr.message);
    });

    // 6. Outgoing Webhook Synchronization to Hospital (if integrated and not external loopback)
    if (linkedHospitalId && bookingSource !== 'walk_in') {
      sendHospitalWebhook(linkedHospitalId, 'appointment.booked', {
        event: 'appointment.booked',
        hospital_id: hospitalCode,
        doctor_id: docIdNum,
        chamber_id: chamIdNum,
        schedule_id: schedule.id,
        serial_id: `SER-${scheduleDate.replace(/-/g, '')}-${String(serialNum).padStart(4, '0')}`,
        serial_number: serialNum,
        appointment_date: scheduleDate,
        patient_name: patientName,
        patient_phone: patientPhone,
        status: 'BOOKED',
        appointment_id: appointmentId,
      }).catch((webhookErr) => {
        console.warn('[HospitalWebhook] Background dispatch notice:', webhookErr.message);
      });
    }
  } catch (txErr: any) {
    await conn.rollback();
    if (txErr instanceof BookingError) throw txErr;
    if (txErr.code === 'ER_DUP_ENTRY' || txErr.message?.includes('Duplicate entry') || txErr.message?.includes('UNIQUE constraint')) {
      throw new BookingError('DUPLICATE_BOOKING', 'DUPLICATE_BOOKING', 409);
    }
    throw txErr;
  } finally {
    conn.release();
  }

  return {
    recordId,
    appointmentId,
    serialNumber: serialNum,
    appointmentTime,
    fee: schedule.fee,
    scheduleId: schedule.id,
    chamberName: chamber.name,
    chamberAddress: chamber.address,
    doctorName: doctor.doctor_name,
    doctorTitle: doctor.title,
  };
}

export const DUPLICATE_BOOKING_MESSAGE_BN = 'এই সিরিয়ালটি ইতিমধ্যে বুক হয়ে গেছে। অন্য একটি সিরিয়াল নির্বাচন করুন।';
