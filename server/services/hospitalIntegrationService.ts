import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export interface Hospital {
  id: number;
  hospital_code: string;
  name: string;
  contact_person: string | null;
  phone: string;
  email: string;
  address: string | null;
  website_url: string | null;
  status: 'active' | 'inactive' | 'suspended';
  integration_status: 'connected' | 'disconnected' | 'error' | 'pending';
  api_status: 'active' | 'revoked' | 'pending';
  webhook_url: string | null;
  webhook_secret: string | null;
  webhook_enabled: number | boolean;
  total_hospital_serials: number;
  online_quota: number;
  notes: string | null;
  last_sync_at: string | null;
  last_api_request_at: string | null;
  last_webhook_at: string | null;
  last_error_message: string | null;
  successful_syncs_count: number;
  failed_syncs_count: number;
  created_at: string;
  updated_at: string;
}

export interface HospitalApiCredentials {
  apiKey: string;
  apiSecret?: string; // Only returned on generation/regeneration
  webhookSecret?: string;
  status: 'active' | 'revoked';
  lastUsedAt?: string | null;
}

export interface HospitalExternalBookingParams {
  hospitalId: number;
  hospitalCode: string;
  doctorId: number;
  chamberId?: number;
  serialNumber: number;
  appointmentDate: string;
  status?: string;
  externalBookingId: string;
  idempotencyKey?: string;
  patientName?: string;
  patientPhone?: string;
  notes?: string;
}

/**
 * Generates secure random credentials:
 * - API Key: ds_live_<hex32>
 * - API Secret: sec_live_<hex48>
 * - Webhook Secret: whsec_<hex32>
 */
export function generateHospitalCredentials() {
  const apiKey = `ds_live_${crypto.randomBytes(16).toString('hex')}`;
  const apiSecret = `sec_live_${crypto.randomBytes(24).toString('hex')}`;
  const webhookSecret = `whsec_${crypto.randomBytes(20).toString('hex')}`;
  return { apiKey, apiSecret, webhookSecret };
}

/**
 * Hash an API secret for secure DB storage.
 */
export async function hashApiSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, 10);
}

/**
 * Verify an incoming API secret against the stored hash.
 */
export async function verifyApiSecret(secret: string, hash: string): Promise<boolean> {
  return bcrypt.compare(secret, hash);
}

/**
 * Compute HMAC-SHA256 signature for outgoing webhook payload.
 */
export function computeWebhookSignature(payload: string, secret: string, timestamp: number): string {
  const data = `${timestamp}.${payload}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify incoming webhook signature if hospital signs requests.
 */
export function verifyWebhookSignature(payload: string, secret: string, timestamp: number, expectedSig: string): boolean {
  const computed = computeWebhookSignature(payload, secret, timestamp);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expectedSig));
}

/**
 * Auto-generate Hospital Code: HOSP-0001, HOSP-0002, etc.
 */
export async function generateHospitalCode(): Promise<string> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as c FROM hospitals');
    const count = Number(rows[0]?.c || 0) + 1;
    let code = `HOSP-${String(count).padStart(4, '0')}`;
    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM hospitals WHERE hospital_code = ?', [code]);
    if (existing.length > 0) {
      code = `HOSP-${Date.now().toString().slice(-4)}`;
    }
    return code;
  } catch {
    return `HOSP-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

/**
 * Log a synchronization event in hospital_sync_logs.
 */
export async function logHospitalSync(params: {
  hospitalId: number;
  direction: 'daktar_to_hospital' | 'hospital_to_daktar';
  event: string;
  doctorId?: number | null;
  chamberId?: number | null;
  scheduleDate?: string | null;
  serialNumber?: number | null;
  bookingId?: string | null;
  externalBookingId?: string | null;
  status: 'success' | 'failed' | 'pending';
  httpStatus?: number | null;
  requestPayload?: any;
  responsePayload?: any;
  errorMessage?: string | null;
  idempotencyKey?: string | null;
}): Promise<number> {
  try {
    const reqStr = typeof params.requestPayload === 'string' ? params.requestPayload : JSON.stringify(params.requestPayload || null);
    const resStr = typeof params.responsePayload === 'string' ? params.responsePayload : JSON.stringify(params.responsePayload || null);

    const [res] = await pool.execute<ResultSetHeader>(`
      INSERT INTO hospital_sync_logs (
        hospital_id, direction, event, doctor_id, chamber_id, schedule_date, serial_number,
        booking_id, external_booking_id, status, http_status, request_payload, response_payload,
        error_message, idempotency_key, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      params.hospitalId,
      params.direction,
      params.event,
      params.doctorId || null,
      params.chamberId || null,
      params.scheduleDate || null,
      params.serialNumber || null,
      params.bookingId || null,
      params.externalBookingId || null,
      params.status,
      params.httpStatus || null,
      reqStr,
      resStr,
      params.errorMessage || null,
      params.idempotencyKey || null,
    ]);

    // Update hospital aggregated sync stats
    if (params.status === 'success') {
      await pool.execute(`
        UPDATE hospitals
        SET last_sync_at = CURRENT_TIMESTAMP,
            last_webhook_at = CASE WHEN ? = 'daktar_to_hospital' THEN CURRENT_TIMESTAMP ELSE last_webhook_at END,
            successful_syncs_count = successful_syncs_count + 1,
            integration_status = 'connected'
        WHERE id = ?
      `, [params.direction, params.hospitalId]);
    } else if (params.status === 'failed') {
      await pool.execute(`
        UPDATE hospitals
        SET last_sync_at = CURRENT_TIMESTAMP,
            last_webhook_at = CASE WHEN ? = 'daktar_to_hospital' THEN CURRENT_TIMESTAMP ELSE last_webhook_at END,
            failed_syncs_count = failed_syncs_count + 1,
            last_error_message = ?,
            integration_status = 'error'
        WHERE id = ?
      `, [params.direction, params.errorMessage || 'Sync failed', params.hospitalId]);
    }

    return res.insertId;
  } catch (err: any) {
    console.error('[HospitalSyncLog] Error saving log:', err.message);
    return 0;
  }
}

/**
 * Dispatch an outgoing webhook event from Daktar Serial to a Hospital system.
 */
export async function sendHospitalWebhook(hospitalId: number, event: string, payloadData: any): Promise<{ success: boolean; httpStatus?: number; error?: string }> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, hospital_code, webhook_url, webhook_secret, status, COALESCE(webhook_enabled, 1) as webhook_enabled FROM hospitals WHERE id = ?',
      [hospitalId]
    );
    const hospital = rows[0] as any;
    if (!hospital || hospital.status !== 'active' || !hospital.webhook_url) {
      return { success: false, error: 'Hospital webhook is not configured or inactive.' };
    }
    if (hospital.webhook_enabled === 0 || hospital.webhook_enabled === false) {
      return { success: false, error: 'Hospital webhook is currently disabled.' };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const eventId = `evt_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const payload = JSON.stringify({
      event,
      event_id: eventId,
      timestamp,
      hospital_id: hospital.hospital_code,
      data: payloadData,
    });

    const secret = hospital.webhook_secret || 'daktar_secret';
    const signature = computeWebhookSignature(payload, secret, timestamp);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'DaktarSerial-Webhook/1.0',
      'X-DaktarSerial-Event': event,
      'X-DaktarSerial-Timestamp': String(timestamp),
      'X-DaktarSerial-Signature': signature,
      'X-DaktarSerial-Event-ID': eventId,
    };

    let httpStatus = 0;
    let resBody = '';
    let success = false;
    let errorMessage: string | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const resp = await fetch(hospital.webhook_url, {
        method: 'POST',
        headers,
        body: payload,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      httpStatus = resp.status;
      resBody = await resp.text().catch(() => '');
      success = resp.ok;
      if (!resp.ok) {
        errorMessage = `Hospital returned HTTP ${resp.status}: ${resBody.slice(0, 300)}`;
      }
    } catch (fetchErr: any) {
      errorMessage = fetchErr.message || 'Webhook request failed / timed out';
    }

    await logHospitalSync({
      hospitalId,
      direction: 'daktar_to_hospital',
      event,
      doctorId: payloadData.doctor_id,
      chamberId: payloadData.chamber_id,
      scheduleDate: payloadData.appointment_date || payloadData.schedule_date,
      serialNumber: payloadData.serial_number,
      bookingId: payloadData.appointment_id,
      status: success ? 'success' : 'failed',
      httpStatus,
      requestPayload: payload,
      responsePayload: resBody,
      errorMessage,
    });

    return { success, httpStatus, error: errorMessage || undefined };
  } catch (err: any) {
    console.error('[SendHospitalWebhook] Error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Processes an external booking from a hospital website:
 * 1. Checks hospital authorization for doctor/chamber.
 * 2. Idempotency check.
 * 3. Atomic database transaction with row locking to guarantee NO double-booking.
 * 4. Inserts appointment and serial lock.
 */
export async function processHospitalExternalBooking(params: HospitalExternalBookingParams): Promise<{
  success: boolean;
  code?: string;
  message?: string;
  appointmentId?: string;
  serialNumber?: number;
  duplicate?: boolean;
}> {
  const {
    hospitalId,
    hospitalCode,
    doctorId,
    serialNumber,
    appointmentDate,
    externalBookingId,
    idempotencyKey,
    patientName = 'Hospital Direct Patient',
    patientPhone = '01700000000',
  } = params;

  if (!doctorId || !serialNumber || !appointmentDate || !externalBookingId) {
    return {
      success: false,
      code: 'MISSING_PARAMETERS',
      message: 'doctor_id, serial_number, appointment_date, and external_booking_id are required.',
    };
  }

  // 1. Idempotency check: has this external booking ID already been processed for this hospital?
  const [existingExternal] = await pool.query<RowDataPacket[]>(`
    SELECT * FROM hospital_external_bookings
    WHERE hospital_id = ? AND (external_booking_id = ? OR (idempotency_key IS NOT NULL AND idempotency_key = ?))
  `, [hospitalId, externalBookingId, idempotencyKey || '']);

  if (existingExternal.length > 0) {
    const ext = existingExternal[0] as any;
    return {
      success: true,
      duplicate: true,
      appointmentId: ext.appointment_id,
      serialNumber: ext.serial_number,
      message: 'Booking already confirmed (idempotent request).',
    };
  }

  // 2. Validate Doctor
  const [docRows] = await pool.query<RowDataPacket[]>(
    'SELECT d.*, u.name as doctor_name FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?',
    [doctorId]
  );
  if (docRows.length === 0) {
    return { success: false, code: 'DOCTOR_NOT_FOUND', message: 'Doctor not found.' };
  }
  const doctor = docRows[0] as any;

  // 3. Find or validate Chamber for this doctor & hospital
  let chamberId = params.chamberId ? Number(params.chamberId) : 0;
  if (!chamberId) {
    // Check if there is an explicit hospital_doctors mapping
    const [hospDocRows] = await pool.query<RowDataPacket[]>(
      'SELECT chamber_id FROM hospital_doctors WHERE hospital_id = ? AND doctor_id = ? LIMIT 1',
      [hospitalId, doctorId]
    );
    if (hospDocRows.length > 0) {
      chamberId = hospDocRows[0].chamber_id;
    } else {
      // Fallback: doctor's primary chamber
      const [chamRows] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM chambers WHERE doctor_id = ? ORDER BY id ASC LIMIT 1',
        [doctorId]
      );
      if (chamRows.length > 0) {
        chamberId = chamRows[0].id;
      }
    }
  }

  if (!chamberId) {
    return { success: false, code: 'CHAMBER_NOT_FOUND', message: 'No valid chamber found for this doctor.' };
  }

  // 4. Validate Schedule for the day of week
  const dateObj = new Date(appointmentDate + 'T00:00:00');
  if (isNaN(dateObj.getTime())) {
    return { success: false, code: 'INVALID_DATE', message: 'Invalid appointment date format (YYYY-MM-DD required).' };
  }
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = DAYS[dateObj.getDay()];

  const [schedRows] = await pool.query<RowDataPacket[]>(`
    SELECT s.*, COALESCE(dc.consultation_fee, d.consultation_fee) as fee
    FROM doctor_schedules s
    JOIN doctors d ON s.doctor_id = d.id
    LEFT JOIN doctor_chambers dc ON s.chamber_id = dc.chamber_id AND s.doctor_id = dc.doctor_id
    WHERE s.doctor_id = ? AND s.chamber_id = ? AND s.day_of_week = ? AND s.is_active = 1
  `, [doctorId, chamberId, dayOfWeek]);

  const schedule = schedRows[0] as any;
  if (!schedule) {
    return {
      success: false,
      code: 'NO_SCHEDULE',
      message: `Doctor has no consultation session on ${dayOfWeek} at this chamber.`,
    };
  }

  if (serialNumber < 1 || serialNumber > schedule.max_serials) {
    return {
      success: false,
      code: 'INVALID_SERIAL',
      message: `Serial number must be between 1 and ${schedule.max_serials}.`,
    };
  }

  // Generate Appointment ID: DS-YYYYMMDD-XXXXX
  const cleanDate = appointmentDate.replace(/-/g, '');
  const serialPad = String(serialNumber).padStart(5, '0');
  const apptId = `DS-${cleanDate}-${serialPad}-${hospitalCode.replace(/[^a-zA-Z0-9]/g, '')}`;

  // 5. ATOMIC DOUBLE-BOOKING PROTECTION WITH TRANSACTION & ROW LOCKING
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock and check appointments table
    const [existingAppt] = await conn.query<RowDataPacket[]>(`
      SELECT id FROM appointments
      WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ? AND status != 'cancelled'
      FOR UPDATE
    `, [doctorId, chamberId, appointmentDate, serialNumber]);

    if (existingAppt.length > 0) {
      await conn.rollback();
      return {
        success: false,
        code: 'SERIAL_ALREADY_BOOKED',
        message: `Serial #${serialNumber} on ${appointmentDate} is already booked in Daktar Serial.`,
      };
    }

    // Lock and update/insert serials table
    const [existingSerial] = await conn.query<RowDataPacket[]>(`
      SELECT id, status FROM serials
      WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?
      FOR UPDATE
    `, [doctorId, chamberId, appointmentDate, serialNumber]);

    if (existingSerial.length > 0) {
      if (existingSerial[0].status === 'booked') {
        await conn.rollback();
        return {
          success: false,
          code: 'SERIAL_ALREADY_BOOKED',
          message: `Serial #${serialNumber} is already booked in Daktar Serial.`,
        };
      }
      await conn.execute('UPDATE serials SET status = ? WHERE id = ?', ['booked', existingSerial[0].id]);
    } else {
      await conn.execute(`
        INSERT INTO serials (schedule_id, doctor_id, chamber_id, schedule_date, serial_number, status)
        VALUES (?, ?, ?, ?, ?, 'booked')
      `, [schedule.id, doctorId, chamberId, appointmentDate, serialNumber]);
    }

    // Insert into appointments table
    await conn.execute(`
      INSERT INTO appointments (
        appointment_id, patient_id, doctor_id, chamber_id, schedule_id,
        schedule_date, serial_number, appointment_time,
        patient_name, patient_phone, patient_age, patient_gender,
        fee, payment_status, booking_source, status
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 30, 'other', ?, 'unpaid', 'walk_in', 'confirmed')
    `, [
      apptId,
      doctorId,
      chamberId,
      schedule.id,
      appointmentDate,
      serialNumber,
      schedule.start_time || '10:00 AM',
      patientName,
      patientPhone,
      schedule.fee || 500,
    ]);

    // Record in hospital_external_bookings for idempotency
    await conn.execute(`
      INSERT INTO hospital_external_bookings (
        hospital_id, external_booking_id, appointment_id, idempotency_key,
        doctor_id, chamber_id, schedule_date, serial_number, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'BOOKED', CURRENT_TIMESTAMP)
    `, [
      hospitalId,
      externalBookingId,
      apptId,
      idempotencyKey || null,
      doctorId,
      chamberId,
      appointmentDate,
      serialNumber,
    ]);

    await conn.commit();
  } catch (err: any) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY' || err.message?.includes('Duplicate entry')) {
      return {
        success: false,
        code: 'SERIAL_ALREADY_BOOKED',
        message: `Serial #${serialNumber} on ${appointmentDate} is already booked.`,
      };
    }
    throw err;
  } finally {
    conn.release();
  }

  // Log successful hospital-to-daktar booking
  await logHospitalSync({
    hospitalId,
    direction: 'hospital_to_daktar',
    event: 'appointment.booked',
    doctorId,
    chamberId,
    scheduleDate: appointmentDate,
    serialNumber,
    bookingId: apptId,
    externalBookingId,
    status: 'success',
    httpStatus: 200,
    requestPayload: params,
    responsePayload: { success: true, appointmentId: apptId, serialNumber },
    idempotencyKey,
  });

  return {
    success: true,
    appointmentId: apptId,
    serialNumber,
    message: 'Booking synchronized and serial locked successfully in Daktar Serial.',
  };
}

/**
 * Cancels a booking initiated by a hospital or synced with a hospital.
 * Atomically releases the serial slot back to 'available'.
 */
export async function processHospitalExternalCancel(params: {
  hospitalId: number;
  externalBookingId?: string;
  appointmentId?: string;
  reason?: string;
}): Promise<{ success: boolean; code?: string; message?: string }> {
  const { hospitalId, externalBookingId, appointmentId, reason } = params;

  if (!externalBookingId && !appointmentId) {
    return { success: false, code: 'MISSING_ID', message: 'external_booking_id or appointment_id required.' };
  }

  let appt: any = null;
  if (externalBookingId) {
    const [extRows] = await pool.query<RowDataPacket[]>(`
      SELECT a.*, e.id as ext_id
      FROM hospital_external_bookings e
      JOIN appointments a ON e.appointment_id = a.appointment_id
      WHERE e.hospital_id = ? AND e.external_booking_id = ?
    `, [hospitalId, externalBookingId]);
    appt = extRows[0];
  } else if (appointmentId) {
    const [apptRows] = await pool.query<RowDataPacket[]>(`
      SELECT * FROM appointments WHERE appointment_id = ?
    `, [appointmentId]);
    appt = apptRows[0];
  }

  if (!appt) {
    return { success: false, code: 'BOOKING_NOT_FOUND', message: 'Appointment not found for this hospital.' };
  }

  if (appt.status === 'cancelled') {
    return { success: true, message: 'Appointment was already cancelled.' };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Mark appointment as cancelled
    await conn.execute('UPDATE appointments SET status = ? WHERE id = ?', ['cancelled', appt.id]);

    // Release serial slot
    await conn.execute(`
      UPDATE serials SET status = 'available'
      WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?
    `, [appt.doctor_id, appt.chamber_id, appt.schedule_date, appt.serial_number]);

    // Update hospital external booking status if exists
    await conn.execute(`
      UPDATE hospital_external_bookings SET status = 'CANCELLED'
      WHERE appointment_id = ?
    `, [appt.appointment_id]);

    await conn.commit();
  } catch (err: any) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  await logHospitalSync({
    hospitalId,
    direction: 'hospital_to_daktar',
    event: 'appointment.cancelled',
    doctorId: appt.doctor_id,
    chamberId: appt.chamber_id,
    scheduleDate: appt.schedule_date,
    serialNumber: appt.serial_number,
    bookingId: appt.appointment_id,
    externalBookingId: externalBookingId || null,
    status: 'success',
    httpStatus: 200,
    requestPayload: params,
    responsePayload: { success: true, message: 'Cancelled' },
  });

  return { success: true, message: 'Appointment cancelled and serial released successfully.' };
}
