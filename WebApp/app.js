const housemates = [
    { id: 'me', name: 'Davide', color: 'color-blue', icon: '🧑🏻‍🦱' },
    { id: 'sara', name: 'Sara', color: 'color-purple', icon: '🧑🏻‍🦰' },
    { id: 'cuto', name: 'Cuto', color: 'color-orange', icon: '🧔🏻' }
];

// --- Rotazione turni: ciclo di 3 settimane ---
// A: lun-mar Cuto, mer-gio Davide, ven-sab Sara, dom Cuto
// B: lun-mar Davide, mer-gio Sara, ven-sab Cuto, dom Davide
// C: lun-mar Sara, mer-gio Cuto, ven-sab Davide, dom Sara
// ancora di riferimento: lun 17/11/2025 (settimana A)
const CYCLE_START = new Date(2025, 10, 17); // 10 = novembre (0-based)

// lunedì della settimana della data
function getWeekStartMonday(d) {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = date.getDay(); // 0=Dom, 1=Lun, ... 6=Sab
    const diff = (day + 6) % 7;
    date.setDate(date.getDate() - diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

// 0 = A, 1 = B, 2 = C
function getCycleWeekIndex(date) {
    const weekStart = getWeekStartMonday(date);
    const startWeek = getWeekStartMonday(CYCLE_START);
    const diffMs = weekStart - startWeek;
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    return ((diffWeeks % 3) + 3) % 3;
}

function getPersonOnDuty(date) {
    const cycleWeek = getCycleWeekIndex(date);
    const day = date.getDay(); // 0=Dom, 1=Lun, ... 6=Sab
    let personId;

    if (cycleWeek === 0) {
        // Settimana A
        if (day === 0) {
            personId = 'cuto';
        } else if (day === 1 || day === 2) {
            personId = 'cuto';
        } else if (day === 3 || day === 4) {
            personId = 'me';
        } else if (day === 5 || day === 6) {
            personId = 'sara';
        }
    } else if (cycleWeek === 1) {
        // Settimana B
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
        // Settimana C
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

function render() {
    const today = new Date();
    const person = getPersonOnDuty(today);

    // Oggi
    const todayEl = document.getElementById('today-person');
    todayEl.className = `person-name ${person ? person.color : ''}`;
    todayEl.innerHTML = person
        ? `<span class="today-icon">${person.icon}</span><span>${person.name}</span>`
        : '-';

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('today-date').textContent =
        today.toLocaleDateString('it-IT', options);

    // Settimana
    const weekList = document.getElementById('week-list');
    weekList.innerHTML = '';

    const currentDay = today.getDay();
    const monday = new Date(today);
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    monday.setDate(diff);

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);

        const p = getPersonOnDuty(d);

        const row = document.createElement('div');
        row.className = 'week-row';
        row.innerHTML = `
            <span class="day-name">
                ${d.toLocaleDateString('it-IT', { weekday: 'long' })}
            </span>
            <span class="person-badge ${p ? p.color : ''}">
                ${p ? `<span class="badge-icon">${p.icon}</span>${p.name}` : '-'}
            </span>
        `;
        weekList.appendChild(row);
    }
}

const BACKEND_URL = 'https://dishwasher-backend.onrender.com';
const VAPID_PUBLIC_KEY =
    'BPSA8f8GwVH51CE459nbw6l2Ntd_hxfMgHpoQ9-QFprku__W0gp7hocIuH1THWpdmdD7kTNV0PqggDgIN3sfHZg';

async function subscribeToPush() {
    if (!('serviceWorker' in navigator)) {
        alert('Service worker non supportato su questo browser.');
        return;
    }
    if (!('PushManager' in window)) {
        alert('Push notifications non supportate su questo dispositivo.');
        return;
    }
    if (!('Notification' in window)) {
        alert('Le notifiche non sono supportate.');
        return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        alert('Per favore abilita le notifiche per ricevere i promemoria.');
        return;
    }

    const reg = await navigator.serviceWorker.ready;

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    const housemateId = 'me';

    await fetch(`${BACKEND_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, housemateId })
    });

    alert('Notifiche attivate! Riceverai un promemoria quando è il tuo turno.');
}

document.getElementById('notify-btn').addEventListener('click', () => {
    subscribeToPush().catch((err) => {
        console.error(err);
        alert('Errore durante l\'attivazione delle notifiche.');
    });
});

render();
