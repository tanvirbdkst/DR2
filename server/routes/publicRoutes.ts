import { Router } from 'express';
import pool from '../db.js';
import { RowDataPacket } from 'mysql2/promise';

const router = Router();

// 1. Get Public Specialties
router.get('/specialties', async (req, res) => {
  try {
    const [specialties] = await pool.query<RowDataPacket[]>(`
      SELECT s.*, (
        SELECT COUNT(*)
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        WHERE d.specialty_id = s.id AND d.approval_status = 'approved' AND u.status = 'active'
      ) as active_doctors
      FROM specialties s
      WHERE s.status = 'active'
      ORDER BY s.name ASC
    `);

    res.json({ specialties });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Search Public Doctors (ONLY APPROVED DOCTORS WITH ACTIVE USER ACCOUNTS ARE RETURNED)
router.get('/doctors', async (req, res) => {
  try {
    const { search, specialty, location } = req.query as { search?: string; specialty?: string; location?: string };

    let query = `
      SELECT d.id, d.title, d.bmdc_number, d.qualification, d.experience_years, d.bio, d.consultation_fee,
             u.name, u.email, u.phone, u.avatar_url,
             s.id as specialty_id, s.name as specialty_name, s.name_bn as specialty_name_bn,
             GROUP_CONCAT(DISTINCT CONCAT(c.name, ' (', c.area, ', ', c.city, ')')) as chambers_summary,
             GROUP_CONCAT(DISTINCT c.city) as cities,
             GROUP_CONCAT(DISTINCT ds.day_of_week) as available_days
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      LEFT JOIN chambers c ON c.doctor_id = d.id
      LEFT JOIN doctor_schedules ds ON ds.doctor_id = d.id AND ds.is_active = 1
      WHERE d.approval_status = 'approved' AND u.status = 'active'
    `;
    const params: any[] = [];

    if (search && search.trim() !== '') {
      query += ` AND (u.name LIKE ? OR d.qualification LIKE ? OR d.bio LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (specialty && specialty !== 'all') {
      query += ` AND (s.slug = ? OR s.id = ?)`;
      params.push(specialty, Number(specialty) || 0);
    }

    if (location && location.trim() !== '') {
      query += ` AND (c.city LIKE ? OR c.area LIKE ? OR c.address LIKE ?)`;
      const locTerm = `%${location.trim()}%`;
      params.push(locTerm, locTerm, locTerm);
    }

    query += `
      GROUP BY d.id, u.id, s.id
      ORDER BY d.experience_years DESC, d.created_at DESC
    `;

    const [doctors] = await pool.query<RowDataPacket[]>(query, params);

    // Format fields for frontend cards
    const formatted = doctors.map((doc: any) => ({
      ...doc,
      chambers_list: doc.chambers_summary ? doc.chambers_summary.split(',') : [],
      available_days_list: doc.available_days ? doc.available_days.split(',') : [],
    }));

    res.json({ doctors: formatted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get Single Public Doctor Profile
router.get('/doctors/:id', async (req, res) => {
  try {
    const doctorId = req.params.id;

    const [docRows] = await pool.query<RowDataPacket[]>(`
      SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
             s.name as specialty_name, s.name_bn as specialty_name_bn, s.icon as specialty_icon
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      WHERE d.id = ? AND d.approval_status = 'approved' AND u.status = 'active'
    `, [doctorId]);

    const doctor = docRows[0] as any;
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found or not currently available.' });
    }

    const [chambers] = await pool.query<RowDataPacket[]>(`
      SELECT c.*, COALESCE(dc.consultation_fee, d.consultation_fee) as consultation_fee, dc.follow_up_fee
      FROM chambers c
      JOIN doctors d ON c.doctor_id = d.id
      LEFT JOIN doctor_chambers dc ON c.id = dc.chamber_id AND dc.doctor_id = c.doctor_id
      WHERE c.doctor_id = ?
      ORDER BY c.created_at ASC
    `, [doctorId]);

    const [schedules] = await pool.query<RowDataPacket[]>(`
      SELECT s.*, c.name as chamber_name, c.area as chamber_area
      FROM doctor_schedules s
      JOIN chambers c ON s.chamber_id = c.id
      WHERE s.doctor_id = ? AND s.is_active = 1
      ORDER BY s.day_of_week ASC, s.start_time ASC
    `, [doctorId]);

    res.json({ doctor, chambers, schedules });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get Available Serials for a Doctor + Chamber + Date
router.get('/availability', async (req, res) => {
  try {
    const { doctorId, chamberId, date } = req.query as { doctorId?: string; chamberId?: string; date?: string };

    if (!doctorId || !chamberId || !date) {
      return res.status(400).json({ error: 'Doctor ID, chamber ID, and date are required.' });
    }

    // Determine Day of Week for selected date
    const dateObj = new Date(date + 'T00:00:00');
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[dateObj.getDay()];

    // Find schedule for this doctor, chamber, and day of week
    const [scheduleRows] = await pool.query<RowDataPacket[]>(`
      SELECT s.*, c.name as chamber_name, c.address as chamber_address,
             COALESCE(dc.consultation_fee, d.consultation_fee) as fee
      FROM doctor_schedules s
      JOIN chambers c ON s.chamber_id = c.id
      JOIN doctors d ON s.doctor_id = d.id
      LEFT JOIN doctor_chambers dc ON s.chamber_id = dc.chamber_id AND s.doctor_id = dc.doctor_id
      WHERE s.doctor_id = ? AND s.chamber_id = ? AND s.day_of_week = ? AND s.is_active = 1
    `, [doctorId, chamberId, dayOfWeek]);

    const schedule = scheduleRows[0] as any;

    if (!schedule) {
      return res.json({
        available: false,
        dayOfWeek,
        message: `Doctor does not have consultation hours scheduled at this chamber on ${dayOfWeek}s.`,
        serials: [],
      });
    }

    // Fetch existing booked appointments for (doctor, chamber, date)
    const [bookedAppointments] = await pool.query<RowDataPacket[]>(`
      SELECT serial_number, status, appointment_time
      FROM appointments
      WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND status != 'cancelled'
    `, [doctorId, chamberId, date]);

    const bookedSerialNumbers = new Set(bookedAppointments.map((a: any) => a.serial_number));

    // Calculate serial slot times and statuses automatically
    const maxSerials = schedule.max_serials || 20;
    const slotDuration = schedule.slot_duration_minutes || 10;
    const [startHour, startMinute] = String(schedule.start_time).split(':').map(Number);

    const serials = [];
    for (let i = 1; i <= maxSerials; i++) {
      const serialNum = i;
      const serialStr = serialNum < 10 ? `0${serialNum}` : `${serialNum}`;

      // Calculate estimated time for this serial slot
      const totalMinutes = (startHour * 60 + startMinute) + (i - 1) * slotDuration;
      const slotHour24 = Math.floor(totalMinutes / 60) % 24;
      const slotMin = totalMinutes % 60;
      const ampm = slotHour24 >= 12 ? 'PM' : 'AM';
      const slotHour12 = slotHour24 % 12 || 12;
      const formattedTime = `${slotHour12}:${slotMin < 10 ? '0' : ''}${slotMin} ${ampm}`;

      const isBooked = bookedSerialNumbers.has(serialNum);

      serials.push({
        serial_number: serialNum,
        serial_formatted: serialStr,
        estimated_time: formattedTime,
        status: isBooked ? 'booked' : 'available',
      });
    }

    const availableCount = serials.filter((s) => s.status === 'available').length;

    res.json({
      available: true,
      dayOfWeek,
      schedule: {
        id: schedule.id,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        maxSerials: schedule.max_serials,
        slotDurationMinutes: schedule.slot_duration_minutes,
        fee: schedule.fee,
        chamberName: schedule.chamber_name,
        chamberAddress: schedule.chamber_address,
      },
      availableCount,
      totalCount: maxSerials,
      serials,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
