import { Router } from 'express';
import pool, { logActivity } from '../db.js';
import { requireAuth } from '../auth.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const router = Router();

/**
 * Generate formatted unique Appointment ID: DS-YYYYMMDD-XXXXX
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

// 1. Book Doctor Serial Appointment
router.post('/book', async (req, res) => {
  try {
    const user = (req as any).user;
    const {
      doctorId,
      chamberId,
      scheduleDate,
      serialNumber,
      patientName,
      patientPhone,
      patientAge,
      patientGender,
      problemDescription,
    } = req.body;

    if (!doctorId || !chamberId || !scheduleDate || !serialNumber || !patientName || !patientPhone) {
      return res.status(400).json({
        error: 'Doctor, Chamber, Schedule Date, Serial Number, Patient Name, and Phone number are required.',
      });
    }

    const docIdNum = Number(doctorId);
    const chamIdNum = Number(chamberId);
    const serialNum = Number(serialNumber);

    // 1. Validate Doctor
    const [docRows] = await pool.query<RowDataPacket[]>(`
      SELECT d.*, u.name as doctor_name
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      WHERE d.id = ? AND d.approval_status = 'approved'
    `, [docIdNum]);
    const doctor = docRows[0] as any;
    if (!doctor) {
      return res.status(400).json({ error: 'Doctor not found or not approved for public booking.' });
    }

    // 2. Validate Chamber
    const [chamRows] = await pool.query<RowDataPacket[]>(`
      SELECT * FROM chambers WHERE id = ? AND doctor_id = ?
    `, [chamIdNum, docIdNum]);
    const chamber = chamRows[0] as any;
    if (!chamber) {
      return res.status(400).json({ error: 'Invalid chamber for this doctor.' });
    }

    // 3. Validate Day of Week and Schedule
    const dateObj = new Date(scheduleDate + 'T00:00:00');
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid schedule date.' });
    }
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[dateObj.getDay()];

    const [schedRows] = await pool.query<RowDataPacket[]>(`
      SELECT s.*, COALESCE(dc.consultation_fee, d.consultation_fee) as fee
      FROM doctor_schedules s
      JOIN doctors d ON s.doctor_id = d.id
      LEFT JOIN doctor_chambers dc ON s.chamber_id = dc.chamber_id AND s.doctor_id = dc.doctor_id
      WHERE s.doctor_id = ? AND s.chamber_id = ? AND s.day_of_week = ? AND s.is_active = 1
    `, [docIdNum, chamIdNum, dayOfWeek]);
    const schedule = schedRows[0] as any;

    if (!schedule) {
      return res.status(400).json({
        error: `Doctor has no consultation session scheduled for ${dayOfWeek} at ${chamber.name}.`,
      });
    }

    // 4. Validate Serial Range
    if (serialNum < 1 || serialNum > schedule.max_serials) {
      return res.status(400).json({
        error: `Invalid serial number. Must be between 1 and ${schedule.max_serials}.`,
      });
    }

    // Calculate Estimated Appointment Time
    const [startH, startM] = String(schedule.start_time).split(':').map(Number);
    const slotDuration = schedule.slot_duration_minutes || 10;
    const totalMinutes = (startH * 60 + startM) + (serialNum - 1) * slotDuration;
    const slotHour24 = Math.floor(totalMinutes / 60) % 24;
    const slotMin = totalMinutes % 60;
    const ampm = slotHour24 >= 12 ? 'PM' : 'AM';
    const slotHour12 = slotHour24 % 12 || 12;
    const appointmentTime = `${slotHour12}:${slotMin < 10 ? '0' : ''}${slotMin} ${ampm}`;

    const parsedAge = patientAge ? parseInt(patientAge, 10) : null;
    const gender = patientGender || 'other';
    const patientUserId = user?.id || null;

    const appointmentId = await generateAppointmentId(scheduleDate, serialNum);

    // Concurrency-Safe Transaction
    const conn = await pool.getConnection();
    let recordId: number;

    try {
      await conn.beginTransaction();

      // Check existing active appointment for this slot with exclusive row locking (FOR UPDATE)
      const [existingApptRows] = await conn.query<RowDataPacket[]>(`
        SELECT id, appointment_id, status
        FROM appointments
        WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ? AND status != 'cancelled'
        FOR UPDATE
      `, [docIdNum, chamIdNum, scheduleDate, serialNum]);

      if (existingApptRows.length > 0) {
        throw new Error('DUPLICATE_BOOKING');
      }

      // Check or create serial slot with locking
      const [existingSerialRows] = await conn.query<RowDataPacket[]>(`
        SELECT id, status
        FROM serials
        WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?
        FOR UPDATE
      `, [docIdNum, chamIdNum, scheduleDate, serialNum]);

      if (existingSerialRows.length > 0) {
        await conn.execute(`
          UPDATE serials
          SET status = 'booked'
          WHERE id = ?
        `, [existingSerialRows[0].id]);
      } else {
        await conn.execute(`
          INSERT INTO serials (schedule_id, doctor_id, chamber_id, schedule_date, serial_number, status)
          VALUES (?, ?, ?, ?, ?, 'booked')
        `, [schedule.id, docIdNum, chamIdNum, scheduleDate, serialNum]);
      }

      // Insert confirmed appointment
      const [insertResult] = await conn.execute<ResultSetHeader>(`
        INSERT INTO appointments (
          appointment_id, patient_id, doctor_id, chamber_id, schedule_id,
          schedule_date, serial_number, appointment_time,
          patient_name, patient_phone, patient_age, patient_gender,
          problem_description, fee, payment_status, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', 'confirmed')
      `, [
        appointmentId,
        patientUserId,
        docIdNum,
        chamIdNum,
        schedule.id,
        scheduleDate,
        serialNum,
        appointmentTime,
        patientName,
        patientPhone,
        parsedAge,
        gender,
        problemDescription || null,
        schedule.fee
      ]);

      recordId = insertResult.insertId;
      await conn.commit();
    } catch (txErr: any) {
      await conn.rollback();
      if (txErr.message?.includes('DUPLICATE_BOOKING') || txErr.code === 'ER_DUP_ENTRY' || txErr.message?.includes('Duplicate entry')) {
        return res.status(409).json({
          error: 'DUPLICATE_BOOKING',
          message: 'The requested serial has already been booked. Please select a different serial number.',
        });
      }
      throw txErr;
    } finally {
      conn.release();
    }

    await logActivity(patientUserId, 'BOOK_APPOINTMENT', `Appointment booked: ${appointmentId} (Serial ${serialNum}) for Dr. ${doctor.doctor_name}`);

    return res.status(201).json({
      success: true,
      message: 'Appointment Confirmed',
      serialNumber: serialNum < 10 ? `0${serialNum}` : `${serialNum}`,
      appointmentId,
      recordId,
      details: {
        doctorName: doctor.doctor_name?.startsWith(doctor.title) ? doctor.doctor_name : `${doctor.title} ${doctor.doctor_name}`,
        chamberName: chamber.name,
        chamberAddress: chamber.address,
        scheduleDate,
        appointmentTime,
        consultationFee: schedule.fee,
        patientName,
        patientPhone,
        status: 'confirmed',
      },
    });
  } catch (err: any) {
    console.error('Booking error:', err);
    res.status(500).json({ error: err.message || 'Internal server error during appointment booking.' });
  }
});

// 2. Get Single Appointment Details (Public confirmation or receipt)
router.get('/details/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const [appointmentRows] = await pool.query<RowDataPacket[]>(`
      SELECT a.*, d.title as doctor_title, u.name as doctor_name, u.avatar_url as doctor_avatar,
             s.name as specialty_name, c.name as chamber_name, c.address as chamber_address, c.area as chamber_area, c.phone as chamber_phone
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      JOIN chambers c ON a.chamber_id = c.id
      WHERE a.appointment_id = ?
    `, [appointmentId]);

    const appointment = appointmentRows[0] as any;

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    res.json({ appointment });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Patient Dashboard: Get My Appointments
router.get('/my-appointments', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    const [appointments] = await pool.query<RowDataPacket[]>(`
      SELECT a.*, d.title as doctor_title, u.name as doctor_name, u.avatar_url as doctor_avatar,
             s.name as specialty_name, c.name as chamber_name, c.address as chamber_address, c.area as chamber_area
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      JOIN chambers c ON a.chamber_id = c.id
      WHERE a.patient_id = ? OR a.patient_phone = ?
      ORDER BY a.schedule_date DESC, a.serial_number ASC
    `, [user.id, user.phone || '']);

    const todayStr = new Date().toISOString().split('T')[0];

    const upcoming = appointments.filter((a: any) => a.schedule_date >= todayStr && a.status !== 'completed' && a.status !== 'cancelled');
    const past = appointments.filter((a: any) => a.schedule_date < todayStr || a.status === 'completed' || a.status === 'cancelled');

    res.json({ upcoming, past, all: appointments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Cancel Appointment (Patient or Admin or Doctor)
router.patch('/cancel/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const [apptRows] = await pool.query<RowDataPacket[]>(`
      SELECT a.*, d.user_id as doctor_user_id
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.id = ?
    `, [id]);

    const appt = apptRows[0] as any;
    if (!appt) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    // Permission check
    if (user.role !== 'admin' && appt.patient_id !== user.id && appt.doctor_user_id !== user.id) {
      return res.status(403).json({ error: 'Not authorized to cancel this appointment.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(`
        UPDATE appointments
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [id]);

      await conn.execute(`
        UPDATE serials
        SET status = 'available'
        WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?
      `, [appt.doctor_id, appt.chamber_id, appt.schedule_date, appt.serial_number]);

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    await logActivity(user.id, 'CANCEL_APPOINTMENT', `Cancelled appointment ${appt.appointment_id}`);

    res.json({ message: 'Appointment cancelled successfully. Serial slot released.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
