import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';

export interface PushNotificationCallback {
  onTokenReceived?: (token: string) => void;
  onNotificationReceived?: (notification: PushNotificationSchema) => void;
  onNotificationAction?: (notification: ActionPerformed) => void;
}

/**
 * Initializes Push Notifications for Android / iOS using FCM.
 * Safe to call on web (gracefully skips).
 */
export async function initializePushNotifications(callbacks?: PushNotificationCallback): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[Push] Permission not granted for push notifications.');
      return false;
    }

    // Register with Apple / Google for tokens
    await PushNotifications.register();

    // Listeners
    await PushNotifications.addListener('registration', (token: Token) => {
      console.log('[Push] Device registration token:', token.value);
      callbacks?.onTokenReceived?.(token.value);
      // Optional: Save to backend / local storage for doctor / patient alerts
      try {
        localStorage.setItem('daktar_fcm_token', token.value);
      } catch {}
    });

    await PushNotifications.addListener('registrationError', (err: any) => {
      console.error('[Push] Registration error:', err);
    });

    await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('[Push] Notification received in foreground:', notification);
      callbacks?.onNotificationReceived?.(notification);
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('[Push] Notification tapped/opened by user:', notification);
      callbacks?.onNotificationAction?.(notification);
    });

    return true;
  } catch (err) {
    console.error('[Push] Failed to initialize push notifications:', err);
    return false;
  }
}
