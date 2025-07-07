const firebaseConfig = {
  apiKey: "AIzaSyATDhuV86g9Pa0r6remuusjO1-QLHWhEEI",
  authDomain: "geofs-radar-f163b.firebaseapp.com",
  databaseURL: "https://geofs-radar-f163b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "geofs-radar-f163b",
  storageBucket: "geofs-radar-f163b.appspot.com",
  messagingSenderId: "218546405445",
  appId: "1:218546405445:web:9e1c4854f9bbb55764e32c"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

loginBtn.onclick = () => {
  firebase.auth().signInWithEmailAndPassword(email.value, password.value)
    .catch(err => alert("Login Error: " + err.message));
};

signupBtn.onclick = () => {
  const uname = username.value.trim();
  firebase.auth().createUserWithEmailAndPassword(email.value, password.value)
    .then(cred => db.ref("users/" + cred.user.uid).set({ username: uname }))
    .then(() => alert("Signup successful"))
    .catch(err => alert("Signup Error: " + err.message));
};

firebase.auth().onAuthStateChanged(user => {
  const form = document.getElementById("flightForm");
  const actList = document.getElementById("activeFlights");
  const schedList = document.getElementById("scheduledFlights");

  if (!user) {
    form.style.display = "none";
    actList.innerHTML = "🔒 Sign in to view flights.";
    schedList.innerHTML = "";
    userInfo.textContent = "";
    return;
  }

  db.ref("users/" + user.uid + "/username").once("value").then(snap => {
    const uname = snap.val() || "Pilot";
    userInfo.innerHTML = `👤 Welcome, <strong>${uname}</strong><br>${user.email}`;
  });

  form.style.display = "block";

  form.onsubmit = e => {
    e.preventDefault();
    const sched = new Date(schedDep.value).toISOString();
    const duration = parseInt(durationMin.value);
    const id = "FLT_" + Date.now();
    const flight = {
      callsign: callsign.value,
      aircraft: aircraft.value,
      dep: dep.value.toUpperCase(),
      arr: arr.value.toUpperCase(),
      schedDep: sched,
      durationMin: duration,
      uid: user.uid,
      started: false,
      completed: false
    };
    db.ref("flights/" + id).set(flight);
    form.reset();
  };

  db.ref("flights").on("value", snap => {
    actList.innerHTML = "<h2 style='text-align:center;'>🛬 Active Flights</h2>";
    schedList.innerHTML = "<h2 style='text-align:center;'>📅 Scheduled Flights</h2>";
    const flights = snap.val() || {};
    const now = Date.now();

    Object.entries(flights).forEach(([id, f]) => {
      if (f.completed) return;

      db.ref("users/" + f.uid + "/username").once("value").then(uSnap => {
        const pilot = uSnap.val() || "Unknown";
        const sched = new Date(f.schedDep).getTime();
        const start = f.actualStart || sched;
        const eta = f.eta || (f.actualStart ? f.actualStart + f.durationMin * 60000 : null);
        const isMine = f.uid === user.uid;

        const card = document.createElement("div");
        card.className = "flightCard";

        if (!f.started) {
          const timeUntil = Math.round((sched - now) / 60000);
          card.innerHTML = `
            👤 Pilot: <strong>${pilot}</strong><br>
            <strong>${f.callsign}</strong> | ${f.aircraft}<br>
            🛫 ${f.dep} → 🛬 ${f.arr}<br>
            Scheduled Departure: ${formatTime(sched)}<br>
            Duration: ${f.durationMin} min<br>
            Status: 🕒 Scheduled, ${timeUntil > 0 ? `in ${timeUntil} min` : "ready to start"}
          `;

          if (isMine) {
            const startBtn = document.createElement("button");
            startBtn.textContent = "✅ Start Flight";
            startBtn.onclick = () => {
              const actualStart = Date.now();
              const newEta = actualStart + f.durationMin * 60000;
              db.ref("flights/" + id).update({
                started: true,
                actualStart,
                eta: newEta
              });
            };
            card.appendChild(startBtn);
          }

          if (timeUntil >= 1440) schedList.appendChild(card); // 24h in minutes
        } else {
          const pct = Math.min(100, Math.max(0, ((now - start) / (eta - start)) * 100));
          const elapsed = Math.round((pct / 100) * (eta - start) / 60000);
          let status = now > eta ? "🟡 Arriving Late" : "🟢 On Time";
          if (start > sched) status = "🔴 Delayed Departure";

          card.innerHTML = `
            👤 Pilot: <strong>${pilot}</strong><br>
            <strong>${f.callsign}</strong> | ${f.aircraft}<br>
            🛫 ${f.dep} → 🛬 ${f.arr}<br>
            Scheduled: <s>${formatTime(sched)} → ${formatTime(sched + f.durationMin * 60000)}</s><br>
            Actual: ${formatTime(start)} → ${formatTime(eta)}
            <div class="progressContainer">
              <div class="progressLabel">🕓 ${elapsed} min in flight</div>
              <div class="progressBar">
                <div class="progressFill" style="width: ${pct.toFixed(0)}%;"></div>
              </div>
            </div>
            Status: ${status}
          `;

          if (isMine) {
            const endBtn = document.createElement("button");
            endBtn.textContent = "✅ End Flight";
            endBtn.onclick = () => {
              const endTime = Date.now();
              const delay = start > sched ? start - sched : 0;
              const duration = endTime - start;

              alert(`🧾 Flight Summary:
Callsign: ${f.callsign}
Aircraft: ${f.aircraft}
Pilot: ${pilot}
Route: ${f.dep} → ${f.arr}
Status: ${status}
Flight Duration: ${(duration / 60000).toFixed(0)} min
Delay: ${delay > 0 ? "+" + (delay / 60000).toFixed(0) + " min" : "None"}`);

              db.ref("flights/" + id).update({
                completed: true,
                endTime
              });
            };
            card.appendChild(endBtn);
          }

          actList.appendChild(card);
        }
      });
    });
  });
});
