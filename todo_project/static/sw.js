// static/sw.js - Service Worker for PWA Support

const CACHE_NAME = 'todo-app-v1';
const urlsToCache = [
    '/',
    '/static/css/theme.css',
    '/static/css/components.css',
    '/static/css/auth.css',
    '/static/css/styles.css',
    '/static/js/utils.js',
    '/static/js/api.js',
    '/static/js/auth.js',
    '/static/js/ui.js',
    '/static/js/todos.js',
    '/static/js/charts.js',
    '/static/js/app.js',
    '/static/index.html',
    '/static/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Failed to cache:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip API requests - always fetch from network
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // Return a custom offline response for API requests
                    return new Response(
                        JSON.stringify({ error: 'Offline - Please check your connection' }),
                        {
                            headers: { 'Content-Type': 'application/json' },
                            status: 503
                        }
                    );
                })
        );
        return;
    }
    
    // For everything else, try cache first, then network
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                
                // Clone the request
                const fetchRequest = event.request.clone();
                
                return fetch(fetchRequest).then(response => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clone the response
                    const responseToCache = response.clone();
                    
                    // Cache the response for future use
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
            .catch(() => {
                // Offline fallback
                if (event.request.destination === 'document') {
                    return caches.match('/');
                }
            })
    );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
    if (event.tag === 'sync-todos') {
        event.waitUntil(syncTodos());
    }
});

// Push notifications
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/static/assets/icons/icon-192.png',
            badge: '/static/assets/icons/badge-72.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: 1
            },
            actions: [
                {
                    action: 'view',
                    title: 'View Task',
                    icon: '/static/assets/icons/view.png'
                },
                {
                    action: 'close',
                    title: 'Close',
                    icon: '/static/assets/icons/close.png'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'view') {
        // Open the app and navigate to the specific task
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Helper function to sync todos when back online
async function syncTodos() {
    // This would implement the logic to sync offline changes
    // with the server when connection is restored
    console.log('Syncing todos...');
    
    try {
        // Get pending changes from IndexedDB
        // Send them to the server
        // Update local cache
        
        return Promise.resolve();
    } catch (error) {
        console.error('Sync failed:', error);
        return Promise.reject(error);
    }
}