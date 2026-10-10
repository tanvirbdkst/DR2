import { Router } from 'express';
import pool from '../db.js';
import { RowDataPacket } from 'mysql2/promise';
import { BANGLADESH_DISTRICTS, getDistrictSearchTerms, ensureDistrictsTableInDb } from '../districts.js';

const router = Router();

export function generateDoctorSlug(title: string = 'Dr.', name: string = '', id: number): string {
  const cleanTitle = (title || 'Dr').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const cleanName = (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${cleanTitle}-${cleanName}-${id}`.replace(/--+/g, '-');
}

// 1. Get Public Specialties
router.get('/specialties', async (req, res) => {
  try {
    const [specialties] = await pool.query<RowDataPacket[]>(`
      SELECT s.*, (
        SELECT COUNT(DISTINCT d.id)
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN doctor_specialties ds ON ds.doctor_id = d.id
        WHERE (d.specialty_id = s.id OR ds.specialty_id = s.id)
          AND d.approval_status = 'approved' AND u.status = 'active'
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

// 1.1 Get Bangladesh Districts (Returns active districts configured by Admin)
router.get('/districts', async (req, res) => {
  try {
    await ensureDistrictsTableInDb(pool);
    const { all } = req.query;
    const query = all === '1'
      ? 'SELECT * FROM districts ORDER BY division ASC, sort_order ASC'
      : 'SELECT * FROM districts WHERE is_active = 1 ORDER BY division ASC, sort_order ASC';
    const [rows] = await pool.query<RowDataPacket[]>(query);
    res.json({ districts: rows || [] });
  } catch (err: any) {
    console.error('Error in GET /api/public/districts:', err.message);
    try {
      await ensureDistrictsTableInDb(pool);
      const { all } = req.query;
      const query = all === '1'
        ? 'SELECT * FROM districts ORDER BY division ASC, sort_order ASC'
        : 'SELECT * FROM districts WHERE is_active = 1 ORDER BY division ASC, sort_order ASC';
      const [rows] = await pool.query<RowDataPacket[]>(query);
      return res.json({ districts: rows || [] });
    } catch (retryErr: any) {
      console.error('Retry failed in GET /api/public/districts:', retryErr.message);
      res.status(500).json({ error: retryErr.message, districts: [] });
    }
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
      query += ` AND (
        u.name LIKE ? OR d.qualification LIKE ? OR d.bio LIKE ?
        OR s.name LIKE ? OR s.name_bn LIKE ?
        OR EXISTS (
          SELECT 1 FROM doctor_specialties ds_s
          JOIN specialties s_sub ON ds_s.specialty_id = s_sub.id
          WHERE ds_s.doctor_id = d.id AND (s_sub.name LIKE ? OR s_sub.name_bn LIKE ?)
        )
      )`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term, term, term);
    }

    if (specialty && specialty !== 'all') {
      query += ` AND (
        s.slug = ? OR s.id = ? OR s.name = ? OR s.name_bn = ?
        OR EXISTS (
          SELECT 1 FROM doctor_specialties ds_filter
          JOIN specialties s_filter ON ds_filter.specialty_id = s_filter.id
          WHERE ds_filter.doctor_id = d.id AND (s_filter.slug = ? OR s_filter.id = ? OR s_filter.name = ? OR s_filter.name_bn = ?)
        )
      )`;
      const sId = Number(specialty) || 0;
      params.push(specialty, sId, specialty, specialty, specialty, sId, specialty, specialty);
    }

    if (location && location.trim() !== '') {
      const terms = getDistrictSearchTerms(location.trim());
      const conditions = terms.map(() => `(c.city LIKE ? OR c.area LIKE ? OR c.address LIKE ?)`).join(' OR ');
      query += ` AND (${conditions})`;
      for (const term of terms) {
        const locTerm = `%${term}%`;
        params.push(locTerm, locTerm, locTerm);
      }
    }

    query += `
      GROUP BY d.id, u.id, s.id
      ORDER BY d.experience_years DESC, d.created_at DESC
    `;

    const [doctors] = await pool.query<RowDataPacket[]>(query, params);

    // Fetch all specialties for the returned doctors batch
    if (doctors.length > 0) {
      const docIds = doctors.map((d: any) => d.id);
      const placeholders = docIds.map(() => '?').join(',');
      const [specRows] = await pool.query<RowDataPacket[]>(
        `SELECT ds.doctor_id, s.id, s.name, s.name_bn, s.slug, s.icon, ds.is_primary
         FROM doctor_specialties ds
         JOIN specialties s ON ds.specialty_id = s.id
         WHERE ds.doctor_id IN (${placeholders})
         ORDER BY ds.is_primary DESC, s.name ASC`,
        docIds
      );

      const specsByDocId = new Map<number, any[]>();
      for (const row of specRows as any[]) {
        if (!specsByDocId.has(row.doctor_id)) specsByDocId.set(row.doctor_id, []);
        specsByDocId.get(row.doctor_id)!.push({
          id: row.id,
          name: row.name,
          name_bn: row.name_bn,
          slug: row.slug,
          icon: row.icon,
          is_primary: row.is_primary,
        });
      }

      doctors.forEach((doc: any) => {
        const docSpecs = specsByDocId.get(doc.id) || [];
        if (docSpecs.length > 0) {
          doc.specialties = docSpecs;
          doc.specialty_names = docSpecs.map((s) => s.name).join(' + ');
          doc.specialty_names_bn = docSpecs.map((s) => s.name_bn || s.name).join(' + ');
        } else if (doc.specialty_name) {
          doc.specialties = [{
            id: doc.specialty_id,
            name: doc.specialty_name,
            name_bn: doc.specialty_name_bn,
            is_primary: 1,
          }];
          doc.specialty_names = doc.specialty_name;
          doc.specialty_names_bn = doc.specialty_name_bn || doc.specialty_name;
        } else {
          doc.specialties = [];
          doc.specialty_names = '';
          doc.specialty_names_bn = '';
        }
      });
    }

    // Format fields for frontend cards
    const formatted = doctors.map((doc: any) => ({
      ...doc,
      slug: generateDoctorSlug(doc.title, doc.name, doc.id),
      chambers_list: doc.chambers_summary ? doc.chambers_summary.split(',') : [],
      available_days_list: doc.available_days ? doc.available_days.split(',') : [],
    }));

    res.json({ doctors: formatted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get Single Public Doctor Profile (Supports ID: 1 or slug: dr-tanvir-ahmad-1)
router.get('/doctors/:id', async (req, res) => {
  try {
    const cleanParam = decodeURIComponent(String(req.params.id || '').trim())
      .split('?')[0]
      .split('#')[0];
    let docRows: RowDataPacket[] = [];

    // Case A: Parameter is numeric doctor ID (e.g. 3)
    const numericId = Number(cleanParam);
    if (!isNaN(numericId) && numericId > 0) {
      [docRows] = await pool.query<RowDataPacket[]>(`
        SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
               s.name as specialty_name, s.name_bn as specialty_name_bn, s.icon as specialty_icon
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN specialties s ON d.specialty_id = s.id
        WHERE d.id = ? AND u.status != 'deleted'
        ORDER BY (d.approval_status = 'approved') DESC, (u.status = 'active') DESC
        LIMIT 1
      `, [numericId]);
    }

    // Case B: Slug ends with -<number> (e.g. dr-dr-test-rahman-3292-3 -> 3, dr-tanvir-ahmad-1 -> 1)
    if (docRows.length === 0) {
      const match = cleanParam.match(/-(\d+)$/);
      if (match) {
        const extractedId = Number(match[1]);
        if (!isNaN(extractedId) && extractedId > 0) {
          [docRows] = await pool.query<RowDataPacket[]>(`
            SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
                   s.name as specialty_name, s.name_bn as specialty_name_bn, s.icon as specialty_icon
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            LEFT JOIN specialties s ON d.specialty_id = s.id
            WHERE d.id = ? AND u.status != 'deleted'
            ORDER BY (d.approval_status = 'approved') DESC, (u.status = 'active') DESC
            LIMIT 1
          `, [extractedId]);
        }
      }
    }

    // Case C: Match by any other numbers in slug (e.g. BMDC number "3292" or ID)
    if (docRows.length === 0) {
      const allNumbers = cleanParam.match(/\d+/g);
      if (allNumbers && allNumbers.length > 0) {
        for (const numStr of allNumbers) {
          const num = Number(numStr);
          [docRows] = await pool.query<RowDataPacket[]>(`
            SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
                   s.name as specialty_name, s.name_bn as specialty_name_bn, s.icon as specialty_icon
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            LEFT JOIN specialties s ON d.specialty_id = s.id
            WHERE (d.bmdc_number = ? OR d.bmdc_number LIKE ? OR d.id = ?) AND u.status != 'deleted'
            ORDER BY (d.approval_status = 'approved') DESC, (u.status = 'active') DESC
            LIMIT 1
          `, [numStr, `%${numStr}%`, num]);

          if (docRows.length > 0) break;
        }
      }
    }

    // Case D: Fallback match doctor by clean name part from slug
    if (docRows.length === 0) {
      const nameGuess = cleanParam
        .replace(/^(?:prof-|asst-prof-|assoc-prof-|dr-)+/i, '')
        .replace(/-\d+/g, '')
        .replace(/-/g, ' ')
        .trim();

      if (nameGuess.length >= 2) {
        [docRows] = await pool.query<RowDataPacket[]>(`
          SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
                 s.name as specialty_name, s.name_bn as specialty_name_bn, s.icon as specialty_icon
          FROM doctors d
          JOIN users u ON d.user_id = u.id
          LEFT JOIN specialties s ON d.specialty_id = s.id
          WHERE LOWER(u.name) LIKE LOWER(?) AND u.status != 'deleted'
          ORDER BY (d.approval_status = 'approved') DESC, (u.status = 'active') DESC
          LIMIT 1
        `, [`%${nameGuess}%`]);
      }
    }

    const doctor = docRows[0] as any;
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found or not currently available.' });
    }

    const doctorId = doctor.id;
    doctor.slug = generateDoctorSlug(doctor.title, doctor.name, doctor.id);

    // Fetch all doctor specialties
    const [specRows] = await pool.query<RowDataPacket[]>(
      `SELECT s.id, s.name, s.name_bn, s.slug, s.icon, ds.is_primary
       FROM doctor_specialties ds
       JOIN specialties s ON ds.specialty_id = s.id
       WHERE ds.doctor_id = ?
       ORDER BY ds.is_primary DESC, s.name ASC`,
      [doctorId]
    );

    if (specRows.length > 0) {
      doctor.specialties = specRows;
      doctor.specialty_names = specRows.map((s: any) => s.name).join(' + ');
      doctor.specialty_names_bn = specRows.map((s: any) => s.name_bn || s.name).join(' + ');
    } else if (doctor.specialty_name) {
      doctor.specialties = [{
        id: doctor.specialty_id,
        name: doctor.specialty_name,
        name_bn: doctor.specialty_name_bn,
        icon: doctor.specialty_icon,
        is_primary: 1
      }];
      doctor.specialty_names = doctor.specialty_name;
      doctor.specialty_names_bn = doctor.specialty_name_bn || doctor.specialty_name;
    } else {
      doctor.specialties = [];
      doctor.specialty_names = '';
      doctor.specialty_names_bn = '';
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
      SELECT serial_number, status, appointment_time, booking_source, payment_status
      FROM appointments
      WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND status != 'cancelled'
    `, [doctorId, chamberId, date]);

    const bookedBySerial = new Map<number, any>();
    bookedAppointments.forEach((a: any) => bookedBySerial.set(Number(a.serial_number), a));

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

      const appt = bookedBySerial.get(serialNum);
      const isBooked = !!appt;

      serials.push({
        serial_number: serialNum,
        serial_formatted: serialStr,
        estimated_time: formattedTime,
        status: isBooked ? 'booked' : 'available',
        booking_source: isBooked ? appt.booking_source || 'online' : undefined,
        payment_status: isBooked ? appt.payment_status : undefined,
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

// 6. Get Public Site Settings (Emergency & Helpline, Privacy Policy, Terms & Conditions)
router.get('/site-settings', async (req, res) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT setting_key, setting_value FROM settings');
    const settingsMap: Record<string, string> = {};
    for (const r of rows as any[]) {
      settingsMap[r.setting_key] = r.setting_value;
    }

    let emergency = null;
    if (settingsMap.emergency_helpline_config) {
      try {
        emergency = JSON.parse(settingsMap.emergency_helpline_config);
      } catch {
        // fallback
      }
    }

    if (!emergency) {
      emergency = {
        hotline_number: settingsMap.hotline_phone || '09612-DAKTAR (09612-325827)',
        national_emergency: '999',
        ambulance_number: '199 / 01700-112233',
        doctor_helpline: '16263',
        blood_bank_helpline: '+880 1819-223344',
        operating_hours: '8:00 AM – 10:00 PM (Daily)',
        operating_hours_bn: 'সকাল ৮:০০ – রাত ১০:০০ (প্রতিদিন)',
        address: settingsMap.address || 'Dhanmondi, Dhaka-1205, Bangladesh',
        address_bn: 'ধানমন্ডি, ঢাকা-১২০৫, বাংলাদেশ',
        emergency_note: settingsMap.emergency_notice || 'জরুরি ও সংকটজনক পরিস্থিতিতে অবিলম্বে নিকটস্থ জরুরি বিভাগে যোগাযোগ করুন।',
        emergency_note_en: 'In life-threatening situations, dial 999 or visit the nearest emergency room immediately.',
        quick_contacts: [
          { id: '1', title: 'National Emergency Service (Police, Fire, Ambulance)', title_bn: 'জাতীয় জরুরি সেবা (পুলিশ, অ্যাম্বুলেন্স, ফায়ার)', number: '999', category: 'national' },
          { id: '2', title: 'Government Health Hotline (Shastho Batayan)', title_bn: 'সরকারি স্বাস্থ্য বাতায়ন হেল্পলাইন', number: '16263', category: 'health' },
          { id: '3', title: 'Daktar Serial Chamber Support', title_bn: 'ডাক্তার সিরিয়াল চেম্বার সাপোর্ট', number: '09612-325827', category: 'support' },
          { id: '4', title: 'Dhaka Medical College Emergency', title_bn: 'ঢাকা মেডিকেল জরুরি বিভাগ', number: '+880 2-55165088', category: 'hospital' },
          { id: '5', title: 'Central Red Crescent Blood Bank', title_bn: 'রেড ক্রিসেন্ট কেন্দ্রীয় ব্লাড ব্যাংক', number: '+880 2-9352226', category: 'blood' },
          { id: '6', title: '24/7 Ambulance Fleet Hotline', title_bn: '২৪/৭ সার্বক্ষণিক অ্যাম্বুলেন্স সার্ভিস', number: '+880 1711-000999', category: 'ambulance' }
        ]
      };
    }

    res.json({
      site_title: settingsMap.site_title || 'Doctor Serial',
      site_title_bn: settingsMap.site_title_bn || 'ডাক্তার সিরিয়াল',
      hotline_phone: emergency.hotline_number || settingsMap.hotline_phone || '09612-DAKTAR (09612-325827)',
      support_email: settingsMap.support_email || 'support@daktarserial.com',
      address: settingsMap.address || emergency.address || 'Dhanmondi, Dhaka-1205, Bangladesh',
      emergency,
      privacy_policy: settingsMap.privacy_policy || '',
      terms_conditions: settingsMap.terms_conditions || '',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
