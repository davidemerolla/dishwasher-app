const express = require('express');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors()); // permette richieste da Netlify / altri domini

// 🔑 VAPID KEYS (quelle che mi hai dato; poi puoi cambiarle)
const VAPID_PUBLIC_KEY =
    'BPSA8f8GwVH51CE459nbw6l2Ntd_hxfMgHpoQ9-QFprku__W0gp7hocIuH1THWpdmdD7kTNV0PqggDgIN3sfHZg';
const VAPID_PRIVATE_KEY =
    'WHYYHH0DmBDhRZfKT2aHgX4ZYpZaCBDCNMynmoeNbGM';

webpush.setVapidDetails(
    'mailto:tuamail@example.com', // cambia con la tua mail se vuoi
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

// Per demo: in memoria. In produzione -> DB.
const subscriptions = []; // { subscription, housemateId }

// Espone la public key al frontend
app.get('/vapid-public-key', (req, res) => {
    res.send(VAPID_PUBLIC_KEY);
});

// Salva la subscription inviata dal browser
app.post('/subscribe', (req, res) => {
    const { subscription, housemateId } = req.body;

    const exists = subscriptions.find(
        (s) => JSON.stringify(s.subscription) === JSON.stringify(subscription)
    );
    if (!exists) {
        subscriptions.push({ subscription, housemateId });
        console.log('Nuova subscription:', housemateId);
    }

    res.status(201).json({ ok: true });
});

// --- Logica turni (basata sulla tua app JS) ---

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

const housemates = [
    { id: 'me', name: 'Me' },
    { id: 'sara', name: 'Sara' },
    { id: 'cuto', name: 'Cuto' }
];

function getPersonOnDuty(date) {
    const weekNumber = getWeekNumber(date);
    const day = date.getDay(); // 0=Sun, 1=Mon, ...

    const rotationOffset = weekNumber % housemates.length;

    if (day === 0) {
        // Domenica: in base alla rotazione
        return housemates[rotationOffset];
    }

    let slotIndex = 0;
    if (day === 1 || day === 2) slotIndex = 0;        // lun, mar
    else if (day === 3 || day === 4) slotIndex = 1;   // mer, gio
    else if (day === 5 || day === 6) slotIndex = 2;   // ven, sab

    const personIndex =
        (slotIndex - rotationOffset + housemates.length) % housemates.length;
    return housemates[personIndex];
}

// Endpoint chiamato ogni giorno alle 9:00 (da cron / scheduler)
app.post('/send-daily', async (req, res) => {
    try {
        const now = new Date();
        const p = getPersonOnDuty(now);

        const payload = JSON.stringify({
            title: 'Turni lavastoviglie',
            body: `Oggi ${p.name} è il tuo turno`
        });

        const sendAll = subscriptions.map(({ subscription }) =>
            webpush.sendNotification(subscription, payload).catch((err) => {
                console.error('Errore push', err);
            })
        );

        await Promise.all(sendAll);

        res.json({ ok: true, sent: subscriptions.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Backend listening on port', PORT);
});
