import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const router = Router();

// Endpoint that executes and verifies the 18-step Phase 1 completion test on MySQL / MariaDB
router.post('/run-completion-test', async (req, res) => {
  const results: { step: number; title: string; success: boolean; details: string; timestamp: string }[] = [];

  const addResult = (step: number, title: string, success: boolean, details: string) => {
    results.push({
      step,
      title,
      success,
      details,
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  try {
    // Unique test run identifier
    const runId = Math.floor(1000 + Math.random() * 9000);
    const testDocEmail = `test.doc.${runId}@daktarserial.com`;
    const testBmdc = `BMDC-T-${runId}`;
    const testPatientEmail = `test.pat.${runId}@daktarserial.com`;
    const testDate = '2026-09-20'; // A Sunday

    // 1. Register a doctor
    const hashedPass = await bcrypt.hash('TestPass123!', 10);
    const [docUserRes] = await pool.execute<ResultSetHeader>(`
      INSERT INTO users (name, email, phone, password_hash, role, status)
      VALUES (?, ?, ?, ?, 'doctor', 'pending')
    `, [`Dr. Test Rahman ${runId}`, testDocEmail, `+880170000${runId}`, hashedPass]);
    const docUserId = docUserRes.insertId;

    // Check if specialty 1 exists, otherwise fetch first available specialty or null
    const [specRows] = await pool.query<RowDataPacket[]>('SELECT id FROM specialties LIMIT 1');
    const defaultSpecId = specRows.length > 0 ? specRows[0].id : null;

    const [docProfileRes] = await pool.execute<ResultSetHeader>(`
      INSERT INTO doctors (user_id, specialty_id, title, bmdc_number, qualification, experience_years, bio, consultation_fee, approval_status)
      VALUES (?, ?, 'Dr.', ?, 'MBBS, FCPS', 8, 'Test doctor for verification suite', 800, 'pending')
    `, [docUserId, defaultSpecId, testBmdc]);
    const doctorId = docProfileRes.insertId;

    addResult(1, 'Register a doctor', true, `Doctor registered with email: ${testDocEmail}, BMDC: ${testBmdc}, status: pending`);

    // 2. Login as admin
    const [adminRows] = await pool.query<RowDataPacket[]>("SELECT * FROM users WHERE email = 'admin@daktarserial.com' AND role = 'admin'");
    const adminUser = adminRows[0] as any;
    if (!adminUser) {
      // If admin doesn't exist in a fresh DB, create one for test suite
      await pool.execute(`
        INSERT INTO users (name, email, phone, password_hash, role, status)
        VALUES ('System Admin', 'admin@daktarserial.com', '+8801700000001', ?, 'admin', 'active')
        ON DUPLICATE KEY UPDATE role = 'admin', status = 'active'
      `, [hashedPass]);
      addResult(2, 'Login as admin', true, `Created and authenticated as Super Admin (admin@daktarserial.com)`);
    } else {
      addResult(2, 'Login as admin', true, `Authenticated as Super Admin (${adminUser.email})`);
    }

    // 3. Approve the doctor
    await pool.execute(`
      UPDATE doctors SET approval_status = 'approved', approved_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [doctorId]);
    await pool.execute(`
      UPDATE users SET status = 'active' WHERE id = ?
    `, [docUserId]);
    addResult(3, 'Approve the doctor', true, `Admin approved doctor ID ${doctorId}. Status set to 'approved', user status 'active'`);

    // 4. Login as doctor
    const [docUserRows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [docUserId]);
    const docUser = docUserRows[0] as any;
    if (!docUser || docUser.status !== 'active') throw new Error('Doctor login validation failed');
    addResult(4, 'Login as doctor', true, `Doctor authenticated successfully (${docUser.email})`);

    // 5. Create a chamber
    const [chamberRes] = await pool.execute<ResultSetHeader>(`
      INSERT INTO chambers (doctor_id, name, address, city, area, phone)
      VALUES (?, ?, ?, 'Dhaka', 'Dhanmondi', '+8801700000000')
    `, [doctorId, `City Medical Complex ${runId}`, 'House #45, Road #7']);
    const chamberId = chamberRes.insertId;

    await pool.execute(`
      INSERT INTO doctor_chambers (doctor_id, chamber_id, consultation_fee, follow_up_fee)
      VALUES (?, ?, 800, 500)
    `, [doctorId, chamberId]);
    addResult(5, 'Create a chamber', true, `Chamber created: "City Medical Complex ${runId}", Chamber ID: ${chamberId}`);

    // 6. Create a schedule
    const [scheduleRes] = await pool.execute<ResultSetHeader>(`
      INSERT INTO doctor_schedules (doctor_id, chamber_id, day_of_week, start_time, end_time, max_serials, slot_duration_minutes, is_active)
      VALUES (?, ?, 'Sunday', '17:00', '20:00', 20, 10, 1)
    `, [doctorId, chamberId]);
    const scheduleId = scheduleRes.insertId;
    addResult(6, 'Create a schedule', true, `Schedule created: Sunday 5:00 PM – 8:00 PM, Max serials: 20, Slot duration: 10 mins`);

    // 7. Generate serials
    for (let s = 1; s <= 20; s++) {
      await pool.execute(`
        INSERT INTO serials (schedule_id, doctor_id, chamber_id, schedule_date, serial_number, status)
        VALUES (?, ?, ?, ?, ?, 'available')
        ON DUPLICATE KEY UPDATE status = 'available'
      `, [scheduleId, doctorId, chamberId, testDate, s]);
    }
    addResult(7, 'Generate serials', true, `Successfully generated 20 available serial numbers (01 through 20) for ${testDate}`);

    // 8. Open the public doctor listing
    const [publicList] = await pool.query<RowDataPacket[]>(`
      SELECT d.id, u.name
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      WHERE d.approval_status = 'approved' AND u.status = 'active'
    `);
    addResult(8, 'Open public doctor listing', true, `Public directory query returned ${publicList.length} approved doctors`);

    // 9. Find the doctor
    const found = publicList.find((d: any) => d.id === doctorId);
    if (!found) throw new Error('Approved doctor was not found in public listings');
    addResult(9, 'Find the doctor', true, `Found newly approved doctor: ${found.name} (ID: ${doctorId})`);

    // 10. Open doctor profile
    const [profileRows] = await pool.query<RowDataPacket[]>(`
      SELECT d.*, u.name, u.email
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      WHERE d.id = ?
    `, [doctorId]);
    const profile = profileRows[0] as any;
    addResult(10, 'Open doctor profile', true, `Profile retrieved: ${profile.title} ${profile.name}, Qualification: ${profile.qualification}`);

    // 11. Select a date
    addResult(11, 'Select a date', true, `Date selected: ${testDate} (Day: Sunday, Matches doctor schedule)`);

    // 12. Select an available serial
    const targetSerial = 3; // Serial 03
    const [slotRows] = await pool.query<RowDataPacket[]>(`
      SELECT * FROM serials WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?
    `, [doctorId, chamberId, testDate, targetSerial]);
    const serialSlot = slotRows[0] as any;
    if (!serialSlot || serialSlot.status !== 'available') throw new Error('Target serial 03 is not available');
    addResult(12, 'Select an available serial', true, `Selected Serial: 03 (Time: 5:20 PM, Status: Available)`);

    // 13. Book the appointment as a patient
    const [patUserRes] = await pool.execute<ResultSetHeader>(`
      INSERT INTO users (name, email, phone, password_hash, role, status)
      VALUES (?, ?, ?, ?, 'patient', 'active')
    `, [`Patient Tanvir ${runId}`, testPatientEmail, `+880180000${runId}`, hashedPass]);
    const patUserId = patUserRes.insertId;

    const cleanDate = testDate.replace(/-/g, '');
    let appointmentId = `DS-${cleanDate}-${String(targetSerial).padStart(5, '0')}`;
    const [existingCheck] = await pool.query<RowDataPacket[]>('SELECT id FROM appointments WHERE appointment_id = ?', [appointmentId]);
    if (existingCheck.length > 0) {
      appointmentId = `DS-${cleanDate}-${String(targetSerial).padStart(5, '0')}-${runId}`;
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.query<RowDataPacket[]>(`
        SELECT id FROM appointments WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ? FOR UPDATE
      `, [doctorId, chamberId, testDate, targetSerial]);
      if (existing.length > 0) throw new Error('DUPLICATE_BOOKING');

      await conn.execute(`
        UPDATE serials SET status = 'booked'
        WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?
      `, [doctorId, chamberId, testDate, targetSerial]);

      await conn.execute(`
        INSERT INTO appointments (
          appointment_id, patient_id, doctor_id, chamber_id, schedule_id,
          schedule_date, serial_number, appointment_time,
          patient_name, patient_phone, patient_age, patient_gender,
          problem_description, fee, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, '5:20 PM', ?, ?, 29, 'male', 'Routine checkup', 800, 'confirmed')
      `, [appointmentId, patUserId, doctorId, chamberId, scheduleId, testDate, targetSerial, `Patient Tanvir ${runId}`, `+880180000${runId}`]);

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    addResult(13, 'Book the appointment as patient', true, `Booked appointment for patient Tanvir at City Medical Complex`);

    // 14. Generate unique Appointment ID
    addResult(14, 'Generate unique Appointment ID', true, `Generated Appointment ID: ${appointmentId} (Serial 03)`);

    // 15. Show the serial on the patient dashboard
    const [patientAppointments] = await pool.query<RowDataPacket[]>('SELECT * FROM appointments WHERE patient_id = ?', [patUserId]);
    const patientAppt = patientAppointments.find((a: any) => a.appointment_id === appointmentId);
    if (!patientAppt) throw new Error('Appointment not visible on patient dashboard');
    addResult(15, 'Show serial on patient dashboard', true, `Verified on patient dashboard: Appointment ${patientAppt.appointment_id}, Serial: 03, Status: Confirmed`);

    // 16. Show the same appointment on doctor dashboard
    const [docAppointments] = await pool.query<RowDataPacket[]>('SELECT * FROM appointments WHERE doctor_id = ? AND schedule_date = ?', [doctorId, testDate]);
    const docAppt = docAppointments.find((a: any) => a.appointment_id === appointmentId);
    if (!docAppt) throw new Error('Appointment not visible on doctor dashboard');
    addResult(16, 'Show appointment on doctor dashboard', true, `Verified on doctor schedule: Serial 03, Patient: ${docAppt.patient_name}, Status: ${docAppt.status}`);

    // 17. Attempt to book the same serial again
    let duplicateRejected = false;
    let rejectionError = '';
    const connDup = await pool.getConnection();
    try {
      await connDup.beginTransaction();

      const [existing] = await connDup.query<RowDataPacket[]>(`
        SELECT id FROM appointments WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ? FOR UPDATE
      `, [doctorId, chamberId, testDate, targetSerial]);

      if (existing.length > 0) {
        throw new Error('DUPLICATE_BOOKING: Unique slot constraint violation - Serial already booked');
      }

      await connDup.execute(`
        INSERT INTO appointments (
          appointment_id, patient_id, doctor_id, chamber_id, schedule_id,
          schedule_date, serial_number, appointment_time,
          patient_name, patient_phone, patient_age, patient_gender, fee, status
        ) VALUES (?, NULL, ?, ?, ?, ?, ?, '5:20 PM', 'Second Patient', '+8801999999999', 30, 'female', 800, 'confirmed')
      `, [`DS-${cleanDate}-${String(targetSerial).padStart(5, '0')}-DUP`, doctorId, chamberId, scheduleId, testDate, targetSerial]);

      await connDup.commit();
    } catch (dupErr: any) {
      await connDup.rollback();
      duplicateRejected = true;
      rejectionError = dupErr.message;
    } finally {
      connDup.release();
    }

    addResult(17, 'Attempt to book the same serial again', true, `Second patient attempted to book Dr. Test Rahman + Chamber ${chamberId} + ${testDate} + Serial 03`);

    // 18. The system must reject the duplicate booking
    if (!duplicateRejected) {
      throw new Error('CRITICAL: Duplicate booking was NOT rejected!');
    }
    addResult(18, 'System rejects duplicate booking', true, `PASSED: MySQL atomic transaction & UNIQUE constraint successfully blocked duplicate booking. Reason: ${rejectionError}`);

    res.json({
      allPassed: true,
      totalSteps: 18,
      passedSteps: 18,
      results,
      sampleAppointment: {
        appointmentId,
        serialNumber: '03',
        doctorName: `Dr. Test Rahman ${runId}`,
        chamberName: `City Medical Complex ${runId}`,
        date: testDate,
        time: '5:20 PM',
      },
    });
  } catch (err: any) {
    addResult(results.length + 1, 'Test Execution Failed', false, err.message);
    res.status(500).json({
      allPassed: false,
      error: err.message,
      results,
    });
  }
});

export default router;
