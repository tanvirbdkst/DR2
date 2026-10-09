/**
 * Daktar Serial - Firebase Cloud Messaging Service Worker
 * Handles background push notifications and notification click interactions.
 */

/* eslint-disable no-undef */

// 1. Background push event listener
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    
    // Support both raw FCM webpush format and standard notification payload
    const notification = payload.notification || {};
    const data = payload.data || {};

    const title = notification.title || data.title || 'Daktar Serial';
    const body = notification.body || data.body || 'You have a new appointment update.';
    const icon = notification.icon || data.icon || '/logo.png';
    const badge = notification.badge || data.badge || '/logo.png';
    const targetUrl = data.url || data.click_action || notification.click_action || '/';

    const options = {
      body,
      icon,
      badge,
      data: {
        url: targetUrl,
        ...data,
      },
      tag: data.appointmentId || data.notificationId || 'daktar-serial-notif',
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'open',
          title: 'Open Dashboard',
        },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    // If not JSON, handle as plain text
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Daktar Serial', {
        body: text,
        icon: '/logo.png',
        data: { url: '/' },
      })
    );
  }
});

// 2. Notification click event listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // If no window is open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 3. Service Worker activation
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
