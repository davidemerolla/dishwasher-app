self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open('dishwasher-store').then((cache) => cache.addAll([
            './index.html',
            './style.css',
            './app.js'
        ]))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
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
            // se non è JSON, ignoriamo e usiamo i default
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

// (Opzionale) click sulla notifica → apri l'app
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
