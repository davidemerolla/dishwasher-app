const CACHE_NAME = 'dishwasher-store-v3';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            cache.addAll([
                './',
                './index.html',
                './style.css',
                './app.js',
                './manifest.json',
                './icon-192.png',
                './icon-512.png'
            ])
        )
    );
});

// pulizia cache vecchie
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then(
            (response) => response || fetch(event.request)
        )
    );
});

// Gestisce le push in arrivo dal backend
self.addEventListener('push', (event) => {
    let data = {
        title: 'Turni lavastoviglie',
        body: 'È il tuo turno!'
    };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            // se non è JSON, usiamo i default
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: 'icon-192.png',
            badge: 'icon-192.png'
        })
    );
});

// click sulla notifica → apri l'app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientsArr) => {
                const hadWindow = clientsArr.some((windowClient) => {
                    if (windowClient.url.includes('index.html')) {
                        windowClient.focus();
                        return true;
                    }
                    return false;
                });
                if (!hadWindow && clients.openWindow) {
                    return clients.openWindow('./index.html');
                }
            })
    );
});
