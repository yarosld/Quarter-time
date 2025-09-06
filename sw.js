/**
 * Service Worker для Fractal Planner PWA
 * Реалізує offline-first підхід згідно з ТЗ
 */

const CACHE_NAME = 'fractal-planner-v1.0.0';
const STATIC_CACHE_NAME = 'fractal-planner-static-v1';
const DYNAMIC_CACHE_NAME = 'fractal-planner-dynamic-v1';

// Файли для кешування (App Shell)
const STATIC_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json'
];

// Встановлення Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                console.log('Caching app shell');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                // Форсуємо активацію нового SW
                return self.skipWaiting();
            })
    );
});

// Активація Service Worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        // Очищаємо старі кеші
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE_NAME && 
                            cacheName !== DYNAMIC_CACHE_NAME) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                // Берем контроль над всіма клієнтами
                return self.clients.claim();
            })
    );
});

// Обробка запитів (fetch)
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);
    
    // Стратегія для статичних файлів: Cache First
    if (STATIC_FILES.some(file => requestUrl.pathname.endsWith(file.replace('/', '')))) {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    if (response) {
                        return response;
                    }
                    
                    return fetch(event.request)
                        .then((response) => {
                            // Кешуємо тільки успішні відповіді
                            if (response.status === 200) {
                                const responseClone = response.clone();
                                caches.open(STATIC_CACHE_NAME)
                                    .then((cache) => {
                                        cache.put(event.request, responseClone);
                                    });
                            }
                            return response;
                        });
                })
                .catch(() => {
                    // Fallback для HTML - повертаємо index.html
                    if (event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('/index.html');
                    }
                })
        );
        return;
    }
    
    // Стратегія для API запитів: Network First з fallback до кешу
    if (requestUrl.origin === location.origin && 
        (requestUrl.pathname.includes('/api/') || 
         requestUrl.pathname.includes('calendar'))) {
        
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Кешуємо GET запити
                    if (event.request.method === 'GET' && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseClone);
                            });
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback до кешу при офлайн
                    return caches.match(event.request);
                })
        );
        return;
    }
    
    // Для всіх інших запитів: Network First
    event.respondWith(
        fetch(event.request)
            .catch(() => {
                return caches.match(event.request);
            })
    );
});

// Background Sync для outbox обробки
self.addEventListener('sync', (event) => {
    console.log('Background sync triggered:', event.tag);
    
    if (event.tag === 'background-sync-tasks') {
        event.waitUntil(
            processOutbox()
                .then(() => {
                    console.log('Outbox processed successfully');
                })
                .catch((error) => {
                    console.error('Outbox processing failed:', error);
                    // При помилці - спробуємо ще раз
                    throw error;
                })
        );
    }
});

// Обробка push повідомлень (для майбутніх нотифікацій)
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'Task reminder',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzI3NEM0RSI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOSIgZmlsbD0iIzkzOTM5QyI+PC9nPjwvc3ZnPg==',
        badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzI3NEM0RSI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOSIgZmlsbD0iIzkzOTM5QyI+PC9nPjwvc3ZnPg==',
        tag: 'task-reminder',
        requireInteraction: true,
        actions: [
            {
                action: 'open',
                title: 'Open Fractal Planner'
            },
            {
                action: 'close',
                title: 'Dismiss'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Fractal Planner', options)
    );
});

// Обробка кліків по нотифікаціям
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'open') {
        event.waitUntil(
            clients.matchAll({ type: 'window' })
                .then((clientList) => {
                    // Перевіряємо чи є вже відкрита вкладка
                    for (let i = 0; i < clientList.length; i++) {
                        const client = clientList[i];
                        if (client.url.includes(self.location.origin) && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    
                    // Відкриваємо нову вкладку
                    if (clients.openWindow) {
                        return clients.openWindow('/');
                    }
                })
        );
    }
});

// Функція для обробки outbox (синхронізація завдань)
async function processOutbox() {
    try {
        // Відкриваємо IndexedDB
        const db = await openDatabase();
        const tx = db.transaction(['outbox'], 'readwrite');
        const store = tx.objectStore('outbox');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            
            request.onsuccess = async () => {
                const operations = request.result;
                
                if (operations.length === 0) {
                    resolve();
                    return;
                }
                
                console.log(`Processing ${operations.length} operations from outbox`);
                
                // Обробляємо операції послідовно
                for (const op of operations) {
                    try {
                        await processOperation(op);
                        
                        // Видаляємо успішно оброблену операцію
                        await store.delete(op.id);
                    } catch (error) {
                        console.error('Failed to process operation:', op, error);
                        
                        // Збільшуємо лічильник спроб
                        op.tries = (op.tries || 0) + 1;
                        
                        // Якщо забагато спроб - видаляємо або помічаємо як failed
                        if (op.tries >= 3) {
                            console.warn('Operation failed after 3 attempts, removing:', op);
                            await store.delete(op.id);
                        } else {
                            await store.put(op);
                        }
                    }
                }
                
                resolve();
            };
            
            request.onerror = () => reject(request.error);
        });
        
    } catch (error) {
        console.error('Error accessing outbox:', error);
        throw error;
    }
}

// Відкриваємо базу даних
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('fractal-planner-db', 1);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            
            if (!db.objectStoreNames.contains('tasks')) {
                db.createObjectStore('tasks', { keyPath: 'id' });
            }
            
            if (!db.objectStoreNames.contains('outbox')) {
                db.createObjectStore('outbox', { autoIncrement: true });
            }
            
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
        };
    });
}

// Обробляємо конкретну операцію (Google Calendar API)
async function processOperation(operation) {
    console.log('Processing operation:', operation.opType, operation.taskId);
    
    // Тут буде інтеграція з Google Calendar API
    // Поки що просто логуємо операцію
    
    const { opType, taskId, payload } = operation;
    
    // Симулюємо API виклик
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // У реальній реалізації тут буде:
    // - GET access token from storage
    // - Make API call to Google Calendar
    // - Handle errors and retries
    // - Update task.synced fields
    
    switch (opType) {
        case 'CREATE':
            console.log('Would create Google Calendar event for task:', taskId);
            break;
        case 'UPDATE':
            console.log('Would update Google Calendar event for task:', taskId);
            break;
        case 'DELETE':
            console.log('Would delete Google Calendar event for task:', taskId);
            break;
        default:
            throw new Error(`Unknown operation type: ${opType}`);
    }
}

// Допоміжна функція для логування
function log(message,