import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import {
  getFirebaseWebMessaging,
  publicVapidKey,
  isFirebaseWebConfigured,
} from '../config/firebase.js';
import {
  registerPushNotificationsSafely,
  requestNotificationPermission as requestNativePermission,
} from './notificationService.js';

const STORAGE_FCM_TOKEN_KEY = 'daktar_browser_fcm_token';

export type PermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Check current notification permission status in browser or native Capacitor.
 */
export function getPushPermissionStatus(): PermissionState {
  if (Capacitor.isNativePlatform()) {
    return 'default'; // Managed via Capacitor plugin
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  return Notification.permission as PermissionState;
}

/**
 * Sends registered FCM token to the Express backend to associate with current user.
 */
export async function sendTokenToBackend(token: string, deviceType = 'web'): Promise<boolean> {
  try {
    const res = await fetch('/api/notifications/register-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, deviceType }),
    });

    if (res.ok) {
      localStorage.setItem(STORAGE_FCM_TOKEN_KEY, token);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[Push] Error sending token to server:', err);
    return false;
  }
}

/**
 * Removes registered FCM token from backend.
 */
export async function removeTokenFromBackend(): Promise<boolean> {
  try {
    const token = localStorage.getItem(STORAGE_FCM_TOKEN_KEY);
    if (!token) return true;

    await fetch('/api/notifications/token', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    localStorage.removeItem(STORAGE_FCM_TOKEN_KEY);
    return true;
  } catch (err) {
    console.warn('[Push] Error removing token from server:', err);
    return false;
  }
}

/**
 * Requests push notification permission interactively (after user action)
 * and registers the device FCM token with the backend.
 */
export async function requestAndRegisterPush(): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  // 1. Native mobile app flow via Capacitor
  if (Capacitor.isNativePlatform()) {
    const granted = await requestNativePermission();
    if (!granted) {
      return { success: false, error: 'Push notification permission was not granted on device.' };
    }

    let resolvedToken = '';
    const registered = await registerPushNotificationsSafely({
      onTokenReceived: (token) => {
        resolvedToken = token;
        sendTokenToBackend(token, 'android');
      },
    });

    return { success: registered, token: resolvedToken };
  }

  // 2. Web browser flow
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { success: false, error: 'Notifications are not supported in this browser.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Browser notification permission was not allowed.' };
    }

    if (!isFirebaseWebConfigured()) {
      return {
        success: false,
        error: 'Firebase Web credentials are not yet configured in client environment (VITE_FIREBASE_*). In-app notifications are active.',
      };
    }

    const messaging = await getFirebaseWebMessaging();
    if (!messaging) {
      return { success: false, error: 'Firebase Messaging could not be initialized in this browser.' };
    }

    // Register service worker if not already registered
    let registration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
        });
        await navigator.serviceWorker.ready;
      } catch (swErr: any) {
        console.warn('[Push] Service worker registration warning:', swErr);
      }
    }

    // Retrieve FCM registration token
    const tokenOptions: { vapidKey?: string; serviceWorkerRegistration?: ServiceWorkerRegistration } = {};
    if (publicVapidKey) {
      tokenOptions.vapidKey = publicVapidKey;
    }
    if (registration) {
      tokenOptions.serviceWorkerRegistration = registration;
    }

    const token = await getToken(messaging, tokenOptions);
    if (!token) {
      return { success: false, error: 'Failed to retrieve FCM registration token from Firebase.' };
    }

    await sendTokenToBackend(token, 'web');

    return { success: true, token };
  } catch (err: any) {
    console.error('[Push] Registration error:', err);
    return { success: false, error: err.message || 'Failed to register push notifications.' };
  }
}

/**
 * Listens for foreground push messages when the web app is active.
 */
export async function listenForForegroundPush(
  onNotification: (payload: { title: string; body: string; data?: any }) => void
): Promise<(() => void) | null> {
  if (Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const messaging = await getFirebaseWebMessaging();
    if (!messaging) return null;

    const unsubscribe = onMessage(messaging, (payload) => {
      const title = payload.notification?.title || payload.data?.title || 'Daktar Serial';
      const body = payload.notification?.body || payload.data?.body || 'New notification';
      onNotification({
        title,
        body,
        data: payload.data,
      });
    });

    return unsubscribe;
  } catch (err) {
    console.warn('[Push] Error subscribing to foreground push:', err);
    return null;
  }
}
