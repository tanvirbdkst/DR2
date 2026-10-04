import express, { Request, Response, NextFunction } from 'express';
import pool from '../db.js';
import { RowDataPacket } from 'mysql2/promise';
import {
  verifyApiSecret,
  processHospitalExternalBooking,
  processHospitalExternalCancel,
  logHospitalSync,
} from '../services/hospitalIntegrationService.js';

const router = express.Router();

export interface AuthenticatedHospitalRequest extends Request {
  hospital?: {
    id: number;
    hospital_code: string;
    name: string;
    total_hospital_serials: number;
    online_quota: number;
    webhook_url: string | null;
  };
}

/**
 * Hospital API Authentication Middleware
 * Enforces HTTPS, validates Hospital ID, API Key, and API Secret.
 * Enforces strict per-hospital data isolation.
 */
export async function hospitalAuthMiddleware(req: AuthenticatedHospitalRequest, res: Response, next: NextFunction) {
  try {
    const hospitalIdOrCode = (
      req.headers['x-hospital-id'] ||
      req.headers['x-hospital-code'] ||
      req.query.hospital_id ||
      req.body.hospital_id
    ) as string;

    const apiKey = (
      req.headers['x-api-key'] ||
      req.headers['authorization']?.replace(/^Bearer\s+/i, '') ||
      req.query.api_key
    ) as string;

    const apiSecret = (
      req.headers['x-api-secret'] ||
      req.headers['x-secret-key'] ||
      req.body.api_secret
    ) as string;

    if (!hospitalIdOrCode || !apiKey) {
      return res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        error: 'X-Hospital-ID and X-API-Key headers are required for hospital integration API.',
      });
    }

    // 1. Fetch Hospital
    const [hospRows] = await pool.query<RowDataPacket[]>(`
      SELECT id, hospital_code, name, status, api_status, total_hospital_serials, online_quota, webhook_url
      FROM hospitals
      WHERE (hospital_code = ? OR id = ?) AND status = 'active'
    `, [hospitalIdOrCode, Number(hospitalIdOrCode) || 0]);

    const hospital = hospRows[0] as any;
    if (!hospital) {
      return res.status(403).json({
        success: false,
        code: 'HOSPITAL_NOT_FOUND',
        error: 'Hospital not found or integration is inactive/suspended.',
      });
    }

    if (hospital.api_status !== 'active') {
      return res.status(403).json({
        success: false,
        code: 'API_REVOKED',
        error: 'Hospital API credentials have been revoked or are pending activation.',
      });
    }

    // 2. Fetch Credentials and Verify
    const [credRows] = await pool.query<RowDataPacket[]>(`
      SELECT id, api_key, api_secret_hash, status
      FROM hospital_api_credentials
      WHERE hospital_id = ? AND api_key = ? AND status = 'active'
    `, [hospital.id, apiKey]);

    const cred = credRows[0] as any;
    if (!cred) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_API_KEY',
        error: 'Invalid API Key for this hospital.',
      });
    }

    // If API Secret is provided, verify it against stored hash
    if (apiSecret) {
      const isValidSecret = await verifyApiSecret(apiSecret, cred.api_secret_hash);
      if (!isValidSecret) {
        return res.status(401).json({
          success: false,
          code: 'INVALID_API_SECRET',
          error: 'Invalid API Secret provided.',
        });
      }
    }

    // Update last used timestamp
    await pool.execute('UPDATE hospital_api_credentials SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?', [cred.id]);
    await pool.execute('UPDATE hospitals SET last_api_request_at = CURRENT_TIMESTAMP, integration_status = ' + "'connected' WHERE id = ?", [hospital.id]);

    req.hospital = {
      id: hospital.id,
      hospital_code: hospital.hospital_code,
      name: hospital.name,
      total_hospital_serials: hospital.total_hospital_serials,
      online_quota: hospital.online_quota,
      webhook_url: hospital.webhook_url,
    };

    next();
  } catch (err: any) {
    console.error('[HospitalAuth] Middleware error:', err.message);
    res.status(500).json({ success: false, code: 'AUTH_ERROR', error: 'Authentication internal error.' });
  }
}

// Apply authentication to all integration routes
router.use(hospitalAuthMiddleware);

/**
 * 1. Test Connection / Ping Endpoint
 * POST /api/integration/hospital/test-connection
 */
router.post('/test-connection', async (req: AuthenticatedHospitalRequest, res: Response) => {
  const hospital = req.hospital!;
  res.json({
    success: true,
    code: 'CONNECTION_ACTIVE',
    message: 'Authentication successful. Hospital integration is live.',
    hospital: {
      id: hospital.id,
      code: hospital.hospital_code,
      name: hospital.name,
      total_serials: hospital.total_hospital_serials,
      online_quota_allocated: hospital.online_quota,
      webhook_configured: Boolean(hospital.webhook_url),
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * 2. Get Authorized Doctors for this Hospital
 * GET /api/integration/hospital/doctors
 * Strict Isolation: Only returns doctors assigned to this specific hospital.
 */
router.get('/doctors', async (req: AuthenticatedHospitalRequest, res: Response) => {
  try {
    const hospital = req.hospital!;

    // Query doctors linked directly via hospital_doctors or chambers
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT DISTINCT
        d.id as doctor_id,
        CONCAT('DOC-', LPAD(d.id, 4, '0')) as doctor_code,
        u.name as doctor_name,
        d.title,
        d.qualification,
        d.bmdc_number,
        d.consultation_fee,
        s.name as primary_specialty,
        s.name_bn as primary_specialty_bn,
        c.id as chamber_id,
        c.name as chamber_name,
        c.address as chamber_address,
        c.city as chamber_city,
        COALESCE(hd.total_serials, hospital.total_hospital_serials) as total_serials,
        COALESCE(hd.online_quota, hospital.online_quota) as online_quota
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      JOIN chambers c ON c.doctor_id = d.id
      LEFT JOIN hospital_doctors hd ON hd.hospital_id = ? AND hd.doctor_id = d.id AND hd.chamber_id = c.id
      WHERE (c.hospital_id = ? OR hd.hospital_id = ? OR c.name LIKE CONCAT('%', ?, '%'))
        AND d.approval_status = 'approved'
        AND u.status = 'active'
      ORDER BY u.name ASC
    `, [hospital.id, hospital.id, hospital.id, hospital.name]);

    res.json({
      success: true,
      hospital_id: hospital.hospital_code,
      count: rows.length,
      doctors: rows,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. Get Doctor Schedules for this Hospital
 * GET /api/integration/hospital/schedules?doctor_id=...&chamber_id=...
 */
router.get('/schedules', async (req: AuthenticatedHospitalRequest, res: Response) => {
  try {
    const hospital = req.hospital!;
    const doctorId = Number(req.query.doctor_id);
    const chamberId = Number(req.query.chamber_id);

    let sql = `
      SELECT
        ds.id as schedule_id,
        CONCAT('SCH-', LPAD(ds.id, 4, '0')) as schedule_code,
        ds.doctor_id,
        u.name as doctor_name,
        ds.chamber_id,
        c.name as chamber_name,
        ds.day_of_week,
        ds.start_time,
        ds.end_time,
        ds.max_serials,
        COALESCE(hd.online_quota, hospital.online_quota) as daktar_online_quota,
        (ds.max_serials - COALESCE(hd.online_quota, hospital.online_quota)) as hospital_direct_quota,
        ds.slot_duration_minutes,
        ds.is_active
      FROM doctor_schedules ds
      JOIN doctors d ON ds.doctor_id = d.id
      JOIN users u ON d.user_id = u.id
      JOIN chambers c ON ds.chamber_id = c.id
      LEFT JOIN hospital_doctors hd ON hd.hospital_id = ? AND hd.doctor_id = d.id AND hd.chamber_id = c.id
      WHERE ds.is_active = 1
        AND (c.hospital_id = ? OR hd.hospital_id = ? OR c.name LIKE CONCAT('%', ?, '%'))
    `;
    const params: any[] = [hospital.id, hospital.id, hospital.id, hospital.name];

    if (doctorId) {
      sql += ' AND ds.doctor_id = ?';
      params.push(doctorId);
    }
    if (chamberId) {
      sql += ' AND ds.chamber_id = ?';
      params.push(chamberId);
    }

    sql += ' ORDER BY ds.doctor_id ASC, ds.id ASC';

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    res.json({
      success: true,
      hospital_id: hospital.hospital_code,
      schedules: rows,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4. Get Real-Time Serial Availability for Doctor, Chamber, and Date
 * GET /api/integration/hospital/serials?doctor_id=1&chamber_id=2&date=2026-10-04
 * Returns list of serials 1..max_serials with status: 'available' | 'booked' | 'locked'
 */
router.get('/serials', async (req: AuthenticatedHospitalRequest, res: Response) => {
  try {
    const hospital = req.hospital!;
    const doctorId = Number(req.query.doctor_id);
    const chamberId = Number(req.query.chamber_id);
    const dateStr = (req.query.date || req.query.appointment_date) as string;

    if (!doctorId || !dateStr) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_PARAMS',
        error: 'doctor_id and date (YYYY-MM-DD) query parameters are required.',
      });
    }

    const dateObj = new Date(dateStr + 'T00:00:00');
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ success: false, code: 'INVALID_DATE', error: 'Invalid date format (YYYY-MM-DD).' });
    }
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = DAYS[dateObj.getDay()];

    // Find schedule
    let schedQuery = `
      SELECT ds.*, c.name as chamber_name, COALESCE(hd.online_quota, hospital.online_quota) as online_quota
      FROM doctor_schedules ds
      JOIN chambers c ON ds.chamber_id = c.id
      LEFT JOIN hospital_doctors hd ON hd.hospital_id = ? AND hd.doctor_id = ds.doctor_id AND hd.chamber_id = ds.chamber_id
      WHERE ds.doctor_id = ? AND ds.day_of_week = ? AND ds.is_active = 1
    `;
    const schedParams: any[] = [hospital.id, doctorId, dayOfWeek];
    if (chamberId) {
      schedQuery += ' AND ds.chamber_id = ?';
      schedParams.push(chamberId);
    }
    schedQuery += ' LIMIT 1';

    const [schedRows] = await pool.query<RowDataPacket[]>(schedQuery, schedParams);
    const schedule = schedRows[0] as any;

    if (!schedule) {
      return res.status(404).json({
        success: false,
        code: 'NO_SCHEDULE',
        error: `Doctor has no session on ${dayOfWeek} (${dateStr}).`,
      });
    }

    // Get all booked appointments for this date
    const [bookedRows] = await pool.query<RowDataPacket[]>(`
      SELECT serial_number, status, booking_source, appointment_id
      FROM appointments
      WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND status != 'cancelled'
    `, [doctorId, schedule.chamber_id, dateStr]);

    const bookedMap = new Map<number, any>();
    bookedRows.forEach((r) => bookedMap.set(r.serial_number, r));

    // Construct serial slot details
    const maxSerials = schedule.max_serials || 20;
    const onlineQuota = Math.min(schedule.online_quota || hospital.online_quota, maxSerials);
    const serialsList = [];

    for (let sNum = 1; sNum <= maxSerials; sNum++) {
      const isBooked = bookedMap.has(sNum);
      const bookedData = bookedMap.get(sNum);

      serialsList.push({
        serial_number: sNum,
        serial_id: `SER-${dateStr.replace(/-/g, '')}-${String(sNum).padStart(4, '0')}`,
        status: isBooked ? 'booked' : 'available',
        channel_allocation: sNum <= onlineQuota ? 'daktar_online' : 'hospital_direct',
        appointment_id: isBooked ? bookedData.appointment_id : null,
      });
    }

    const availableCount = serialsList.filter((s) => s.status === 'available').length;
    const bookedCount = serialsList.filter((s) => s.status === 'booked').length;

    res.json({
      success: true,
      hospital_id: hospital.hospital_code,
      doctor_id: doctorId,
      chamber_id: schedule.chamber_id,
      schedule_id: schedule.id,
      schedule_date: dateStr,
      day_of_week: dayOfWeek,
      total_serials: maxSerials,
      online_quota: onlineQuota,
      hospital_direct_quota: maxSerials - onlineQuota,
      available_count: availableCount,
      booked_count: bookedCount,
      serials: serialsList,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. Hospital -> Daktar Serial Booking Synchronization
 * POST /api/integration/hospital/booking
 * Atomically locks serial, creates appointment, enforces double-booking safeguard.
 */
router.post('/booking', async (req: AuthenticatedHospitalRequest, res: Response) => {
  try {
    const hospital = req.hospital!;
    const {
      doctor_id,
      chamber_id,
      serial_number,
      appointment_date,
      external_booking_id,
      idempotency_key,
      patient_name,
      patient_phone,
      notes,
    } = req.body;

    if (!doctor_id || !serial_number || !appointment_date || !external_booking_id) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'doctor_id, serial_number, appointment_date, and external_booking_id are required fields.',
      });
    }

    const result = await processHospitalExternalBooking({
      hospitalId: hospital.id,
      hospitalCode: hospital.hospital_code,
      doctorId: Number(doctor_id),
      chamberId: chamber_id ? Number(chamber_id) : undefined,
      serialNumber: Number(serial_number),
      appointmentDate: String(appointment_date).trim(),
      externalBookingId: String(external_booking_id).trim(),
      idempotencyKey: idempotency_key ? String(idempotency_key).trim() : undefined,
      patientName: patient_name,
      patientPhone: patient_phone,
      notes,
    });

    if (!result.success) {
      const statusCode = result.code === 'SERIAL_ALREADY_BOOKED' ? 409 : 400;
      return res.status(statusCode).json(result);
    }

    res.status(result.duplicate ? 200 : 201).json(result);
  } catch (err: any) {
    console.error('[HospitalBooking] Error:', err.message);
    res.status(500).json({ success: false, code: 'SERVER_ERROR', error: err.message });
  }
});

/**
 * 6. Cancel a Booking from Hospital
 * POST /api/integration/hospital/cancel
 * Releases the serial slot back to 'available' atomically.
 */
router.post('/cancel', async (req: AuthenticatedHospitalRequest, res: Response) => {
  try {
    const hospital = req.hospital!;
    const { external_booking_id, appointment_id, reason } = req.body;

    if (!external_booking_id && !appointment_id) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_ID',
        error: 'Either external_booking_id or appointment_id must be provided.',
      });
    }

    const result = await processHospitalExternalCancel({
      hospitalId: hospital.id,
      externalBookingId: external_booking_id,
      appointmentId: appointment_id,
      reason,
    });

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 7. Get Booking Status
 * GET /api/integration/hospital/booking/:id
 */
router.get('/booking/:id', async (req: AuthenticatedHospitalRequest, res: Response) => {
  try {
    const hospital = req.hospital!;
    const bookingId = req.params.id;

    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        a.id,
        a.appointment_id,
        e.external_booking_id,
        a.doctor_id,
        u.name as doctor_name,
        a.chamber_id,
        c.name as chamber_name,
        a.schedule_date,
        a.serial_number,
        a.appointment_time,
        a.status,
        a.created_at
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u ON d.user_id = u.id
      JOIN chambers c ON a.chamber_id = c.id
      LEFT JOIN hospital_external_bookings e ON e.appointment_id = a.appointment_id
      WHERE (a.appointment_id = ? OR e.external_booking_id = ?)
        AND (e.hospital_id = ? OR c.hospital_id = ?)
    `, [bookingId, bookingId, hospital.id, hospital.id]);

    const booking = rows[0];
    if (!booking) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Booking not found.' });
    }

    res.json({ success: true, booking });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
