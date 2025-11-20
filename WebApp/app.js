const housemates = [
    { id: 'me', name: 'Me', color: 'color-blue' },
    { id: 'sara', name: 'Sara', color: 'color-purple' },
    { id: 'cuto', name: 'Cuto', color: 'color-orange' }
];

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

function getPersonOnDuty(date) {
    const weekNumber = getWeekNumber(date);
    const day = date.getDay(); // 0=Sun, 1=Mon, ...

    // Rotation Offset based on week number
    const rotationOffset = weekNumber % 3;

    if (day === 0) { // Sunday
        // Sunday Rotation: Me -> Sara -> Cuto
        const index = rotationOffset % 3;
        return housemates[index];
    } else {
        // Mon-Sat Rotation
        let slotIndex = 0;
        if (day === 1 || day === 2) slotIndex = 0; // Mon, Tue
        else if (day === 3 || day === 4) slotIndex = 1; // Wed, Thu
        else if (day === 5 || day === 6) slotIndex = 2; // Fri, Sat

        // Logic: (SlotIndex - RotationOffset) % 3
        let personIndex = (slotIndex - rotationOffset + 3) % 3;
        return housemates[personIndex];
    }
}

function render() {
    const today = new Date();
    const person = getPersonOnDuty(today);

    // Render Today
    const todayEl = document.getElementById('today-person');
    todayEl.textContent = person.name;
    todayEl.className = `person-name ${person.color}`;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('today-date').textContent = today.toLocaleDateString('it-IT', options);

    // Render Week
    const weekList = document.getElementById('week-list');
    weekList.innerHTML = '';

    // Get start of week (Monday)
    const currentDay = today.getDay();
    const diff = today.getDate() - currentDay + (currentDay == 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);

        const p = getPersonOnDuty(d);

        const row = document.createElement('div');
        row.className = 'week-row';
        row.innerHTML = `
            <span class="day-name">${d.toLocaleDateString('it-IT', { weekday: 'long' })}</span>
            <span class="person-badge ${p.color}">${p.name}</span>
        `;
        weekList.appendChild(row);
    }
}

const BACKEND_URL = 'http://localhost:3000'; // poi lo cambi con l'URL pubblico del backend

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

    // prendo la public key dal backend
    const resp = await fetch(`${BACKEND_URL}/vapid-public-key`);
    const vapidPublicKey = await resp.text();

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
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    // Qui potresti far scegliere chi è il "proprietario" del telefono (me/sara/cuto)
    const housemateId = 'me';

    await fetch(`${BACKEND_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, housemateId })
    });

    alert('Notifiche attivate! Riceverai un promemoria quando è il tuo turno.');
}

// Bottone "Attiva Notifiche"
document.getElementById('notify-btn').addEventListener('click', () => {
    subscribeToPush().catch(err => {
        console.error(err);
        alert('Errore durante l\'attivazione delle notifiche.');
    });
});

render();

