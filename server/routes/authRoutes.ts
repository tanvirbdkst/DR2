import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool, { logActivity } from '../db.js';
import { generateToken } from '../auth.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const router = Router();

// Register Patient
router.post('/register-patient', async (req, res) => {
  try {
    const { name, email, phone, password, gender, bloodGroup, dateOfBirth, address } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'Name, email, phone, and password are required.' });
    }

    const [existingRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existingRows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const conn = await pool.getConnection();
    let userId: number;
    let patientId: number;

    try {
      await conn.beginTransaction();

      const [userRes] = await conn.execute<ResultSetHeader>(
        `INSERT INTO users (name, email, phone, password_hash, role, status) VALUES (?, ?, ?, ?, 'patient', 'active')`,
        [name, email, phone, passwordHash]
      );
      userId = userRes.insertId;

      const [patRes] = await conn.execute<ResultSetHeader>(
        `INSERT INTO patients (user_id, blood_group, date_of_birth, gender, address) VALUES (?, ?, ?, ?, ?)`,
        [userId, bloodGroup || null, dateOfBirth || null, gender || null, address || null]
      );
      patientId = patRes.insertId;

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    await logActivity(userId, 'PATIENT_REGISTER', `New patient registered: ${email}`);

    const token = generateToken({
      id: userId,
      email,
      name,
      role: 'patient',
      status: 'active',
      patientId,
    });

    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 86400000 });

    res.status(201).json({
      message: 'Patient registration successful',
      token,
      user: {
        id: userId,
        name,
        email,
        phone,
        role: 'patient',
        status: 'active',
        patientId,
      },
    });
  } catch (err: any) {
    console.error('Error registering patient:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Register Doctor
router.post('/register-doctor', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      bmdcNumber,
      specialtyId,
      qualification,
      experienceYears,
      title = 'Dr.',
      bio,
      consultationFee = 500,
      chamberName,
      chamberAddress,
      city = 'Dhaka',
      area,
    } = req.body;

    if (!name || !email || !phone || !password || !bmdcNumber || !qualification) {
      return res.status(400).json({ error: 'Name, email, phone, password, BMDC registration number, and qualification are required.' });
    }

    const [existingUserRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existingUserRows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const [existingBmdcRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM doctors WHERE bmdc_number = ?',
      [bmdcNumber]
    );
    if (existingBmdcRows.length > 0) {
      return res.status(400).json({ error: 'This BMDC registration number is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const conn = await pool.getConnection();
    let userId: number;
    let doctorId: number;

    try {
      await conn.beginTransaction();

      // Create user with 'doctor' role and 'pending' status
      const [userRes] = await conn.execute<ResultSetHeader>(
        `INSERT INTO users (name, email, phone, password_hash, role, status) VALUES (?, ?, ?, ?, 'doctor', 'pending')`,
        [name, email, phone, passwordHash]
      );
      userId = userRes.insertId;

      const [docRes] = await conn.execute<ResultSetHeader>(
        `INSERT INTO doctors (user_id, specialty_id, title, bmdc_number, qualification, experience_years, bio, consultation_fee, approval_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          userId,
          specialtyId ? Number(specialtyId) : null,
          title,
          bmdcNumber,
          qualification,
          Number(experienceYears) || 0,
          bio || '',
          Number(consultationFee) || 500
        ]
      );
      doctorId = docRes.insertId;

      // If initial chamber was provided
      if (chamberName && chamberAddress) {
        const [chamberRes] = await conn.execute<ResultSetHeader>(
          `INSERT INTO chambers (doctor_id, name, address, city, area, phone) VALUES (?, ?, ?, ?, ?, ?)`,
          [doctorId, chamberName, chamberAddress, city, area || city, phone]
        );
        const chamberId = chamberRes.insertId;

        await conn.execute(
          `INSERT INTO doctor_chambers (doctor_id, chamber_id, consultation_fee, follow_up_fee) VALUES (?, ?, ?, ?)`,
          [doctorId, chamberId, Number(consultationFee) || 500, (Number(consultationFee) || 500) * 0.6]
        );
      }

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    await logActivity(userId, 'DOCTOR_REGISTER', `New doctor registered (pending approval): ${email} (BMDC: ${bmdcNumber})`);

    const token = generateToken({
      id: userId,
      email,
      name,
      role: 'doctor',
      status: 'pending',
      doctorId,
    });

    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 86400000 });

    res.status(201).json({
      message: 'Doctor registration submitted successfully! Your account is pending admin approval before appearing publicly.',
      token,
      user: {
        id: userId,
        name,
        email,
        phone,
        role: 'doctor',
        status: 'pending',
        doctorId,
      },
    });
  } catch (err: any) {
    console.error('Error registering doctor:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const [userRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, email, phone, password_hash, role, status, avatar_url FROM users WHERE email = ?`,
      [email]
    );

    const user = userRows[0] as any;
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    let doctorId: number | undefined;
    let patientId: number | undefined;
    let effectiveStatus = user.status;

    if (user.role === 'doctor') {
      const [docRows] = await pool.query<RowDataPacket[]>(
        'SELECT id, approval_status, rejection_reason FROM doctors WHERE user_id = ?',
        [user.id]
      );
      const doc = docRows[0] as any;
      if (doc) {
        doctorId = doc.id;
        effectiveStatus = doc.approval_status;
      }
    } else if (user.role === 'patient') {
      const [patRows] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM patients WHERE user_id = ?',
        [user.id]
      );
      const pat = patRows[0] as any;
      if (pat) patientId = pat.id;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: effectiveStatus,
      doctorId,
      patientId,
    });

    await logActivity(user.id, 'USER_LOGIN', `User logged in: ${user.email} (${user.role})`);

    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 86400000 });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: effectiveStatus,
        avatarUrl: user.avatar_url,
        doctorId,
        patientId,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Current Authenticated User
router.get('/me', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.json({ user: null });
    }

    // Fetch full updated user details from MySQL DB
    const [dbUserRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, email, phone, role, status, avatar_url FROM users WHERE id = ?',
      [user.id]
    );
    const dbUser = dbUserRows[0] as any;
    if (!dbUser) {
      return res.json({ user: null });
    }

    let doctorDetails = null;
    let patientDetails = null;

    if (dbUser.role === 'doctor') {
      const [docRows] = await pool.query<RowDataPacket[]>(
        `SELECT d.*, s.name as specialty_name, s.name_bn as specialty_name_bn
         FROM doctors d
         LEFT JOIN specialties s ON d.specialty_id = s.id
         WHERE d.user_id = ?`,
        [dbUser.id]
      );
      doctorDetails = docRows[0] as any;
      dbUser.status = doctorDetails?.approval_status || dbUser.status;
    } else if (dbUser.role === 'patient') {
      const [patRows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM patients WHERE user_id = ?',
        [dbUser.id]
      );
      patientDetails = patRows[0] as any;
    }

    res.json({
      user: {
        ...dbUser,
        doctorId: doctorDetails?.id,
        patientId: patientDetails?.id,
        doctorDetails,
        patientDetails,
      },
    });
  } catch (err: any) {
    console.error('Error in /me:', err);
    res.status(500).json({ error: 'Failed to fetch current user' });
  }
});

export default router;
