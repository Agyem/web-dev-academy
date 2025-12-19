// Service Worker for Offline Support
// This service worker enables offline functionality by caching assets and API responses

const CACHE_NAME = 'wda-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/scripts/main.js',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Claim clients immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle API requests with network-first strategy
  if (request.url.includes('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }
  
  // Handle static assets with cache-first strategy
  event.respondWith(cacheFirstStrategy(request));
});

/**
 * Cache-first strategy: Try cache first, fallback to network
 * Best for static assets that don't change frequently
 */
async function cacheFirstStrategy(request) {
  try {
    const cached = await caches.match(request);
    
    if (cached) {
      console.log('Cache hit:', request.url);
      return cached;
    }
    
    console.log('Cache miss, fetching from network:', request.url);
    const response = await fetch(request);
    
    // Cache successful responses
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('Fetch failed:', error);
    
    // Return offline fallback page if available
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }
    
    return new Response('Offline - Page not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    });
  }
}

/**
 * Network-first strategy: Try network first, fallback to cache
 * Best for API requests that need fresh data
 */
async function networkFirstStrategy(request) {
  try {
    console.log('Attempting network request:', request.url);
    const response = await fetch(request);
    
    // Cache successful responses
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('Network request failed:', error);
    
    // Fallback to cached response
    const cached = await caches.match(request);
    if (cached) {
      console.log('Using cached response for:', request.url);
      return cached;
    }
    
    // Return error response
    return new Response(
      JSON.stringify({
        error: 'Network request failed. Please check your connection.',
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      }
    );
  }
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLIENTS_CLAIM') {
    self.clients.claim();
  }
});

// Background sync (optional - for queuing requests while offline)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncPendingData());
  }
});

/**
 * Sync pending data when connection is restored
 */
async function syncPendingData() {
  try {
    console.log('Syncing pending data...');
    // Implement your sync logic here
    // This might involve sending queued API requests, etc.
  } catch (error) {
    console.error('Error syncing data:', error);
  }
}

// Periodic background sync (optional - requires manifest.json permissions)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-content') {
    event.waitUntil(updateContent());
  }
});

/**
 * Update content periodically when possible
 */
async function updateContent() {
  try {
    console.log('Updating content periodically...');
    // Implement your periodic update logic here
  } catch (error) {
    console.error('Error updating content:', error);
  }
}
