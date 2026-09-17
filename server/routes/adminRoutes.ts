import { Router } from 'express';
import pool, { logActivity } from '../db.js';
import { requireRole } from '../auth.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const router = Router();

// Protect all admin routes
router.use(requireRole(['admin']));

// 1. Dashboard Stats
router.get('/stats', async (req, res) => {
  try {
    const [totalDocs] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM doctors');
    const [pendingDocs] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM doctors WHERE approval_status = 'pending'");
    const [approvedDocs] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM doctors WHERE approval_status = 'approved'");
    const [totalPats] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM users WHERE role = 'patient'");
    const [totalAppts] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM appointments');
    const [todayAppts] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM appointments WHERE schedule_date = CURDATE()');

    const [recentLogs] = await pool.query<RowDataPacket[]>(`
      SELECT l.*, u.name as user_name, u.email as user_email
      FROM activity_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 8
    `);

    const statPayload = {
      totalDoctors: Number(totalDocs[0]?.count) || 0,
      pendingDoctors: Number(pendingDocs[0]?.count) || 0,
      approvedDoctors: Number(approvedDocs[0]?.count) || 0,
      totalPatients: Number(totalPats[0]?.count) || 0,
      totalAppointments: Number(totalAppts[0]?.count) || 0,
      todayAppointments: Number(todayAppts[0]?.count) || 0,
    };

    res.json({
      ...statPayload,
      stats: statPayload,
      recentLogs,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Doctor List (with optional status filter)
router.get('/doctors', async (req, res) => {
  try {
    const status = req.query.status as string;
    let query = `
      SELECT d.*, u.name, u.email, u.phone, u.avatar_url, u.status as user_status,
             s.name as specialty_name, s.name_bn as specialty_name_bn,
             (SELECT COUNT(*) FROM chambers c WHERE c.doctor_id = d.id) as chamber_count,
             (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.id) as appointment_count
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      query += ` WHERE d.approval_status = ?`;
      params.push(status);
    }

    query += ` ORDER BY d.created_at DESC`;

    const [doctors] = await pool.query<RowDataPacket[]>(query, params);
    res.json({ doctors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2b. Pending Doctors List
router.get('/doctors/pending', async (req, res) => {
  try {
    const query = `
      SELECT d.*, u.name, u.email, u.phone, u.avatar_url, u.status as user_status,
             s.name as specialty_name, s.name_bn as specialty_name_bn,
             (SELECT COUNT(*) FROM chambers c WHERE c.doctor_id = d.id) as chamber_count
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      WHERE d.approval_status = 'pending'
      ORDER BY d.created_at DESC
    `;
    const [doctors] = await pool.query<RowDataPacket[]>(query);
    res.json({ pendingDoctors: doctors, doctors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Doctor Details
router.get('/doctors/:id', async (req, res) => {
  try {
    const doctorId = req.params.id;
    const [docRows] = await pool.query<RowDataPacket[]>(`
      SELECT d.*, u.name, u.email, u.phone, u.avatar_url, u.status as user_status,
             s.name as specialty_name, s.name_bn as specialty_name_bn
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      WHERE d.id = ?
    `, [doctorId]);

    const doctor = docRows[0] as any;
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const [chambers] = await pool.query<RowDataPacket[]>(`
      SELECT c.*, dc.consultation_fee, dc.follow_up_fee
      FROM chambers c
      LEFT JOIN doctor_chambers dc ON c.id = dc.chamber_id AND dc.doctor_id = c.doctor_id
      WHERE c.doctor_id = ?
    `, [doctorId]);

    const [schedules] = await pool.query<RowDataPacket[]>(`
      SELECT s.*, c.name as chamber_name
      FROM doctor_schedules s
      JOIN chambers c ON s.chamber_id = c.id
      WHERE s.doctor_id = ?
    `, [doctorId]);

    res.json({ doctor, chambers, schedules });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Approve Doctor
router.post('/doctors/:id/approve', async (req, res) => {
  try {
    const doctorId = req.params.id;
    const adminUser = (req as any).user;

    const [docRows] = await pool.query<RowDataPacket[]>('SELECT user_id, bmdc_number FROM doctors WHERE id = ?', [doctorId]);
    const doctor = docRows[0] as any;
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(`
        UPDATE doctors
        SET approval_status = 'approved', rejection_reason = NULL, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [doctorId]);

      await conn.execute(`
        UPDATE users
        SET status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [doctor.user_id]);

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    await logActivity(adminUser.id, 'APPROVE_DOCTOR', `Approved doctor ID ${doctorId} (BMDC: ${doctor.bmdc_number})`);

    res.json({ message: 'Doctor approved successfully. The doctor profile is now publicly searchable.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Reject Doctor
router.post('/doctors/:id/reject', async (req, res) => {
  try {
    const doctorId = req.params.id;
    const { reason } = req.body;
    const adminUser = (req as any).user;

    const [docRows] = await pool.query<RowDataPacket[]>('SELECT user_id, bmdc_number FROM doctors WHERE id = ?', [doctorId]);
    const doctor = docRows[0] as any;
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(`
        UPDATE doctors
        SET approval_status = 'rejected', rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [reason || 'Application rejected by administration', doctorId]);

      await conn.execute(`
        UPDATE users
        SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [doctor.user_id]);

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    await logActivity(adminUser.id, 'REJECT_DOCTOR', `Rejected doctor ID ${doctorId}. Reason: ${reason || 'Not specified'}`);

    res.json({ message: 'Doctor application rejected.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Suspend Doctor
router.post('/doctors/:id/suspend', async (req, res) => {
  try {
    const doctorId = req.params.id;
    const adminUser = (req as any).user;

    const [docRows] = await pool.query<RowDataPacket[]>('SELECT user_id FROM doctors WHERE id = ?', [doctorId]);
    const doctor = docRows[0] as any;
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(`
        UPDATE doctors
        SET approval_status = 'suspended', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [doctorId]);

      await conn.execute(`
        UPDATE users
        SET status = 'suspended', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [doctor.user_id]);

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    await logActivity(adminUser.id, 'SUSPEND_DOCTOR', `Suspended doctor ID ${doctorId}`);

    res.json({ message: 'Doctor suspended. Doctor is hidden from public listings.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6b. Generic Status Update (PATCH /doctors/:id/status)
router.patch('/doctors/:id/status', async (req, res) => {
  try {
    const doctorId = req.params.id;
    const { status, reason } = req.body;
    const adminUser = (req as any).user;

    if (!['approved', 'pending', 'rejected', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid doctor status.' });
    }

    const [docRows] = await pool.query<RowDataPacket[]>('SELECT user_id, bmdc_number FROM doctors WHERE id = ?', [doctorId]);
    const doctor = docRows[0] as any;
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const userStatus = status === 'approved' ? 'active' : (status === 'suspended' ? 'suspended' : 'pending');

      await conn.execute(`
        UPDATE doctors
        SET approval_status = ?, rejection_reason = ?, approved_at = CASE WHEN ? = 'approved' THEN CURRENT_TIMESTAMP ELSE approved_at END, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [status, reason || null, status, doctorId]);

      await conn.execute(`
        UPDATE users
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [userStatus, doctor.user_id]);

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    await logActivity(adminUser.id, 'UPDATE_DOCTOR_STATUS', `Updated doctor ID ${doctorId} status to ${status}`);

    res.json({ message: `Doctor status updated to ${status} successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Patient List
router.get('/patients', async (req, res) => {
  try {
    const [patients] = await pool.query<RowDataPacket[]>(`
      SELECT u.id as user_id, u.name, u.email, u.phone, u.created_at,
             p.blood_group, p.date_of_birth, p.gender, p.address,
             (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = u.id) as total_appointments
      FROM users u
      LEFT JOIN patients p ON u.id = p.user_id
      WHERE u.role = 'patient'
      ORDER BY u.created_at DESC
    `);

    res.json({ patients });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Specialist Management
router.get('/specialties', async (req, res) => {
  try {
    const [specialties] = await pool.query<RowDataPacket[]>(`
      SELECT s.*, (SELECT COUNT(*) FROM doctors d WHERE d.specialty_id = s.id) as doctor_count
      FROM specialties s
      ORDER BY s.name ASC
    `);

    res.json({ specialties });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/specialties', async (req, res) => {
  try {
    const { name, name_bn, icon, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Specialty name is required.' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const adminUser = (req as any).user;

    const [resDb] = await pool.execute<ResultSetHeader>(`
      INSERT INTO specialties (name, name_bn, slug, icon, description, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `, [name, name_bn || null, slug, icon || 'Stethoscope', description || null]);

    await logActivity(adminUser.id, 'CREATE_SPECIALTY', `Added specialty: ${name}`);

    res.status(201).json({ message: 'Specialty created successfully', id: resDb.insertId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/specialties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_bn, icon, description, status } = req.body;

    await pool.execute(`
      UPDATE specialties
      SET name = ?, name_bn = ?, icon = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, name_bn || null, icon || 'Stethoscope', description || null, status || 'active', id]);

    res.json({ message: 'Specialty updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/specialties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM specialties WHERE id = ?', [id]);
    res.json({ message: 'Specialty deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. All Appointments (Serials) Management
router.get('/appointments', async (req, res) => {
  try {
    const [appointments] = await pool.query<RowDataPacket[]>(`
      SELECT a.*, 
             u_doc.name as doctor_name, u_doc.phone as doctor_phone,
             u_pat.name as patient_user_name, u_pat.phone as patient_user_phone,
             c.name as chamber_name, c.address as chamber_address,
             s.name as specialty_name
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u_doc ON d.user_id = u_doc.id
      LEFT JOIN users u_pat ON a.patient_id = u_pat.id
      JOIN chambers c ON a.chamber_id = c.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      ORDER BY a.schedule_date DESC, a.serial_number ASC
      LIMIT 100
    `);

    res.json({ appointments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
