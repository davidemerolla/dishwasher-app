const express = require('express');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// --- CORS ---
const corsOptions = {
    origin: '*', // se vuoi più stretto: ['https://fastidious-nasturtium-cd342d.netlify.app']
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight per tutte le rotte

// --- Body parser ---
app.use(bodyParser.json());

// --- VAPID KEYS (le tue fake, poi le cambi se vuoi) ---
const VAPID_PUBLIC_KEY =
    'BPSA8f8GwVH51CE459nbw6l2Ntd_hxfMgHpoQ9-QFprku__W0gp7hocIuH1THWpdmdD7kTNV0PqggDgIN3sfHZg';
const VAPID_PRIVATE_KEY =
    'WHYYHH0DmBDhRZfKT2aHgX4ZYpZaCBDCNMynmoeNbGM';

webpush.setVapidDetails(
    'mailto:tuamail@example.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

// per ora in memoria
const subscriptions = []; // { subscription, housemateId }

// (opzionale) endpoint per debug
app.get('/', (req, res) => {
    res.send('Dishwasher backend up 👍');
});

// --- SUBSCRIBE ---

app.post('/subscribe', (req, res) => {
    const { subscription, housemateId } = req.body || {};

    if (!subscription) {
        return res.status(400).json({ ok: false, error: 'Missing subscription' });
    }

    const exists = subscriptions.find(
        (s) => JSON.stringify(s.subscription) === JSON.stringify(subscription)
    );

    if (!exists) {
        subscriptions.push({ subscription, housemateId: housemateId || 'unknown' });
        console.log('Nuova subscription:', housemateId || 'unknown');
    }

    return res.status(201).json({ ok: true });
});

// --- LOGICA TURNI (stessa di frontend, ma senza icone/colori) ---

const CYCLE_START = new Date(2025, 10, 17); // 17 novembre 2025

function getWeekStartMonday(d) {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = date.getDay();
    const diff = (day + 6) % 7;
    date.setDate(date.getDate() - diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

function getCycleWeekIndex(date) {
    const weekStart = getWeekStartMonday(date);
    const startWeek = getWeekStartMonday(CYCLE_START);
    const diffMs = weekStart - startWeek;
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    return ((diffWeeks % 3) + 3) % 3;
}

const housemates = [
    { id: 'me', name: 'Davide' },
    { id: 'sara', name: 'Sara' },
    { id: 'cuto', name: 'Cuto' }
];

function getPersonOnDuty(date) {
    const cycleWeek = getCycleWeekIndex(date);
    const day = date.getDay();
    let personId;

    if (cycleWeek === 0) {
        if (day === 0) personId = 'cuto';
        else if (day === 1 || day === 2) personId = 'cuto';
        else if (day === 3 || day === 4) personId = 'me';
        else if (day === 5 || day === 6) personId = 'sara';
    } else if (cycleWeek === 1) {
        if (day === 0) personId = 'me';
        else if (day === 1 || day === 2) personId = 'me';
        else if (day === 3 || day === 4) personId = 'sara';
        else if (day === 5 || day === 6) personId = 'cuto';
    } else {
        if (day === 0) personId = 'sara';
        else if (day === 1 || day === 2) personId = 'sara';
        else if (day === 3 || day === 4) personId = 'cuto';
        else if (day === 5 || day === 6) personId = 'me';
    }

    return housemates.find((h) => h.id === personId);
}

// --- /send-daily ---

app.post('/send-daily', async (req, res) => {
    try {
        const now = new Date();
        const p = getPersonOnDuty(now) || { name: 'Qualcuno' };

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
        res.status(500).json({ ok: false, error: 'send-daily failed' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Backend listening on port', PORT);
});
