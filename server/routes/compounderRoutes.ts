import { Router } from 'express';
import pool, { logActivity } from '../db.js';
import { compounderMiddleware } from '../auth.js';
import { RowDataPacket } from 'mysql2/promise';
import { bookAppointment, BookingError, DUPLICATE_BOOKING_MESSAGE_BN } from '../appointmentService.js';

const router = Router();

// Every route below is guarded by CompounderMiddleware, which
//   - requires role === 'compounder' with an active account, and
//   - pins the request to the authenticated compounder's assigned doctor.
router.use(compounderMiddleware);

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function todayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function getAssignedDoctor(doctorId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT d.id, d.user_id, d.title, d.qualification, d.specialty_id,
           d.consultation_fee, d.approval_status,
           u.name, u.email, u.phone, u.avatar_url,
           s.name as specialty_name, s.name_bn as specialty_name_bn
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN specialties s ON d.specialty_id = s.id
    WHERE d.id = ?
  `, [doctorId]);
  const doc = (rows[0] as any) || null;
  if (!doc) return null;

  const [specRows] = await pool.query<RowDataPacket[]>(`
    SELECT s.id, s.name, s.name_bn, s.slug, s.icon, ds.is_primary
    FROM doctor_specialties ds
    JOIN specialties s ON ds.specialty_id = s.id
    WHERE ds.doctor_id = ?
    ORDER BY ds.is_primary DESC, s.name ASC
  `, [doctorId]);

  if (specRows.length > 0) {
    doc.specialties = specRows;
    doc.specialty_ids = specRows.map((s: any) => s.id);
    doc.specialty_names = specRows.map((s: any) => s.name).join(' + ');
    doc.specialty_names_bn = specRows.map((s: any) => s.name_bn || s.name).join(' + ');
    doc.specialties_summary = doc.specialty_names;
  } else if (doc.specialty_name) {
    doc.specialties = [{
      id: doc.specialty_id,
      name: doc.specialty_name,
      name_bn: doc.specialty_name_bn,
      is_primary: 1
    }];
    doc.specialty_ids = [doc.specialty_id];
    doc.specialty_names = doc.specialty_name;
    doc.specialty_names_bn = doc.specialty_name_bn || doc.specialty_name;
    doc.specialties_summary = doc.specialty_name;
  } else {
    doc.specialties = [];
    doc.specialty_ids = [];
    doc.specialty_names = '';
    doc.specialty_names_bn = '';
    doc.specialties_summary = '';
  }
  return doc;
}

// 1. Compounder profile + assigned doctor + chambers
router.get('/me', async (req, res) => {
  try {
    const user = (req as any).user;
    const doctorId = (req as any).authorizedDoctorId as number;

    const doctor = await getAssignedDoctor(doctorId);
    if (!doctor) {
      return res.status(404).json({ error: 'Assigned doctor not found. Please contact the administrator.' });
    }

    const [chambers] = await pool.query<RowDataPacket[]>(`
      SELECT c.id, c.name, c.address, c.city, c.area, c.phone
      FROM chambers c
      WHERE c.doctor_id = ?
      ORDER BY c.created_at ASC
    `, [doctorId]);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        doctorId,
      },
      doctor,
      chambers,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Compounder dashboard: schedule + serial board for a date
router.get('/dashboard', async (req, res) => {
  try {
    const doctorId = (req as any).authorizedDoctorId as number;
    const requestedDate = (req.query.date as string) || todayString();
    const chamberIdParam = req.query.chamberId ? Number(req.query.chamberId) : null;

    const dateObj = new Date(requestedDate + 'T00:00:00');
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
    }
    const dayOfWeek = DAY_NAMES[dateObj.getDay()];

    const doctor = await getAssignedDoctor(doctorId);
    if (!doctor) {
      return res.status(404).json({ error: 'Assigned doctor not found. Please contact the administrator.' });
    }

    const [chambers] = await pool.query<RowDataPacket[]>(`
      SELECT c.id, c.name, c.address, c.city, c.area, c.phone
      FROM chambers c
      WHERE c.doctor_id = ?
      ORDER BY c.created_at ASC
    `, [doctorId]);

    // Fetch all active weekly schedules for the assigned doctor
    const [weeklySchedules] = await pool.query<RowDataPacket[]>(`
      SELECT s.*, c.name as chamber_name, c.address as chamber_address, c.city as chamber_city, c.area as chamber_area,
             COALESCE(dc.consultation_fee, d.consultation_fee) as fee
      FROM doctor_schedules s
      JOIN chambers c ON s.chamber_id = c.id
      JOIN doctors d ON s.doctor_id = d.id
      LEFT JOIN doctor_chambers dc ON s.chamber_id = dc.chamber_id AND s.doctor_id = dc.doctor_id
      WHERE s.doctor_id = ? AND s.is_active = 1
      ORDER BY FIELD(s.day_of_week, 'Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'), s.start_time ASC
    `, [doctorId]);

    // If a chamber was requested, it must belong to the assigned doctor.
    let selectedChamber = null;
    if (chamberIdParam) {
      selectedChamber = chambers.find((c: any) => Number(c.id) === chamberIdParam) || null;
      if (!selectedChamber) {
        return res.status(403).json({ error: 'Access denied. That chamber does not belong to your assigned doctor.' });
      }
    }

    // Resolve the schedule for this doctor/date. Prefer the requested chamber.
    let scheduleRows: any[] = [];
    if (selectedChamber) {
      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT s.*, COALESCE(dc.consultation_fee, d.consultation_fee) as fee
        FROM doctor_schedules s
        JOIN doctors d ON s.doctor_id = d.id
        LEFT JOIN doctor_chambers dc ON s.chamber_id = dc.chamber_id AND s.doctor_id = dc.doctor_id
        WHERE s.doctor_id = ? AND s.chamber_id = ? AND s.day_of_week = ? AND s.is_active = 1
      `, [doctorId, selectedChamber.id, dayOfWeek]);
      scheduleRows = rows;
    } else {
      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT s.*, COALESCE(dc.consultation_fee, d.consultation_fee) as fee
        FROM doctor_schedules s
        JOIN doctors d ON s.doctor_id = d.id
        LEFT JOIN doctor_chambers dc ON s.chamber_id = dc.chamber_id AND s.doctor_id = dc.doctor_id
        WHERE s.doctor_id = ? AND s.day_of_week = ? AND s.is_active = 1
        ORDER BY s.start_time ASC
      `, [doctorId, dayOfWeek]);
      scheduleRows = rows;
    }

    const schedule = scheduleRows[0] || null;

    if (schedule) {
      const chamber = chambers.find((c: any) => Number(c.id) === Number(schedule.chamber_id));
      selectedChamber = chamber || selectedChamber;
    }

    // No consultation session configured for this date.
    if (!schedule) {
      return res.json({
        doctor,
        chambers,
        weeklySchedules,
        date: requestedDate,
        dayOfWeek,
        selectedChamberId: selectedChamber?.id || null,
        chamber: selectedChamber,
        schedule: null,
        stats: { total: 0, online: 0, manual: 0, available: 0, cancelled: 0, booked: 0 },
        serials: [],
        message: `No consultation session is scheduled for ${dayOfWeek}.`,
      });
    }

    const [appointments] = await pool.query<RowDataPacket[]>(`
      SELECT a.id, a.appointment_id, a.serial_number, a.appointment_time,
             a.patient_name, a.patient_phone, a.patient_age, a.patient_gender,
             a.payment_status, a.booking_source, a.status, a.created_at
      FROM appointments a
      WHERE a.doctor_id = ? AND a.chamber_id = ? AND a.schedule_date = ?
      ORDER BY a.serial_number ASC
    `, [doctorId, schedule.chamber_id, requestedDate]);

    const bySerial = new Map<number, any>();
    appointments.forEach((a: any) => bySerial.set(Number(a.serial_number), a));

    const maxSerials = Number(schedule.max_serials) || 0;
    const slotDuration = Number(schedule.slot_duration_minutes) || 10;
    const [startHour, startMinute] = String(schedule.start_time).split(':').map(Number);

    const serials: any[] = [];
    let online = 0;
    let manual = 0;
    let cancelled = 0;

    for (let i = 1; i <= maxSerials; i++) {
      const totalMinutes = startHour * 60 + startMinute + (i - 1) * slotDuration;
      const slotHour24 = Math.floor(totalMinutes / 60) % 24;
      const slotMin = totalMinutes % 60;
      const ampm = slotHour24 >= 12 ? 'PM' : 'AM';
      const slotHour12 = slotHour24 % 12 || 12;
      const estimatedTime = `${slotHour12}:${slotMin < 10 ? '0' : ''}${slotMin} ${ampm}`;

      const appt = bySerial.get(i);
      if (!appt) {
        serials.push({
          serial_number: i,
          serial_formatted: i < 10 ? `0${i}` : `${i}`,
          estimated_time: estimatedTime,
          status: 'available',
          can_book: true,
        });
        continue;
      }

      if (appt.status === 'cancelled') {
        cancelled++;
        serials.push({
          serial_number: i,
          serial_formatted: i < 10 ? `0${i}` : `${i}`,
          estimated_time: estimatedTime,
          status: 'cancelled',
          record_id: appt.id,
          appointment_id: appt.appointment_id,
          appointment_status: 'cancelled',
          booking_source: appt.booking_source,
          can_book: false,
        });
        continue;
      }

      const isManual = appt.booking_source === 'compounder';
      if (isManual) manual++;
      else online++;

      serials.push({
        serial_number: i,
        serial_formatted: i < 10 ? `0${i}` : `${i}`,
        estimated_time: estimatedTime,
        status: isManual ? 'manual' : 'online',
        payment_status: appt.payment_status,
        booking_source: appt.booking_source,
        record_id: appt.id,
        appointment_id: appt.appointment_id,
        appointment_status: appt.status,
        patient_name: appt.patient_name,
        patient_phone: appt.patient_phone,
        patient_age: appt.patient_age,
        patient_gender: appt.patient_gender,
        // Booked serials (online or manual) are locked from the Book action.
        can_book: false,
      });
    }

    const available = serials.filter((s) => s.status === 'available').length;

    res.json({
      doctor,
      chambers,
      weeklySchedules,
      date: requestedDate,
      dayOfWeek,
      selectedChamberId: schedule.chamber_id,
      chamber: chambers.find((c: any) => Number(c.id) === Number(schedule.chamber_id)) || selectedChamber,
      schedule: {
        id: schedule.id,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        maxSerials,
        slotDurationMinutes: slotDuration,
        fee: schedule.fee,
      },
      stats: {
        total: maxSerials,
        online,
        manual,
        available,
        cancelled,
        booked: online + manual,
      },
      serials,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Manual serial booking (always unpaid, always compounder-sourced)
router.post('/book', async (req, res) => {
  try {
    const user = (req as any).user;
    const doctorId = (req as any).authorizedDoctorId as number;
    const {
      chamberId,
      scheduleDate,
      serialNumber,
      patientName,
      patientPhone,
      patientAge,
      patientGender,
      problemDescription,
    } = req.body;

    if (!chamberId || !scheduleDate || !serialNumber || !patientName || !patientPhone) {
      return res.status(400).json({
        error: 'Chamber, Date, Serial Number, Patient Name, and Patient Phone are required.',
      });
    }

    // The chamber must belong to the assigned doctor (verified again in the service).
    const [chamRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, name FROM chambers WHERE id = ? AND doctor_id = ?',
      [Number(chamberId), doctorId]
    );
    if (chamRows.length === 0) {
      return res.status(403).json({ error: 'Access denied. That chamber does not belong to your assigned doctor.' });
    }

    // Payment status and booking source are forced server-side; the compounder
    // can never set them, and no fake payment transaction is ever created.
    const result = await bookAppointment({
      doctorId,
      chamberId: Number(chamberId),
      scheduleDate,
      serialNumber: Number(serialNumber),
      patientId: null,
      patientName,
      patientPhone,
      patientAge: patientAge ?? null,
      patientGender: patientGender || 'other',
      problemDescription: problemDescription || null,
      paymentStatus: 'unpaid',
      bookingSource: 'compounder',
      createdBy: user.id,
      requireApprovedDoctor: false,
    });

    await logActivity(
      user.id,
      'COMPOUNDER_BOOK_SERIAL',
      `Compounder ${user.email} booked Serial ${result.serialNumber} (${result.appointmentId}) for patient ${patientName} (unpaid)`
    );

    return res.status(201).json({
      success: true,
      message: 'সিরিয়াল বুকিং সফল হয়েছে (Manual / Non-Payment)',
      serialNumber: result.serialNumber < 10 ? `0${result.serialNumber}` : `${result.serialNumber}`,
      appointmentId: result.appointmentId,
      recordId: result.recordId,
      details: {
        doctorName: result.doctorName,
        chamberName: result.chamberName,
        scheduleDate,
        appointmentTime: result.appointmentTime,
        patientName,
        patientPhone,
        paymentStatus: 'unpaid',
        bookingSource: 'compounder',
        status: 'confirmed',
      },
    });
  } catch (err: any) {
    if (err instanceof BookingError) {
      if (err.code === 'DUPLICATE_BOOKING') {
        return res.status(409).json({
          error: 'DUPLICATE_BOOKING',
          message: 'The requested serial has already been booked. Please select a different serial number.',
          message_bn: DUPLICATE_BOOKING_MESSAGE_BN,
        });
      }
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error('Compounder booking error:', err);
    res.status(500).json({ error: err.message || 'Internal server error during manual booking.' });
  }
});

// 4. Update appointment status (manage queue: waiting, in_consultation, completed, cancelled)
// Only allowed for appointments that belong to the authorized assigned doctor.
router.patch('/appointments/:id/status', async (req, res) => {
  try {
    const user = (req as any).user;
    const doctorId = (req as any).authorizedDoctorId as number;
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['confirmed', 'waiting', 'in_consultation', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Verify appointment belongs strictly to authorized doctor
    const [apptRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, appointment_id, doctor_id, chamber_id, schedule_date, serial_number, patient_name FROM appointments WHERE id = ? AND doctor_id = ?',
      [id, doctorId]
    );
    const appt = apptRows[0] as any;
    if (!appt) {
      return res.status(404).json({ error: 'Appointment not found or does not belong to your assigned doctor.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        'UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, id]
      );

      // If cancelling, release the serial slot
      if (status === 'cancelled') {
        await conn.execute(
          'UPDATE serials SET status = ? WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?',
          ['available', appt.doctor_id, appt.chamber_id, appt.schedule_date, appt.serial_number]
        );
      } else {
        await conn.execute(
          'UPDATE serials SET status = ? WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?',
          ['booked', appt.doctor_id, appt.chamber_id, appt.schedule_date, appt.serial_number]
        );
      }

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    await logActivity(
      user.id,
      'COMPOUNDER_UPDATE_STATUS',
      `Compounder ${user.email} updated appointment ${appt.appointment_id} (Serial ${appt.serial_number}) status to ${status}`
    );

    res.json({ message: `Appointment status updated to ${status}`, appointmentId: appt.appointment_id, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
