import express, { Request, Response } from 'express';
import pool from '../db.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { requireRole } from '../auth.js';
import {
  generateHospitalCode,
  generateHospitalCredentials,
  hashApiSecret,
  sendHospitalWebhook,
} from '../services/hospitalIntegrationService.js';

const router = express.Router();

// Enforce Super Admin Role for all hospital administration
router.use(requireRole(['admin']));

/**
 * 1. List All Hospitals
 * GET /api/admin/hospitals
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        h.*,
        c.api_key,
        c.last_used_at,
        (SELECT COUNT(*) FROM hospital_doctors WHERE hospital_id = h.id) as assigned_doctors_count,
        (SELECT COUNT(*) FROM hospital_sync_logs WHERE hospital_id = h.id) as total_sync_logs_count
      FROM hospitals h
      LEFT JOIN hospital_api_credentials c ON c.hospital_id = h.id AND c.status = 'active'
      ORDER BY h.id DESC
    `);
    res.json({ success: true, hospitals: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. Get Single Hospital Details
 * GET /api/admin/hospitals/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const hospitalId = Number(req.params.id);
    const [hospRows] = await pool.query<RowDataPacket[]>(`
      SELECT h.*, c.api_key, c.last_used_at
      FROM hospitals h
      LEFT JOIN hospital_api_credentials c ON c.hospital_id = h.id AND c.status = 'active'
      WHERE h.id = ?
    `, [hospitalId]);

    if (hospRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Hospital not found.' });
    }

    const [docRows] = await pool.query<RowDataPacket[]>(`
      SELECT
        hd.*,
        d.title,
        u.name as doctor_name,
        c.name as chamber_name,
        c.address as chamber_address
      FROM hospital_doctors hd
      JOIN doctors d ON hd.doctor_id = d.id
      JOIN users u ON d.user_id = u.id
      JOIN chambers c ON hd.chamber_id = c.id
      WHERE hd.hospital_id = ?
    `, [hospitalId]);

    res.json({
      success: true,
      hospital: hospRows[0],
      assigned_doctors: docRows,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. Create a New Hospital
 * POST /api/admin/hospitals
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      hospital_code,
      contact_person,
      phone,
      email,
      address,
      website_url,
      status = 'active',
      total_hospital_serials = 100,
      online_quota = 20,
      webhook_url,
      notes,
    } = req.body;

    if (!name || !phone || !email) {
      return res.status(400).json({ success: false, error: 'Hospital Name, Phone, and Email are required.' });
    }

    const code = hospital_code ? String(hospital_code).trim().toUpperCase() : await generateHospitalCode();

    // Check code collision
    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM hospitals WHERE hospital_code = ?', [code]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: `Hospital code ${code} is already in use.` });
    }

    // Generate credentials
    const { apiKey, apiSecret, webhookSecret } = generateHospitalCredentials();
    const secretHash = await hashApiSecret(apiSecret);

    const [insertResult] = await pool.execute<ResultSetHeader>(`
      INSERT INTO hospitals (
        hospital_code, name, contact_person, phone, email, address, website_url,
        status, integration_status, api_status, webhook_url, webhook_secret,
        total_hospital_serials, online_quota, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'active', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      code,
      name.trim(),
      contact_person ? contact_person.trim() : null,
      phone.trim(),
      email.trim(),
      address ? address.trim() : null,
      website_url ? website_url.trim() : null,
      status,
      webhook_url ? webhook_url.trim() : null,
      webhookSecret,
      Number(total_hospital_serials) || 100,
      Number(online_quota) || 20,
      notes ? notes.trim() : null,
    ]);

    const hospitalId = insertResult.insertId;

    // Save credential hash
    await pool.execute(`
      INSERT INTO hospital_api_credentials (hospital_id, api_key, api_secret_hash, status, created_at, updated_at)
      VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [hospitalId, apiKey, secretHash]);

    res.status(201).json({
      success: true,
      message: 'Hospital created successfully.',
      hospital: {
        id: hospitalId,
        hospital_code: code,
        name: name.trim(),
      },
      credentials: {
        apiKey,
        apiSecret, // Returned ONLY once upon creation
        webhookSecret,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4. Update Hospital Details & Quotas
 * PUT /api/admin/hospitals/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const hospitalId = Number(req.params.id);
    const {
      name,
      contact_person,
      phone,
      email,
      address,
      website_url,
      status,
      total_hospital_serials,
      online_quota,
      webhook_url,
      notes,
    } = req.body;

    await pool.execute(`
      UPDATE hospitals
      SET name = COALESCE(?, name),
          contact_person = COALESCE(?, contact_person),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          address = COALESCE(?, address),
          website_url = COALESCE(?, website_url),
          status = COALESCE(?, status),
          total_hospital_serials = COALESCE(?, total_hospital_serials),
          online_quota = COALESCE(?, online_quota),
          webhook_url = COALESCE(?, webhook_url),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name ? name.trim() : null,
      contact_person !== undefined ? contact_person : null,
      phone ? phone.trim() : null,
      email ? email.trim() : null,
      address !== undefined ? address : null,
      website_url !== undefined ? website_url : null,
      status || null,
      total_hospital_serials !== undefined ? Number(total_hospital_serials) : null,
      online_quota !== undefined ? Number(online_quota) : null,
      webhook_url !== undefined ? webhook_url : null,
      notes !== undefined ? notes : null,
      hospitalId,
    ]);

    res.json({ success: true, message: 'Hospital updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. Regenerate API Credentials for a Hospital
 * POST /api/admin/hospitals/:id/credentials/regenerate
 */
router.post('/:id/credentials/regenerate', async (req: Request, res: Response) => {
  try {
    const hospitalId = Number(req.params.id);
    const { apiKey, apiSecret, webhookSecret } = generateHospitalCredentials();
    const secretHash = await hashApiSecret(apiSecret);

    // Revoke previous credentials
    await pool.execute('UPDATE hospital_api_credentials SET status = ? WHERE hospital_id = ?', ['revoked', hospitalId]);

    // Insert new active credentials
    await pool.execute(`
      INSERT INTO hospital_api_credentials (hospital_id, api_key, api_secret_hash, status, created_at, updated_at)
      VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [hospitalId, apiKey, secretHash]);

    // Update hospital webhook secret and api status
    await pool.execute(`
      UPDATE hospitals
      SET webhook_secret = ?,
          api_status = 'active',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [webhookSecret, hospitalId]);

    res.json({
      success: true,
      message: 'New credentials generated successfully. Store the secret safely.',
      credentials: {
        apiKey,
        apiSecret, // Returned ONLY on regeneration
        webhookSecret,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 6. Revoke API Credentials
 * POST /api/admin/hospitals/:id/credentials/revoke
 */
router.post('/:id/credentials/revoke', async (req: Request, res: Response) => {
  try {
    const hospitalId = Number(req.params.id);
    await pool.execute('UPDATE hospital_api_credentials SET status = ? WHERE hospital_id = ?', ['revoked', hospitalId]);
    await pool.execute('UPDATE hospitals SET api_status = ? WHERE id = ?', ['revoked', hospitalId]);
    res.json({ success: true, message: 'API credentials revoked successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 7. Test Webhook Connection to Hospital
 * POST /api/admin/hospitals/:id/test-webhook
 */
router.post('/:id/test-webhook', async (req: Request, res: Response) => {
  try {
    const hospitalId = Number(req.params.id);
    const testPayload = {
      test: true,
      message: 'Ping from Daktar Serial Hospital Collaboration Engine',
      serial_number: 1,
      appointment_id: 'DS-TEST-00001',
      appointment_date: new Date().toISOString().substring(0, 10),
      status: 'TEST',
    };

    const result = await sendHospitalWebhook(hospitalId, 'integration.test', testPayload);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 8. Get Hospital Sync Logs with Filters
 * GET /api/admin/hospitals/sync-logs
 */
router.get('/sync-logs/all', async (req: Request, res: Response) => {
  try {
    const { hospital_id, direction, status, limit = 100 } = req.query;

    let sql = `
      SELECT
        l.*,
        h.name as hospital_name,
        h.hospital_code,
        u.name as doctor_name
      FROM hospital_sync_logs l
      JOIN hospitals h ON l.hospital_id = h.id
      LEFT JOIN doctors d ON l.doctor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (hospital_id) {
      sql += ' AND l.hospital_id = ?';
      params.push(Number(hospital_id));
    }
    if (direction) {
      sql += ' AND l.direction = ?';
      params.push(String(direction));
    }
    if (status) {
      sql += ' AND l.status = ?';
      params.push(String(status));
    }

    sql += ' ORDER BY l.id DESC LIMIT ?';
    params.push(Number(limit) || 100);

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    res.json({ success: true, logs: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 9. Retry Failed Sync Log Event
 * POST /api/admin/hospitals/sync-logs/:id/retry
 */
router.post('/sync-logs/:id/retry', async (req: Request, res: Response) => {
  try {
    const logId = Number(req.params.id);
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM hospital_sync_logs WHERE id = ?', [logId]);
    const log = rows[0] as any;

    if (!log) {
      return res.status(404).json({ success: false, error: 'Sync log entry not found.' });
    }

    let payload: any = {};
    try {
      payload = typeof log.request_payload === 'string' ? JSON.parse(log.request_payload) : log.request_payload;
    } catch {
      payload = { error: 'raw_payload' };
    }

    if (log.direction === 'daktar_to_hospital') {
      const result = await sendHospitalWebhook(log.hospital_id, log.event, payload?.data || payload);
      res.json({ success: result.success, message: result.success ? 'Webhook redelivery successful.' : result.error });
    } else {
      res.json({ success: false, message: 'Inbound requests cannot be re-executed directly.' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 10. Assign Doctor/Chamber to Hospital with Quotas
 * POST /api/admin/hospitals/:id/doctors
 */
router.post('/:id/doctors', async (req: Request, res: Response) => {
  try {
    const hospitalId = Number(req.params.id);
    const { doctor_id, chamber_id, total_serials = 100, online_quota = 20 } = req.body;

    if (!doctor_id || !chamber_id) {
      return res.status(400).json({ success: false, error: 'doctor_id and chamber_id are required.' });
    }

    // Insert or update mapping
    await pool.execute(`
      INSERT INTO hospital_doctors (hospital_id, doctor_id, chamber_id, total_serials, online_quota, status)
      VALUES (?, ?, ?, ?, ?, 'active')
      ON DUPLICATE KEY UPDATE
        total_serials = VALUES(total_serials),
        online_quota = VALUES(online_quota),
        status = 'active'
    `, [hospitalId, Number(doctor_id), Number(chamber_id), Number(total_serials), Number(online_quota)]);

    // Link chamber to hospital
    await pool.execute('UPDATE chambers SET hospital_id = ? WHERE id = ?', [hospitalId, Number(chamber_id)]);

    res.json({ success: true, message: 'Doctor and chamber assigned to hospital with quota configured.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 11. Delete Hospital
 * DELETE /api/admin/hospitals/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const hospitalId = Number(req.params.id);
    await pool.execute('DELETE FROM hospital_api_credentials WHERE hospital_id = ?', [hospitalId]);
    await pool.execute('DELETE FROM hospital_doctors WHERE hospital_id = ?', [hospitalId]);
    await pool.execute('DELETE FROM hospital_sync_logs WHERE hospital_id = ?', [hospitalId]);
    await pool.execute('DELETE FROM hospital_external_bookings WHERE hospital_id = ?', [hospitalId]);
    await pool.execute('DELETE FROM hospitals WHERE id = ?', [hospitalId]);
    res.json({ success: true, message: 'Hospital and all associated integration settings deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
