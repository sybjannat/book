// ======================================================
// Service Worker — Bengali Literature Critique PWA
// ======================================================

const CACHE_NAME = 'sahitya-pwa-v1';
const OFFLINE_PAGE = '/';

// Assets to pre-cache
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@300;400;500;600;700;800&family=Noto+Serif+Bengali:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap',
];

// Install — precache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Pre-cache failed (some assets may not be available offline):', err);
        // Don't fail the install if some resources fail
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
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

// Fetch — Network-first with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension requests
  if (request.method !== 'GET' || url.origin === 'chrome-extension://') return;

  // Google Fonts — Cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Supabase API — Network-only (never cache API calls)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(fetch(request));
    return;
  }

  // CDN scripts — Stale-while-revalidate
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Main app pages — Network-first with offline fallback
  event.respondWith(networkFirst(request, OFFLINE_PAGE));
});

// Cache-first strategy
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
    }
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

// Network-first strategy
async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.destination === 'document') {
      return caches.match(fallbackUrl);
    }
    return new Response('Offline — আপনি অফলাইন আছেন।', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

// Background sync for offline saves (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-books') {
    event.waitUntil(syncBooks());
  }
});

async function syncBooks() {
  // Placeholder for future offline queue sync
  console.log('[SW] Background sync triggered');
}

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'সাহিত্য সমালোচনা', {
    body: data.body || 'নতুন আপডেট পাওয়া গেছে।',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'sahitya-notification',
  });
});

console.log('[SW] সাহিত্য সমালোচনা PWA Service Worker loaded');
