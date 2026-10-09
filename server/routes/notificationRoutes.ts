import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth.js';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  registerFcmToken,
  removeFcmToken,
  addSseClient,
  removeSseClient,
  createNotification,
} from '../services/notificationService.js';
import { getFirebaseAdminStatus, isFirebaseAdminConfigured } from '../services/firebaseAdminService.js';

const router = Router();

// All notification routes require authentication
router.use(requireAuth);

/**
 * 1. GET /api/notifications
 * Returns recent notifications for the authenticated user along with unread count.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const limit = Number(req.query.limit) || 40;
    const notifications = await getUserNotifications(user.id, limit);
    const unreadCount = await getUnreadCount(user.id);

    res.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch notifications.' });
  }
});

/**
 * 2. GET /api/notifications/unread-count
 * Returns only the unread count (for lightweight badge polling).
 */
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const unreadCount = await getUnreadCount(user.id);
    res.json({ unreadCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3. PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const success = await markAsRead(user.id, Number(id));
    const unreadCount = await getUnreadCount(user.id);

    res.json({ success, unreadCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 4. PATCH /api/notifications/read-all
 * Mark all user notifications as read.
 */
router.patch('/read-all', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const count = await markAllAsRead(user.id);

    res.json({ success: true, markedCount: count, unreadCount: 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 5. POST /api/notifications/register-token
 * Register or update the browser / mobile FCM device token.
 */
router.post('/register-token', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { token, deviceType = 'web' } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'FCM registration token is required.' });
    }

    const userAgent = req.headers['user-agent'] || '';
    const registered = await registerFcmToken(user.id, token, deviceType, userAgent);

    res.json({
      success: registered,
      message: registered ? 'Device push token registered successfully.' : 'Failed to register token.',
      firebaseReady: isFirebaseAdminConfigured(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 6. DELETE /api/notifications/token
 * Remove an FCM token (e.g. on logout or when user turns off notifications).
 */
router.delete('/token', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required.' });
    }

    const removed = await removeFcmToken(user.id, token);
    res.json({ success: removed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 7. GET /api/notifications/stream
 * Server-Sent Events (SSE) live push stream for real-time notification alerts.
 */
router.get('/stream', (req: Request, res: Response) => {
  const user = (req as any).user;

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // For Nginx / LiteSpeed reverse proxy
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ userId: user.id, timestamp: Date.now() })}\n\n`);

  addSseClient(user.id, res);

  // Heartbeat ping every 25 seconds to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(heartbeat);
      removeSseClient(user.id, res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeSseClient(user.id, res);
  });
});

/**
 * 8. POST /api/notifications/test
 * Sends a test notification to verify both in-app storage and Firebase Push delivery.
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const status = getFirebaseAdminStatus();

    const notifId = await createNotification({
      userId: user.id,
      role: user.role,
      type: 'system.test',
      title: 'Daktar Serial টেস্ট নোটিফিকেশন',
      body: `টেস্ট পুশ নোটিফিকেশন সফলভাবে তৈরি হয়েছে। সময়: ${new Date().toLocaleTimeString('bn-BD')}`,
      url: user.role === 'admin' ? '/admin-dashboard' : '/compounder-dashboard',
      data: {
        test: 'true',
        timestamp: String(Date.now()),
      },
    });

    res.json({
      success: true,
      notificationId: notifId,
      firebaseStatus: status,
      message: 'Test notification created and push dispatched.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 9. GET /api/notifications/status
 * Get the current Firebase push setup status.
 */
router.get('/status', (req: Request, res: Response) => {
  res.json({
    status: getFirebaseAdminStatus(),
  });
});

export default router;
