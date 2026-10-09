import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

// Firebase configuration from environment variables
// Note: dr-serial-721ba is the designated Firebase Project ID
export const firebaseWebConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dr-serial-721ba'}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dr-serial-721ba',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dr-serial-721ba'}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const publicVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export function isFirebaseWebConfigured(): boolean {
  return Boolean(
    firebaseWebConfig.apiKey &&
    firebaseWebConfig.projectId &&
    firebaseWebConfig.appId
  );
}

let appInstance: FirebaseApp | null = null;

export function getFirebaseWebApp(): FirebaseApp | null {
  if (!isFirebaseWebConfigured()) {
    return null;
  }

  if (!appInstance) {
    if (getApps().length > 0) {
      appInstance = getApp();
    } else {
      appInstance = initializeApp(firebaseWebConfig);
    }
  }

  return appInstance;
}

let messagingPromise: Promise<Messaging | null> | null = null;

export async function getFirebaseWebMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;

  if (!messagingPromise) {
    messagingPromise = (async () => {
      try {
        const supported = await isSupported();
        if (!supported) {
          console.warn('[FCM Web] Firebase Messaging is not supported in this browser.');
          return null;
        }

        const app = getFirebaseWebApp();
        if (!app) return null;

        return getMessaging(app);
      } catch (err) {
        console.warn('[FCM Web] Failed initializing Firebase Messaging:', err);
        return null;
      }
    })();
  }

  return messagingPromise;
}
