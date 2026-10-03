import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';

export interface PushNotificationCallback {
  onTokenReceived?: (token: string) => void;
  onNotificationReceived?: (notification: PushNotificationSchema) => void;
  onNotificationAction?: (notification: ActionPerformed) => void;
  onError?: (error: any) => void;
}

/**
 * Checks current push notification permission status without prompting the user.
 */
export async function getNotificationPermissionStatus(): Promise<string> {
  if (!Capacitor.isNativePlatform()) {
    return 'unsupported';
  }
  try {
    const status = await PushNotifications.checkPermissions();
    return status.receive;
  } catch (err) {
    console.warn('[Push] Error checking permissions:', err);
    return 'denied';
  }
}

/**
 * Requests push notification permission interactively (when user opts in).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }
  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      permStatus = await PushNotifications.requestPermissions();
    }
    return permStatus.receive === 'granted';
  } catch (err) {
    console.warn('[Push] Error requesting notification permissions:', err);
    return false;
  }
}

/**
 * Safely registers push notifications with FCM.
 * Only attempts registration if permission is already granted.
 * Catches any native/Firebase exceptions gracefully without crashing the app.
 */
export async function registerPushNotificationsSafely(callbacks?: PushNotificationCallback): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const status = await PushNotifications.checkPermissions();
    if (status.receive !== 'granted') {
      console.log('[Push] Notification permission not granted. Skipping registration.');
      return false;
    }

    // Set up listeners first before registering
    await PushNotifications.addListener('registration', (token: Token) => {
      console.log('[Push] FCM Device registration token received:', token?.value ? 'Token present' : 'Empty');
      if (token?.value) {
        callbacks?.onTokenReceived?.(token.value);
        try {
          localStorage.setItem('daktar_fcm_token', token.value);
        } catch {}
      }
    });

    await PushNotifications.addListener('registrationError', (err: any) => {
      console.warn('[Push] FCM Registration note (Firebase configuration check):', err);
      callbacks?.onError?.(err);
    });

    await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('[Push] Notification received in foreground:', notification);
      callbacks?.onNotificationReceived?.(notification);
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('[Push] Notification opened by user:', notification);
      callbacks?.onNotificationAction?.(notification);
    });

    // Register with FCM/APNS safely
    await PushNotifications.register();
    return true;
  } catch (err) {
    console.warn('[Push] Safe push registration skipped (Firebase may not be configured):', err);
    callbacks?.onError?.(err);
    return false;
  }
}

/**
 * Initializes push notifications safely.
 * - Does NOT force popup permissions on first frame of startup.
 * - If user already granted permission, registers in the background safely.
 */
export async function initializePushNotifications(callbacks?: PushNotificationCallback): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const status = await PushNotifications.checkPermissions();
    if (status.receive === 'granted') {
      return await registerPushNotificationsSafely(callbacks);
    }
    return false;
  } catch (err) {
    console.warn('[Push] Notification initialization check skipped:', err);
    return false;
  }
}
