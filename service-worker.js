// LifeOS Service Worker - Cho phép cài app và cache offline
const CACHE_NAME = 'lifeos-v1';
const OFFLINE_URL = '/index.html';

// Files cần cache - dùng relative paths
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './style.css',
    './favicon.svg',
    './manifest.json'
];

// Install - Cache các file cơ bản
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 LifeOS: Caching app shell...');
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate - Xóa cache cũ
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ LifeOS: Xóa cache cũ:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Bỏ qua các request không phải GET
    if (event.request.method !== 'GET') return;

    // Bỏ qua các request đến Firebase và API
    if (event.request.url.includes('firebase') ||
        event.request.url.includes('googleapis') ||
        event.request.url.includes('gstatic')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache response mới
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Offline - lấy từ cache
                return caches.match(event.request).then((response) => {
                    if (response) return response;
                    // Fallback về trang chính
                    if (event.request.mode === 'navigate') {
                        return caches.match(OFFLINE_URL);
                    }
                });
            })
    );
});

console.log('🚀 LifeOS Service Worker loaded!');
