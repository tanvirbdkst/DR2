import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool, { logActivity } from '../db.js';
import { requireRole } from '../auth.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { ensureDistrictsTableInDb, BANGLADESH_DISTRICTS } from '../districts.js';

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
    const [totalCompounders] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM compounders');

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
      totalCompounders: Number(totalCompounders[0]?.count) || 0,
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

// Helper to attach multiple specialties to a list of doctors
async function attachSpecialtiesToDoctorList(doctors: any[]) {
  if (!doctors || doctors.length === 0) return doctors;
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
      doc.specialty_ids = docSpecs.map((s) => s.id);
      doc.specialty_names = docSpecs.map((s) => s.name).join(' + ');
      doc.specialty_names_bn = docSpecs.map((s) => s.name_bn || s.name).join(' + ');
      doc.specialties_summary = doc.specialty_names;
    } else if (doc.specialty_name) {
      doc.specialties = [{
        id: doc.specialty_id,
        name: doc.specialty_name,
        name_bn: doc.specialty_name_bn,
        is_primary: 1,
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
  });
  return doctors;
}

// Helper to attach multiple specialties to a single doctor
async function attachSpecialtiesToDoctor(doctor: any) {
  if (!doctor) return null;
  const [specRows] = await pool.query<RowDataPacket[]>(
    `SELECT s.id, s.name, s.name_bn, s.slug, s.icon, ds.is_primary
     FROM doctor_specialties ds
     JOIN specialties s ON ds.specialty_id = s.id
     WHERE ds.doctor_id = ?
     ORDER BY ds.is_primary DESC, s.name ASC`,
    [doctor.id]
  );
  if (specRows.length > 0) {
    doctor.specialties = specRows;
    doctor.specialty_ids = specRows.map((s: any) => s.id);
    doctor.specialty_names = specRows.map((s: any) => s.name).join(' + ');
    doctor.specialty_names_bn = specRows.map((s: any) => s.name_bn || s.name).join(' + ');
    doctor.specialties_summary = doctor.specialty_names;
  } else if (doctor.specialty_name) {
    doctor.specialties = [{
      id: doctor.specialty_id,
      name: doctor.specialty_name,
      name_bn: doctor.specialty_name_bn,
      is_primary: 1,
    }];
    doctor.specialty_ids = [doctor.specialty_id];
    doctor.specialty_names = doctor.specialty_name;
    doctor.specialty_names_bn = doctor.specialty_name_bn || doctor.specialty_name;
    doctor.specialties_summary = doctor.specialty_name;
  } else {
    doctor.specialties = [];
    doctor.specialty_ids = [];
    doctor.specialty_names = '';
    doctor.specialty_names_bn = '';
    doctor.specialties_summary = '';
  }
  return doctor;
}

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
    await attachSpecialtiesToDoctorList(doctors);
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
    await attachSpecialtiesToDoctorList(doctors);
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

    let doctor = docRows[0] as any;
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    doctor = await attachSpecialtiesToDoctor(doctor);

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

// =============================================================
// 10. Compounder / Chamber Staff Management (Super Admin only)
// =============================================================

// 10.1 List all compounders
router.get('/compounders', async (req, res) => {
  try {
    const [compounders] = await pool.query<RowDataPacket[]>(`
      SELECT c.id, c.user_id, c.doctor_id, c.created_at,
             u.name, u.email, u.phone, u.status, u.last_login_at,
             d.title as doctor_title, du.name as doctor_name,
             s.name as specialty_name,
             (SELECT COUNT(*) FROM appointments a WHERE a.created_by = u.id AND a.booking_source = 'compounder') as manual_bookings
      FROM compounders c
      JOIN users u ON c.user_id = u.id
      JOIN doctors d ON c.doctor_id = d.id
      JOIN users du ON d.user_id = du.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      ORDER BY c.created_at DESC
    `);

    res.json({ compounders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10.2 List doctors available for assignment
router.get('/compounders/available-doctors', async (req, res) => {
  try {
    const [doctors] = await pool.query<RowDataPacket[]>(`
      SELECT d.id, d.title, u.name, u.email, d.approval_status,
             s.name as specialty_name
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      ORDER BY u.name ASC
    `);
    res.json({ doctors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10.3 Get single compounder details
router.get('/compounders/:id', async (req, res) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT c.id, c.user_id, c.doctor_id, c.created_at, c.updated_at,
             u.name, u.email, u.phone, u.status, u.last_login_at,
             d.title as doctor_title, du.name as doctor_name, du.email as doctor_email
      FROM compounders c
      JOIN users u ON c.user_id = u.id
      JOIN doctors d ON c.doctor_id = d.id
      JOIN users du ON d.user_id = du.id
      WHERE c.id = ?
    `, [req.params.id]);

    const compounder = rows[0];
    if (!compounder) {
      return res.status(404).json({ error: 'Compounder not found.' });
    }
    res.json({ compounder });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Maps the UI "Active / Inactive" choice to the users.status enum.
 */
function mapCompounderStatus(status: string): 'active' | 'suspended' | 'pending' {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'active') return 'active';
  if (normalized === 'inactive' || normalized === 'suspended') return 'suspended';
  if (normalized === 'pending') return 'pending';
  throw new Error('Invalid status. Must be Active or Inactive.');
}

// 10.4 Create a compounder (no public registration — Super Admin only)
router.post('/compounders', async (req, res) => {
  try {
    const adminUser = (req as any).user;
    const { name, email, phone, password, status, doctorId } = req.body;

    if (!name || !email || !phone || !password || !doctorId) {
      return res.status(400).json({
        error: 'Full Name, Mobile Number, Email, Login Password, and Assigned Doctor are required.',
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    let userStatus: 'active' | 'suspended' | 'pending';
    try {
      userStatus = mapCompounderStatus(status || 'active');
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    // The assigned doctor must exist. A compounder belongs to exactly ONE doctor.
    const [doctorRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM doctors WHERE id = ?',
      [Number(doctorId)]
    );
    if (doctorRows.length === 0) {
      return res.status(400).json({ error: 'Selected doctor does not exist.' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const conn = await pool.getConnection();
    let compounderId: number;
    let userId: number;

    try {
      await conn.beginTransaction();

      const [userRes] = await conn.execute<ResultSetHeader>(
        `INSERT INTO users (name, email, phone, password_hash, role, status, doctor_id)
         VALUES (?, ?, ?, ?, 'compounder', ?, ?)`,
        [name, email, phone, passwordHash, userStatus, Number(doctorId)]
      );
      userId = userRes.insertId;

      const [compRes] = await conn.execute<ResultSetHeader>(
        `INSERT INTO compounders (user_id, doctor_id, created_by) VALUES (?, ?, ?)`,
        [userId, Number(doctorId), adminUser.id]
      );
      compounderId = compRes.insertId;

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    await logActivity(adminUser.id, 'CREATE_COMPOUNDER', `Created compounder ${email} assigned to doctor ID ${doctorId}`);

    res.status(201).json({
      message: 'Compounder account created successfully.',
      compounderId,
      userId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10.5 Update compounder details (name / phone / email)
router.patch('/compounders/:id', async (req, res) => {
  try {
    const adminUser = (req as any).user;
    const { id } = req.params;
    const { name, phone, email } = req.body;

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT c.user_id FROM compounders c WHERE c.id = ?',
      [id]
    );
    const compounder = rows[0] as any;
    if (!compounder) {
      return res.status(404).json({ error: 'Compounder not found.' });
    }

    if (email) {
      const [existing] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, compounder.user_id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Another account already uses this email.' });
      }
    }

    await pool.execute(
      `UPDATE users
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name ?? null, phone ?? null, email ?? null, compounder.user_id]
    );

    await logActivity(adminUser.id, 'UPDATE_COMPOUNDER', `Updated compounder ID ${id}`);

    res.json({ message: 'Compounder details updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10.6 Change assigned doctor (Super Admin only — a compounder can never do this)
router.patch('/compounders/:id/doctor', async (req, res) => {
  try {
    const adminUser = (req as any).user;
    const { id } = req.params;
    const { doctorId } = req.body;

    if (!doctorId) {
      return res.status(400).json({ error: 'A doctor must be selected.' });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT c.user_id, c.doctor_id FROM compounders c WHERE c.id = ?',
      [id]
    );
    const compounder = rows[0] as any;
    if (!compounder) {
      return res.status(404).json({ error: 'Compounder not found.' });
    }

    const [doctorRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM doctors WHERE id = ?',
      [Number(doctorId)]
    );
    if (doctorRows.length === 0) {
      return res.status(400).json({ error: 'Selected doctor does not exist.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('UPDATE compounders SET doctor_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [Number(doctorId), id]);
      await conn.execute('UPDATE users SET doctor_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [Number(doctorId), compounder.user_id]);
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    await logActivity(adminUser.id, 'CHANGE_COMPOUNDER_DOCTOR', `Reassigned compounder ID ${id} to doctor ID ${doctorId}`);

    res.json({ message: 'Assigned doctor updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10.7 Activate / Deactivate compounder
router.patch('/compounders/:id/status', async (req, res) => {
  try {
    const adminUser = (req as any).user;
    const { id } = req.params;
    const { status } = req.body;

    let userStatus: 'active' | 'suspended' | 'pending';
    try {
      userStatus = mapCompounderStatus(status);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT c.user_id FROM compounders c WHERE c.id = ?',
      [id]
    );
    const compounder = rows[0] as any;
    if (!compounder) {
      return res.status(404).json({ error: 'Compounder not found.' });
    }

    await pool.execute(
      'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userStatus, compounder.user_id]
    );

    await logActivity(adminUser.id, 'UPDATE_COMPOUNDER_STATUS', `Set compounder ID ${id} status to ${userStatus}`);

    res.json({ message: `Compounder ${userStatus === 'active' ? 'activated' : 'deactivated'} successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10.8 Reset compounder password (Super Admin only)
router.post('/compounders/:id/reset-password', async (req, res) => {
  try {
    const adminUser = (req as any).user;
    const { id } = req.params;
    let { newPassword } = req.body;

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT c.user_id, u.email FROM compounders c JOIN users u ON c.user_id = u.id WHERE c.id = ?',
      [id]
    );
    const compounder = rows[0] as any;
    if (!compounder) {
      return res.status(404).json({ error: 'Compounder not found.' });
    }

    if (!newPassword) {
      // Generate a readable temporary password.
      newPassword = `Cmp${Math.floor(100000 + Math.random() * 900000)}!`;
    } else if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, compounder.user_id]
    );

    await logActivity(adminUser.id, 'RESET_COMPOUNDER_PASSWORD', `Reset password for compounder ID ${id}`);

    res.json({ message: 'Password reset successfully.', temporaryPassword: newPassword });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10.9 Delete compounder (Super Admin only)
router.delete('/compounders/:id', async (req, res) => {
  try {
    const adminUser = (req as any).user;
    const { id } = req.params;

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT c.user_id, u.email, u.name FROM compounders c JOIN users u ON c.user_id = u.id WHERE c.id = ?',
      [id]
    );
    const compounder = rows[0] as any;
    if (!compounder) {
      return res.status(404).json({ error: 'Compounder not found.' });
    }

    // Deleting the user will cascade to compounders table
    await pool.execute('DELETE FROM users WHERE id = ?', [compounder.user_id]);

    await logActivity(adminUser.id, 'DELETE_COMPOUNDER', `Deleted compounder ${compounder.name} (${compounder.email})`);

    res.json({ message: 'Compounder account removed successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Districts Management for Search Location
// 11.1 Get all 64 districts with status
router.get('/districts', async (req, res) => {
  try {
    await ensureDistrictsTableInDb(pool);
    const [districts] = await pool.query<RowDataPacket[]>(`
      SELECT d.*,
        (SELECT COUNT(DISTINCT c.id) FROM chambers c 
         WHERE c.city LIKE CONCAT('%', d.name, '%') OR c.city LIKE CONCAT('%', d.name_bn, '%')) as chamber_count
      FROM districts d
      ORDER BY d.division ASC, d.sort_order ASC
    `);
    res.json({ districts });
  } catch (err: any) {
    console.error('Error in GET /api/admin/districts:', err.message);
    try {
      await ensureDistrictsTableInDb(pool);
      const [districts] = await pool.query<RowDataPacket[]>('SELECT * FROM districts ORDER BY division ASC, sort_order ASC');
      return res.json({ districts });
    } catch {
      res.json({ districts: BANGLADESH_DISTRICTS.map((d, i) => ({ ...d, is_active: 1, sort_order: i + 1 })) });
    }
  }
});

// 11.2 Toggle single district active status
router.post('/districts/toggle', async (req, res) => {
  try {
    await ensureDistrictsTableInDb(pool);
    const adminUser = (req as any).user;
    const { id, is_active } = req.body;
    if (!id) return res.status(400).json({ error: 'District ID is required.' });

    const newStatus = is_active ? 1 : 0;
    try {
      await pool.execute('UPDATE districts SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, id]);
    } catch (updateErr: any) {
      if (updateErr.message && (updateErr.message.includes('doesn\'t exist') || updateErr.message.includes('no such table'))) {
        await ensureDistrictsTableInDb(pool);
        await pool.execute('UPDATE districts SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, id]);
      } else {
        throw updateErr;
      }
    }

    if (adminUser?.id) {
      await logActivity(adminUser.id, 'UPDATE_DISTRICT_STATUS', `Set district ${id} is_active to ${newStatus}`);
    }

    res.json({ success: true, id, is_active: newStatus === 1 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11.3 Batch update districts (select all, deselect all, division toggle, or active list)
router.post('/districts/batch', async (req, res) => {
  try {
    const adminUser = (req as any).user;
    const { action, division, active_ids } = req.body;

    const performUpdate = async () => {
      if (action === 'select_all') {
        await pool.execute('UPDATE districts SET is_active = 1, updated_at = CURRENT_TIMESTAMP');
      } else if (action === 'deselect_all') {
        await pool.execute('UPDATE districts SET is_active = 0, updated_at = CURRENT_TIMESTAMP');
      } else if (action === 'select_division' && division) {
        await pool.execute('UPDATE districts SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE division = ?', [division]);
      } else if (action === 'deselect_division' && division) {
        await pool.execute('UPDATE districts SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE division = ?', [division]);
      } else if (Array.isArray(active_ids)) {
        await pool.execute('UPDATE districts SET is_active = 0, updated_at = CURRENT_TIMESTAMP');
        if (active_ids.length > 0) {
          const placeholders = active_ids.map(() => '?').join(',');
          await pool.execute(`UPDATE districts SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`, active_ids);
        }
      }
    };

    try {
      await ensureDistrictsTableInDb(pool);
      await performUpdate();
    } catch (batchErr: any) {
      console.warn('[Admin Districts] First update attempt failed, ensuring table and retrying:', batchErr.message);
      await ensureDistrictsTableInDb(pool);
      await performUpdate();
    }

    let updated: any[] = [];
    try {
      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT d.*,
          (SELECT COUNT(DISTINCT c.id) FROM chambers c 
           WHERE c.city LIKE CONCAT('%', d.name, '%') OR c.city LIKE CONCAT('%', d.name_bn, '%')) as chamber_count
        FROM districts d
        ORDER BY d.division ASC, d.sort_order ASC
      `);
      updated = rows;
    } catch {
      const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM districts ORDER BY division ASC, sort_order ASC');
      updated = rows;
    }

    if (adminUser?.id) {
      await logActivity(adminUser.id, 'BATCH_UPDATE_DISTRICTS', `Batch updated districts (${action || 'custom'})`);
    }
    res.json({ success: true, districts: updated });
  } catch (err: any) {
    console.error('Error in POST /api/admin/districts/batch:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
