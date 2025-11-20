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

// --- Logica turni: ciclo di 3 settimane ---
// Settimana A (questa):
//   lun-mar Cuto, mer-gio Me, ven-sab Sara, dom Cuto
// Settimana B (prossima):
//   lun-mar Me, mer-gio Sara, ven-sab Cuto, dom Me
// Settimana C (dopo):
//   lun-mar Sara, mer-gio Cuto, ven-sab Me, dom Sara
// poi si ricomincia da A.
//
// Ancoriamo il ciclo a lunedì 17/11/2025 (settimana A).
const housemates = [
    { id: 'me', name: 'Davide' },
    { id: 'sara', name: 'Sara' },
    { id: 'cuto', name: 'Cuto' }
];

const CYCLE_START = new Date(2025, 10, 17); // 17 novembre 2025 (mesi 0-based)

// Restituisce il lunedì della settimana di una certa data
function getWeekStartMonday(d) {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = date.getDay(); // 0=Dom, 1=Lun, ... 6=Sab
    const diff = (day + 6) % 7; // giorni passati da lunedì
    date.setDate(date.getDate() - diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

// 0 = settimana A, 1 = settimana B, 2 = settimana C
function getCycleWeekIndex(date) {
    const weekStart = getWeekStartMonday(date);
    const startWeek = getWeekStartMonday(CYCLE_START);
    const diffMs = weekStart - startWeek;
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    return ((diffWeeks % 3) + 3) % 3; // normalizza a 0,1,2 anche se diffWeeks < 0
}

function getPersonOnDuty(date) {
    const cycleWeek = getCycleWeekIndex(date);
    const day = date.getDay(); // 0=Dom, 1=Lun, ... 6=Sab
    let personId;

    if (cycleWeek === 0) {
        // Settimana A: lun-mar Cuto, mer-gio Me, ven-sab Sara, dom Cuto
        if (day === 0) { // dom
            personId = 'cuto';
        } else if (day === 1 || day === 2) { // lun, mar
            personId = 'cuto';
        } else if (day === 3 || day === 4) { // mer, gio
            personId = 'me';
        } else if (day === 5 || day === 6) { // ven, sab
            personId = 'sara';
        }
    } else if (cycleWeek === 1) {
        // Settimana B: lun-mar Me, mer-gio Sara, ven-sab Cuto, dom Me
        if (day === 0) {
            personId = 'me';
        } else if (day === 1 || day === 2) {
            personId = 'me';
        } else if (day === 3 || day === 4) {
            personId = 'sara';
        } else if (day === 5 || day === 6) {
            personId = 'cuto';
        }
    } else {
        // Settimana C: lun-mar Sara, mer-gio Cuto, ven-sab Me, dom Sara
        if (day === 0) {
            personId = 'sara';
        } else if (day === 1 || day === 2) {
            personId = 'sara';
        } else if (day === 3 || day === 4) {
            personId = 'cuto';
        } else if (day === 5 || day === 6) {
            personId = 'me';
        }
    }

    return housemates.find((h) => h.id === personId);
}

// Endpoint chiamato ogni giorno alle 9:00 (da cron / scheduler)
app.post('/send-daily', async (req, res) => {
    try {
        const now = new Date();
        const p = getPersonOnDuty(now);

        if (!p) {
            console.error('Nessuna persona trovata per la data', now);
            return res.status(500).json({ ok: false, error: 'No personOnDuty' });
        }

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
