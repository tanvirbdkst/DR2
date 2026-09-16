import { Router } from 'express';
import pool, { logActivity } from '../db.js';
import { requireRole } from '../auth.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const router = Router();

// Protect all doctor routes
router.use(requireRole(['doctor']));

// Helper to get current doctor record
async function getDoctorByUserId(userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
            s.name as specialty_name, s.name_bn as specialty_name_bn
     FROM doctors d
     JOIN users u ON d.user_id = u.id
     LEFT JOIN specialties s ON d.specialty_id = s.id
     WHERE d.user_id = ?`,
    [userId]
  );
  return (rows[0] as any) || null;
}

// 1. Get Doctor Profile
router.get('/profile', async (req, res) => {
  try {
    const user = (req as any).user;
    const doctor = await getDoctorByUserId(user.id);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    const [chambers] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, dc.consultation_fee, dc.follow_up_fee
       FROM chambers c
       LEFT JOIN doctor_chambers dc ON c.id = dc.chamber_id AND dc.doctor_id = c.doctor_id
       WHERE c.doctor_id = ?
       ORDER BY c.created_at DESC`,
      [doctor.id]
    );

    const [schedules] = await pool.query<RowDataPacket[]>(
      `SELECT s.*, c.name as chamber_name
       FROM doctor_schedules s
       JOIN chambers c ON s.chamber_id = c.id
       WHERE s.doctor_id = ?
       ORDER BY s.day_of_week ASC, s.start_time ASC`,
      [doctor.id]
    );

    res.json({ doctor, chambers, schedules });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Update Doctor Profile
router.put('/profile', async (req, res) => {
  try {
    const user = (req as any).user;
    const doctor = await getDoctorByUserId(user.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const {
      name,
      phone,
      avatarUrl,
      title,
      bmdcNumber,
      specialtyId,
      qualification,
      experienceYears,
      bio,
      consultationFee,
    } = req.body;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Update user details
      await conn.execute(
        `UPDATE users
         SET name = COALESCE(?, name),
             phone = COALESCE(?, phone),
             avatar_url = COALESCE(?, avatar_url),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name ?? null, phone ?? null, avatarUrl ?? null, user.id]
      );

      // Update doctor details
      await conn.execute(
        `UPDATE doctors
         SET title = COALESCE(?, title),
             bmdc_number = COALESCE(?, bmdc_number),
             specialty_id = COALESCE(?, specialty_id),
             qualification = COALESCE(?, qualification),
             experience_years = COALESCE(?, experience_years),
             bio = COALESCE(?, bio),
             consultation_fee = COALESCE(?, consultation_fee),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          title ?? null,
          bmdcNumber ?? null,
          specialtyId ? Number(specialtyId) : null,
          qualification ?? null,
          experienceYears !== undefined ? Number(experienceYears) : null,
          bio ?? null,
          consultationFee !== undefined ? Number(consultationFee) : null,
          doctor.id
        ]
      );

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    await logActivity(user.id, 'UPDATE_DOCTOR_PROFILE', `Doctor profile updated for ID ${doctor.id}`);

    const updated = await getDoctorByUserId(user.id);
    res.json({ message: 'Profile updated successfully', doctor: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Create Chamber
router.post('/chambers', async (req, res) => {
  try {
    const user = (req as any).user;
    const doctor = await getDoctorByUserId(user.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const { name, address, city = 'Dhaka', area, phone, mapLocation, consultationFee = 500, followUpFee = 300 } = req.body;

    if (!name || !address || !area) {
      return res.status(400).json({ error: 'Chamber name, address, and area are required.' });
    }

    const conn = await pool.getConnection();
    let chamberId: number;

    try {
      await conn.beginTransaction();

      const [chamberRes] = await conn.execute<ResultSetHeader>(
        `INSERT INTO chambers (doctor_id, name, address, city, area, phone, map_location)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [doctor.id, name, address, city, area, phone || null, mapLocation || null]
      );
      chamberId = chamberRes.insertId;

      await conn.execute(
        `INSERT INTO doctor_chambers (doctor_id, chamber_id, consultation_fee, follow_up_fee)
         VALUES (?, ?, ?, ?)`,
        [doctor.id, chamberId, Number(consultationFee), Number(followUpFee)]
      );

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    await logActivity(user.id, 'CREATE_CHAMBER', `Created chamber "${name}" for doctor ID ${doctor.id}`);

    res.status(201).json({ message: 'Chamber created successfully', chamberId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update Chamber
router.put('/chambers/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    const doctor = await getDoctorByUserId(user.id);
    const { id } = req.params;
    const { name, address, city, area, phone, mapLocation, consultationFee, followUpFee } = req.body;

    const [chamberRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM chambers WHERE id = ? AND doctor_id = ?',
      [id, doctor.id]
    );
    if (chamberRows.length === 0) return res.status(404).json({ error: 'Chamber not found' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE chambers
         SET name = COALESCE(?, name),
             address = COALESCE(?, address),
             city = COALESCE(?, city),
             area = COALESCE(?, area),
             phone = COALESCE(?, phone),
             map_location = COALESCE(?, map_location),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name ?? null, address ?? null, city ?? null, area ?? null, phone ?? null, mapLocation ?? null, id]
      );

      if (consultationFee !== undefined || followUpFee !== undefined) {
        await conn.execute(
          `INSERT INTO doctor_chambers (doctor_id, chamber_id, consultation_fee, follow_up_fee)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             consultation_fee = VALUES(consultation_fee),
             follow_up_fee = VALUES(follow_up_fee)`,
          [doctor.id, id, consultationFee ? Number(consultationFee) : 500, followUpFee ? Number(followUpFee) : 300]
        );
      }

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    res.json({ message: 'Chamber updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Delete Chamber
router.delete('/chambers/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    const doctor = await getDoctorByUserId(user.id);
    const { id } = req.params;

    await pool.execute('DELETE FROM chambers WHERE id = ? AND doctor_id = ?', [id, doctor.id]);
    res.json({ message: 'Chamber deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Create Schedule (Day, Start/End Time, Max Serial Capacity)
router.post('/schedules', async (req, res) => {
  try {
    const user = (req as any).user;
    const doctor = await getDoctorByUserId(user.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const { chamberId, dayOfWeek, startTime, endTime, maxSerials = 20, slotDurationMinutes = 10 } = req.body;

    if (!chamberId || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({ error: 'Chamber, day of week, start time, and end time are required.' });
    }

    const [chamberRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM chambers WHERE id = ? AND doctor_id = ?',
      [chamberId, doctor.id]
    );
    if (chamberRows.length === 0) {
      return res.status(400).json({ error: 'Invalid chamber selected.' });
    }

    const [insertRes] = await pool.execute<ResultSetHeader>(
      `INSERT INTO doctor_schedules (doctor_id, chamber_id, day_of_week, start_time, end_time, max_serials, slot_duration_minutes, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        doctor.id,
        Number(chamberId),
        dayOfWeek,
        startTime,
        endTime,
        Math.max(1, Number(maxSerials) || 20),
        Number(slotDurationMinutes) || 10
      ]
    );

    const scheduleId = insertRes.insertId;

    await logActivity(user.id, 'CREATE_SCHEDULE', `Created schedule for doctor ${doctor.id} on ${dayOfWeek} (${startTime}-${endTime}, max: ${maxSerials})`);

    res.status(201).json({
      message: `Schedule created successfully! ${maxSerials} serial slots configured for ${dayOfWeek}.`,
      scheduleId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Delete Schedule
router.delete('/schedules/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    const doctor = await getDoctorByUserId(user.id);
    const { id } = req.params;

    await pool.execute('DELETE FROM doctor_schedules WHERE id = ? AND doctor_id = ?', [id, doctor.id]);
    res.json({ message: 'Schedule removed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Doctor Appointments Dashboard (Today's Appointments & All Appointments)
router.get('/appointments', async (req, res) => {
  try {
    const user = (req as any).user;
    const doctor = await getDoctorByUserId(user.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const dateFilter = req.query.date as string; // 'today' or YYYY-MM-DD or 'all'
    const statusFilter = req.query.status as string;

    let query = `
      SELECT a.*, c.name as chamber_name, c.address as chamber_address, c.area as chamber_area
      FROM appointments a
      JOIN chambers c ON a.chamber_id = c.id
      WHERE a.doctor_id = ?
    `;
    const params: any[] = [doctor.id];

    if (dateFilter === 'today') {
      query += ` AND a.schedule_date = CURDATE()`;
    } else if (dateFilter && dateFilter !== 'all') {
      query += ` AND a.schedule_date = ?`;
      params.push(dateFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      query += ` AND a.status = ?`;
      params.push(statusFilter);
    }

    query += ` ORDER BY a.schedule_date ASC, a.serial_number ASC`;

    const [appointments] = await pool.query<RowDataPacket[]>(query, params);

    // Also get today's quick summary
    const [todayRows] = await pool.query<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total_today,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN status = 'in_consultation' THEN 1 ELSE 0 END) as in_consultation,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM appointments
      WHERE doctor_id = ? AND schedule_date = CURDATE()`,
      [doctor.id]
    );

    const todaySummary = todayRows[0] || {
      total_today: 0,
      confirmed: 0,
      waiting: 0,
      in_consultation: 0,
      completed: 0,
      cancelled: 0,
    };

    res.json({ appointments, todaySummary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Update Appointment Status (Doctor updates patient appointment status)
router.patch('/appointments/:id/status', async (req, res) => {
  try {
    const user = (req as any).user;
    const doctor = await getDoctorByUserId(user.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['confirmed', 'waiting', 'in_consultation', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const [apptRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, appointment_id, serial_number, patient_name FROM appointments WHERE id = ? AND doctor_id = ?',
      [id, doctor.id]
    );
    const appt = apptRows[0] as any;
    if (!appt) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    await pool.execute(
      `UPDATE appointments
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, id]
    );

    await logActivity(user.id, 'UPDATE_APPOINTMENT_STATUS', `Status updated to ${status} for ${appt.appointment_id} (Serial ${appt.serial_number})`);

    res.json({ message: `Appointment status updated to ${status}`, appointmentId: appt.appointment_id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
