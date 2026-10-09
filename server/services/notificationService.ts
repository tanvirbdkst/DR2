import { Response } from 'express';
import pool from '../db.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { sendPushToUser } from './firebaseAdminService.js';

export interface CreateNotificationParams {
  userId: number;
  role: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  url?: string;
  deduplicationKey?: string;
}

export interface BookingNotificationDetails {
  appointmentId: string;
  serialNumber: number;
  appointmentTime: string;
  scheduleDate: string;
  doctorId: number;
  doctorName: string;
  doctorTitle?: string;
  chamberId: number;
  chamberName: string;
  patientName: string;
  patientPhone: string;
  fee?: number;
  bookingSource?: string;
}

export interface CancellationNotificationDetails {
  appointmentId: string;
  serialNumber: number;
  scheduleDate: string;
  doctorId: number;
  doctorName: string;
  chamberId: number;
  chamberName: string;
  patientName?: string;
  reason?: string;
  cancelledByRole?: string;
}

// Map of active SSE client connections by userId
const sseClients = new Map<number, Set<Response>>();

export function addSseClient(userId: number, res: Response) {
  if (!sseClients.has(userId)) {
    sseClients.set(userId, new Set());
  }
  sseClients.get(userId)!.add(res);
}

export function removeSseClient(userId: number, res: Response) {
  const userSet = sseClients.get(userId);
  if (userSet) {
    userSet.delete(res);
    if (userSet.size === 0) {
      sseClients.delete(userId);
    }
  }
}

export function broadcastToUser(userId: number, event: string, payload: any) {
  const userSet = sseClients.get(userId);
  if (userSet && userSet.size > 0) {
    const dataString = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of userSet) {
      try {
        client.write(dataString);
      } catch (err) {
        // Stale connection
        removeSseClient(userId, client);
      }
    }
  }
}

/**
 * Creates and stores a notification, then dispatches real-time SSE and Firebase Push.
 * Prevents duplicate events.
 */
export async function createNotification(params: CreateNotificationParams): Promise<number | null> {
  const { userId, role, type, title, body, data = {}, url = '/', deduplicationKey } = params;

  try {
    // 1. Check deduplication if a deduplication key is provided
    if (deduplicationKey) {
      const [existing] = await pool.query<RowDataPacket[]>(
        `SELECT id FROM notifications 
         WHERE user_id = ? AND type = ? AND JSON_EXTRACT(data, '$.deduplicationKey') = ?
         LIMIT 1`,
        [userId, type, deduplicationKey]
      );
      if (existing.length > 0) {
        return existing[0].id as number;
      }
    }

    const mergedData = { ...data, url, deduplicationKey };
    const dataJson = JSON.stringify(mergedData);

    const [insertResult] = await pool.execute<ResultSetHeader>(
      `INSERT INTO notifications (user_id, role, type, title, body, data, is_read)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [userId, role, type, title, body, dataJson]
    );

    const notificationId = insertResult.insertId;

    const notificationObject = {
      id: notificationId,
      user_id: userId,
      role,
      type,
      title,
      body,
      data: mergedData,
      is_read: 0,
      created_at: new Date().toISOString(),
    };

    // 2. Real-time broadcast via SSE
    broadcastToUser(userId, 'notification', notificationObject);

    // 3. Send Push via Firebase FCM in the background
    sendPushToUser(userId, {
      title,
      body,
      url,
      data: {
        notificationId: String(notificationId),
        type,
        url,
        ...(data || {}),
      },
    }).catch((pushErr) => {
      console.warn('[Notification] Push dispatch warning:', pushErr.message);
    });

    return notificationId;
  } catch (err: any) {
    console.error('[Notification] Error creating notification:', err.message);
    return null;
  }
}

/**
 * Notifies Admin and authorized Compounder when a serial is booked.
 * Must be called after the MySQL booking transaction commits.
 */
export async function notifyBookingSuccess(details: BookingNotificationDetails): Promise<void> {
  const {
    appointmentId,
    serialNumber,
    appointmentTime,
    scheduleDate,
    doctorId,
    doctorName,
    doctorTitle = 'Dr.',
    chamberId,
    chamberName,
    patientName,
    patientPhone,
    fee = 0,
    bookingSource = 'online',
  } = details;

  const docDisplay = doctorName.startsWith(doctorTitle) ? doctorName : `${doctorTitle} ${doctorName}`;
  const serialPad = serialNumber < 10 ? `0${serialNumber}` : `${serialNumber}`;
  const dedupKey = `booked_${appointmentId}`;

  // 1. Notify Super Admin(s)
  try {
    const [admins] = await pool.query<RowDataPacket[]>(
      `SELECT id, name FROM users WHERE role = 'admin' AND status = 'active'`
    );

    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        role: 'admin',
        type: 'appointment.booked',
        title: `নতুন সিরিয়াল বুকিং: #${serialPad} (${docDisplay})`,
        body: `সিরিয়াল #${serialPad} বুক করেছেন ${patientName} (${patientPhone})। চেম্বার: ${chamberName}, তারিখ: ${scheduleDate} (${appointmentTime})। আইডি: ${appointmentId}`,
        url: '/admin-dashboard',
        data: {
          appointmentId,
          serialNumber,
          doctorId,
          chamberId,
          scheduleDate,
          appointmentTime,
          doctorName: docDisplay,
          chamberName,
          patientName,
          patientPhone,
          fee,
          bookingSource,
        },
        deduplicationKey: dedupKey,
      });
    }
  } catch (err: any) {
    console.warn('[Notification] Error notifying admin on booking:', err.message);
  }

  // 2. Notify only the Compounder(s) authorized for the doctor/chamber of this appointment
  try {
    const [compounders] = await pool.query<RowDataPacket[]>(`
      SELECT c.user_id, u.name, u.email
      FROM compounders c
      JOIN users u ON c.user_id = u.id
      WHERE c.doctor_id = ? AND u.status = 'active'
    `, [doctorId]);

    for (const cmp of compounders) {
      await createNotification({
        userId: cmp.user_id,
        role: 'compounder',
        type: 'appointment.booked',
        title: `নতুন সিরিয়াল #${serialPad} - ${patientName}`,
        body: `তারিখ: ${scheduleDate} (${appointmentTime}) | চেম্বার: ${chamberName} | রোগী: ${patientName} (${patientPhone})`,
        url: '/compounder-dashboard',
        data: {
          appointmentId,
          serialNumber,
          doctorId,
          chamberId,
          scheduleDate,
          appointmentTime,
          doctorName: docDisplay,
          chamberName,
          patientName,
          patientPhone,
        },
        deduplicationKey: dedupKey,
      });
    }
  } catch (err: any) {
    console.warn('[Notification] Error notifying compounder on booking:', err.message);
  }
}

/**
 * Notifies Admin and authorized Compounder when an appointment is cancelled.
 */
export async function notifyAppointmentCancelled(details: CancellationNotificationDetails): Promise<void> {
  const {
    appointmentId,
    serialNumber,
    scheduleDate,
    doctorId,
    doctorName,
    chamberId,
    chamberName,
    patientName,
    reason,
  } = details;

  const serialPad = serialNumber < 10 ? `0${serialNumber}` : `${serialNumber}`;
  const dedupKey = `cancelled_${appointmentId}`;

  // 1. Notify Admin(s)
  try {
    const [admins] = await pool.query<RowDataPacket[]>(
      `SELECT id, name FROM users WHERE role = 'admin' AND status = 'active'`
    );

    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        role: 'admin',
        type: 'appointment.cancelled',
        title: `সিরিয়াল বাতিল: #${serialPad} (${doctorName})`,
        body: `সিরিয়াল #${serialPad} (${scheduleDate}, ${chamberName}) বাতিল করা হয়েছে। অ্যাপয়েন্টমেন্ট আইডি: ${appointmentId}${patientName ? ` (রোগী: ${patientName})` : ''}`,
        url: '/admin-dashboard',
        data: {
          appointmentId,
          serialNumber,
          doctorId,
          chamberId,
          scheduleDate,
          doctorName,
          chamberName,
          patientName,
          reason,
        },
        deduplicationKey: dedupKey,
      });
    }
  } catch (err: any) {
    console.warn('[Notification] Error notifying admin on cancellation:', err.message);
  }

  // 2. Notify assigned Compounders
  try {
    const [compounders] = await pool.query<RowDataPacket[]>(`
      SELECT c.user_id, u.name, u.email
      FROM compounders c
      JOIN users u ON c.user_id = u.id
      WHERE c.doctor_id = ? AND u.status = 'active'
    `, [doctorId]);

    for (const cmp of compounders) {
      await createNotification({
        userId: cmp.user_id,
        role: 'compounder',
        type: 'appointment.cancelled',
        title: `সিরিয়াল বাতিল #${serialPad}`,
        body: `তারিখ: ${scheduleDate} | চেম্বার: ${chamberName} | সিরিয়াল #${serialPad} বাতিল করা হয়েছে।`,
        url: '/compounder-dashboard',
        data: {
          appointmentId,
          serialNumber,
          doctorId,
          chamberId,
          scheduleDate,
          doctorName,
          chamberName,
          patientName,
        },
        deduplicationKey: dedupKey,
      });
    }
  } catch (err: any) {
    console.warn('[Notification] Error notifying compounder on cancellation:', err.message);
  }
}

/**
 * Fetch notifications for a user
 */
export async function getUserNotifications(userId: number, limit = 40): Promise<any[]> {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT id, user_id, role, type, title, body, data, is_read, created_at, read_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `, [userId, limit]);

  return rows.map((r: any) => ({
    ...r,
    data: typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {}),
  }));
}

/**
 * Get count of unread notifications for a user
 */
export async function getUnreadCount(userId: number): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  return Number(rows[0]?.count) || 0;
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(userId: number, notificationId: number): Promise<boolean> {
  const [res] = await pool.execute<ResultSetHeader>(
    'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
  return res.affectedRows > 0;
}

/**
 * Mark all notifications for a user as read
 */
export async function markAllAsRead(userId: number): Promise<number> {
  const [res] = await pool.execute<ResultSetHeader>(
    'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  return res.affectedRows;
}

/**
 * Register or update an FCM token for a user
 */
export async function registerFcmToken(
  userId: number,
  token: string,
  deviceType = 'web',
  userAgent = ''
): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;

  try {
    // Check if token already exists for another user or this user
    await pool.execute(`
      INSERT INTO fcm_tokens (user_id, token, device_type, user_agent, last_used_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        user_id = VALUES(user_id),
        device_type = VALUES(device_type),
        user_agent = VALUES(user_agent),
        last_used_at = CURRENT_TIMESTAMP
    `, [userId, token.trim(), deviceType, userAgent]);

    return true;
  } catch (err: any) {
    // In SQLite fallback or edge cases, do fallback UPSERT
    try {
      const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM fcm_tokens WHERE token = ?', [token.trim()]);
      if (existing.length > 0) {
        await pool.execute(
          'UPDATE fcm_tokens SET user_id = ?, device_type = ?, user_agent = ?, last_used_at = CURRENT_TIMESTAMP WHERE id = ?',
          [userId, deviceType, userAgent, existing[0].id]
        );
      } else {
        await pool.execute(
          'INSERT INTO fcm_tokens (user_id, token, device_type, user_agent) VALUES (?, ?, ?, ?)',
          [userId, token.trim(), deviceType, userAgent]
        );
      }
      return true;
    } catch (e: any) {
      console.warn('[Notification] Error registering token:', e.message);
      return false;
    }
  }
}

/**
 * Remove an FCM token (e.g. on logout)
 */
export async function removeFcmToken(userId: number, token: string): Promise<boolean> {
  if (!token) return false;
  const [res] = await pool.execute<ResultSetHeader>(
    'DELETE FROM fcm_tokens WHERE user_id = ? AND token = ?',
    [userId, token.trim()]
  );
  return res.affectedRows > 0;
}
