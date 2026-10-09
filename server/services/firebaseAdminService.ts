import fs from 'fs';
import path from 'path';
import { initializeApp, cert, applicationDefault, getApps, App } from 'firebase-admin/app';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';
import pool from '../db.js';
import { RowDataPacket } from 'mysql2/promise';

let isInitialized = false;
let initializationError: string | null = null;
let appInstance: App | null = null;

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'dr-serial-721ba';

/**
 * Initializes the Firebase Admin SDK safely.
 * Works with:
 *  - cPanel GOOGLE_APPLICATION_CREDENTIALS file path
 *  - Explicit FIREBASE_SERVICE_ACCOUNT_PATH or json
 *  - Gracefully enters standby mode if credentials file is not yet deployed.
 */
export function initializeFirebaseAdmin(): boolean {
  if (isInitialized) return true;

  try {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    // 1. Check if a service account file exists at the specified path (cPanel environment)
    if (credPath && fs.existsSync(credPath)) {
      try {
        const fileContent = fs.readFileSync(credPath, 'utf8');
        const serviceAccount = JSON.parse(fileContent);
        appInstance = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id || FIREBASE_PROJECT_ID,
        });
        isInitialized = true;
        initializationError = null;
        console.log(`[Firebase Admin] Successfully initialized with service account from: ${credPath}`);
        return true;
      } catch (fileErr: any) {
        console.warn(`[Firebase Admin] Failed parsing credentials file at ${credPath}:`, fileErr.message);
      }
    }

    // 2. Check fallback local credential path in secure server directory
    const localCredPath = path.join(process.cwd(), 'firebase-adminsdk.json');
    if (fs.existsSync(localCredPath)) {
      try {
        const fileContent = fs.readFileSync(localCredPath, 'utf8');
        const serviceAccount = JSON.parse(fileContent);
        appInstance = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id || FIREBASE_PROJECT_ID,
        });
        isInitialized = true;
        initializationError = null;
        console.log('[Firebase Admin] Successfully initialized with local credentials file.');
        return true;
      } catch (err: any) {
        console.warn('[Firebase Admin] Failed parsing local firebase-adminsdk.json:', err.message);
      }
    }

    // 3. Try default application credentials if running in GCP / Cloud Run environment
    try {
      if (getApps().length === 0) {
        appInstance = initializeApp({
          credential: applicationDefault(),
          projectId: FIREBASE_PROJECT_ID,
        });
      }
      isInitialized = true;
      initializationError = null;
      console.log('[Firebase Admin] Successfully initialized with Google Application Default Credentials.');
      return true;
    } catch (gcpErr: any) {
      // Standby mode - credentials not configured yet
      initializationError = 'No valid Service Account credentials found. Firebase Admin is in standby mode.';
      console.log('[Firebase Admin] Standby mode: Push notifications will be stored in-app; FCM push will activate when service account credentials are provided.');
      return false;
    }
  } catch (err: any) {
    initializationError = err.message || 'Unknown initialization error';
    console.warn('[Firebase Admin] Initialization notice:', err.message);
    return false;
  }
}

export function isFirebaseAdminConfigured(): boolean {
  if (!isInitialized) {
    return initializeFirebaseAdmin();
  }
  return isInitialized;
}

export function getFirebaseAdminStatus() {
  return {
    ready: isInitialized,
    projectId: FIREBASE_PROJECT_ID,
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || null,
    error: initializationError,
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  url?: string;
  badge?: number;
}

/**
 * Sends FCM push notification to all registered tokens belonging to a user.
 * Automatically cleans up expired or invalid tokens.
 */
export async function sendPushToUser(
  userId: number,
  payload: PushNotificationPayload
): Promise<{ success: number; failure: number }> {
  if (!isFirebaseAdminConfigured() || !appInstance) {
    return { success: 0, failure: 0 };
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, token, device_type FROM fcm_tokens WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return { success: 0, failure: 0 };
    }

    const tokens = rows.map((r) => r.token as string);
    const tokenIds = rows.map((r) => r.id as number);

    const messageData: Record<string, string> = {
      ...(payload.data || {}),
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      click_action: payload.url || '/',
    };

    const message: MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: messageData,
      webpush: {
        fcmOptions: {
          link: payload.url || '/',
        },
        notification: {
          title: payload.title,
          body: payload.body,
          icon: '/logo.png',
          badge: '/logo.png',
          requireInteraction: true,
          silent: false,
          actions: [
            {
              action: 'open',
              title: 'View Details',
            },
          ],
        },
        headers: {
          Urgency: 'high',
        },
      },
      android: {
        priority: 'high',
        notification: {
          title: payload.title,
          body: payload.body,
          sound: 'default',
          channelId: 'daktar_serial_bookings',
        },
      },
    };

    const messaging = getMessaging(appInstance);
    const response = await messaging.sendEachForMulticast(message);

    let successCount = response.successCount;
    let failureCount = response.failureCount;

    // Prune invalid or expired tokens
    const tokensToRemove: number[] = [];
    response.responses.forEach((resp, index) => {
      if (!resp.success && resp.error) {
        const errCode = resp.error.code;
        if (
          errCode === 'messaging/registration-token-not-registered' ||
          errCode === 'messaging/invalid-registration-token' ||
          resp.error.message?.includes('not registered')
        ) {
          tokensToRemove.push(tokenIds[index]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      const placeholders = tokensToRemove.map(() => '?').join(',');
      await pool.execute(`DELETE FROM fcm_tokens WHERE id IN (${placeholders})`, tokensToRemove);
      console.log(`[Firebase Admin] Cleaned up ${tokensToRemove.length} invalid/expired FCM tokens.`);
    }

    return { success: successCount, failure: failureCount };
  } catch (err: any) {
    console.warn('[Firebase Admin] Error dispatching multicast push:', err.message);
    return { success: 0, failure: 0 };
  }
}
