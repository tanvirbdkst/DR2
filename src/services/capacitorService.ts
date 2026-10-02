import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export function initializeCapacitor(onNavigate?: (path: string) => void): void {
  if (!Capacitor.isNativePlatform()) return;

  // 1. Configure Status Bar
  try {
    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setBackgroundColor({ color: '#0f172a' });
    StatusBar.setOverlaysWebView({ overlay: false });
  } catch (err) {
    console.warn('[Capacitor] StatusBar config warning:', err);
  }

  // 2. Hide Splash Screen cleanly after DOM mount
  try {
    setTimeout(() => {
      SplashScreen.hide({ fadeOutDuration: 300 });
    }, 500);
  } catch (err) {
    console.warn('[Capacitor] SplashScreen hide warning:', err);
  }

  // 3. Handle Deep Links (e.g. https://dakatarseial.bd/doctor/:slug)
  try {
    CapApp.addListener('appUrlOpen', (event) => {
      try {
        const urlObj = new URL(event.url);
        const path = urlObj.pathname + urlObj.search + urlObj.hash;
        if (onNavigate && path) {
          onNavigate(path);
        } else if (path) {
          window.location.href = path;
        }
      } catch (e) {
        console.error('[Capacitor] Error parsing deep link URL:', e);
      }
    });
  } catch (err) {
    console.warn('[Capacitor] AppUrlOpen listener warning:', err);
  }
}

/**
 * Register Android hardware back button handler
 */
export function setupBackButtonHandler(handler: () => boolean): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  const listenerPromise = CapApp.addListener('backButton', () => {
    const handled = handler();
    if (!handled) {
      // If handler returned false, minimize/exit app
      CapApp.exitApp();
    }
  });

  return () => {
    listenerPromise.then(handle => handle.remove()).catch(() => {});
  };
}
