// Unwind & Doodle Service Worker
// Self-unregisters any legacy service workers on localhost

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration
      .unregister()
      .then(() => self.clients.matchAll())
      .then((clients) => {
        clients.forEach((client) => {
          if (client.url && 'navigate' in client) {
            // Unregistered cleanly
          }
        });
      })
  );
});
