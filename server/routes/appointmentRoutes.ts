import { Router } from 'express';
import pool, { logActivity } from '../db.js';
import { requireAuth } from '../auth.js';
import { sendHospitalWebhook } from '../services/hospitalIntegrationService.js';
import { notifyAppointmentCancelled } from '../services/notificationService.js';
import { RowDataPacket } from 'mysql2/promise';
import { bookAppointment, BookingError, DUPLICATE_BOOKING_MESSAGE_BN } from '../appointmentService.js';

const router = Router();

// 1. Book Doctor Serial Appointment (public / online patient booking)
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

    const result = await bookAppointment({
      doctorId: Number(doctorId),
      chamberId: Number(chamberId),
      scheduleDate,
      serialNumber: Number(serialNumber),
      patientId: user?.id || null,
      patientName,
      patientPhone,
      patientAge,
      patientGender,
      problemDescription,
      paymentStatus: 'unpaid',
      bookingSource: 'online',
      requireApprovedDoctor: true,
      createdBy: user?.id || null,
    });

    await logActivity(
      user?.id || null,
      'BOOK_APPOINTMENT',
      `Appointment booked: ${result.appointmentId} (Serial ${result.serialNumber}) for Dr. ${result.doctorName}`
    );

    return res.status(201).json({
      success: true,
      message: 'Appointment Confirmed',
      serialNumber: result.serialNumber < 10 ? `0${result.serialNumber}` : `${result.serialNumber}`,
      appointmentId: result.appointmentId,
      recordId: result.recordId,
      details: {
        doctorName: result.doctorName?.startsWith(result.doctorTitle)
          ? result.doctorName
          : `${result.doctorTitle} ${result.doctorName}`,
        chamberName: result.chamberName,
        chamberAddress: result.chamberAddress,
        scheduleDate,
        appointmentTime: result.appointmentTime,
        consultationFee: result.fee,
        patientName,
        patientPhone,
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

    // Fetch latest user details (especially phone) directly from DB
    const [uRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, phone, email, name FROM users WHERE id = ?',
      [user.id]
    );
    const currentUser = uRows[0] || user;
    const rawPhone = String(currentUser.phone || user.phone || '').trim();
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    const last10Digits = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : '';

    // Check if there is an entry in patients table
    const [pRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM patients WHERE user_id = ?',
      [user.id]
    );
    const patientTableId = pRows[0]?.id || null;

    const [appointments] = await pool.query<RowDataPacket[]>(`
      SELECT a.*,
             a.fee as consultation_fee,
             d.title as doctor_title,
             u.name as doctor_name,
             u.avatar_url as doctor_avatar,
             s.name as specialty_name,
             c.name as chamber_name,
             c.address as chamber_address,
             c.area as chamber_area,
             c.city as chamber_city,
             c.phone as chamber_phone
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      JOIN chambers c ON a.chamber_id = c.id
      WHERE (
        a.patient_id = ?
        OR (? IS NOT NULL AND a.patient_id = ?)
        OR (a.created_by = ? AND a.booking_source = 'online')
        OR (
          ? != '' AND (
            a.patient_phone = ?
            OR a.patient_phone = ?
            OR (? != '' AND RIGHT(REPLACE(REPLACE(REPLACE(a.patient_phone, ' ', ''), '-', ''), '+', ''), 10) = ?)
          )
        )
      )
      ORDER BY a.schedule_date DESC, a.serial_number ASC
    `, [
      user.id,
      patientTableId,
      patientTableId,
      user.id,
      rawPhone,
      rawPhone,
      cleanPhone,
      last10Digits,
      last10Digits
    ]);

    // Attach multi-specialty combination (e.g. Cardiology + Medicine) if available
    if (appointments.length > 0) {
      const docIds = Array.from(new Set(appointments.map((a: any) => a.doctor_id)));
      const placeholders = docIds.map(() => '?').join(',');
      const [specRows] = await pool.query<RowDataPacket[]>(
        `SELECT ds.doctor_id, s.name, s.name_bn
         FROM doctor_specialties ds
         JOIN specialties s ON ds.specialty_id = s.id
         WHERE ds.doctor_id IN (${placeholders})
         ORDER BY ds.is_primary DESC, s.name ASC`,
        docIds
      );
      const specMap = new Map<number, string[]>();
      for (const r of specRows as any[]) {
        if (!specMap.has(r.doctor_id)) specMap.set(r.doctor_id, []);
        specMap.get(r.doctor_id)!.push(r.name);
      }
      for (const a of appointments as any[]) {
        const names = specMap.get(a.doctor_id);
        if (names && names.length > 0) {
          a.specialty_name = names.join(' + ');
        }
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const upcoming = appointments.filter(
      (a: any) =>
        a.schedule_date >= todayStr &&
        a.status !== 'completed' &&
        a.status !== 'cancelled'
    );
    const past = appointments.filter(
      (a: any) =>
        a.schedule_date < todayStr ||
        a.status === 'completed' ||
        a.status === 'cancelled'
    );

    res.json({
      success: true,
      appointments,
      all: appointments,
      upcoming,
      past,
      total: appointments.length,
    });
  } catch (err: any) {
    console.error('Error fetching patient appointments:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch appointments.' });
  }
});

// 4. Cancel Appointment (Patient or Admin or Doctor)
router.patch('/cancel/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const [apptRows] = await pool.query<RowDataPacket[]>(`
      SELECT a.*, d.user_id as doctor_user_id, u.name as doctor_name, c.name as chamber_name
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u ON d.user_id = u.id
      JOIN chambers c ON a.chamber_id = c.id
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

      // Trigger In-App & Firebase Push Notifications for cancellation
      notifyAppointmentCancelled({
        appointmentId: appt.appointment_id,
        serialNumber: appt.serial_number,
        scheduleDate: appt.schedule_date,
        doctorId: appt.doctor_id,
        doctorName: appt.doctor_name || 'Doctor',
        chamberId: appt.chamber_id,
        chamberName: appt.chamber_name || 'Chamber',
        patientName: appt.patient_name,
        cancelledByRole: user.role,
      }).catch((notifErr) => {
        console.warn('[Notification] Cancellation notice warning:', notifErr.message);
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    // If linked to a hospital, dispatch cancellation webhook
    try {
      const [chamRows] = await pool.query<RowDataPacket[]>('SELECT hospital_id FROM chambers WHERE id = ?', [appt.chamber_id]);
      const hospitalId = appt.hospital_id || chamRows[0]?.hospital_id;
      if (hospitalId) {
        sendHospitalWebhook(hospitalId, 'appointment.cancelled', {
          event: 'appointment.cancelled',
          appointment_id: appt.appointment_id,
          doctor_id: appt.doctor_id,
          chamber_id: appt.chamber_id,
          serial_number: appt.serial_number,
          appointment_date: appt.schedule_date,
          status: 'CANCELLED',
        }).catch((e) => console.warn('[HospitalWebhook] Cancel notice:', e.message));
      }
    } catch (e) {
      // ignore
    }

    await logActivity(user.id, 'CANCEL_APPOINTMENT', `Cancelled appointment ${appt.appointment_id}`);

    res.json({ message: 'Appointment cancelled successfully. Serial slot released.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
