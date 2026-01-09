const CACHE_NAME = 'vs-planner-v2';
const STATIC_ASSETS = [
  '/manifest.json',
  '/creatorhub-vs-icon-32.svg',
  '/creatorhub-vs-header.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Skip non-http(s) schemes like chrome-extension://
  if (!url.protocol.startsWith('http')) return;
  
  // Skip caching for development - always fetch fresh content for HTML and JS
  if (url.pathname === '/' || 
      url.pathname.endsWith('.html') || 
      url.pathname.startsWith('/src/') ||
      url.pathname.includes('node_modules')) {
    return; // Let the browser handle it normally
  }
  
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Only cache static assets
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'Ny oppdatering i Virtual Studio',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Vis' },
      { action: 'close', title: 'Lukk' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Virtual Studio', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-shots') {
    event.waitUntil(syncShots());
  }
});

async function syncShots() {
  const cache = await caches.open(CACHE_NAME);
  const pendingRequests = await cache.match('/pending-sync');
  
  if (pendingRequests) {
    const requests = await pendingRequests.json();
    for (const req of requests) {
      try {
        await fetch(req.url, {
          method: req.method,
          headers: req.headers,
          body: req.body
        });
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
    await cache.delete('/pending-sync');
  }
}
