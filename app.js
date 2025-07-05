// Firebase Config
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

// Handle Flight Submission
document.getElementById("flightForm").addEventListener("submit", e => {
  e.preventDefault();
  const data = {
    callsign: callsign.value,
    aircraft: aircraft.value,
    dep: dep.value.toUpperCase(),
    arr: arr.value.toUpperCase(),
    schedDep: new Date(schedDep.value).toISOString(),
    eta: new Date(eta.value).toISOString(),
    timestamp: Date.now()
  };
  const id = "FLT_" + Date.now();
  db.ref("flights/" + id).set(data);
  flightForm.reset();
});

// Display Active Flights
db.ref("flights").on("value", snap => {
  flightList.innerHTML = "";
  const now = Date.now();
  const flights = snap.val() || {};

  Object.entries(flights).forEach(([id, f]) => {
    if (f.completed) return; // Hide completed flights

    const sched = new Date(f.schedDep).getTime();
    const eta = new Date(f.eta).getTime();
    const startTime = f.timestamp || sched;

    const progress = Math.min(100, Math.max(0, ((now - sched) / (eta - sched)) * 100));

    // Flight Status Logic
    let status;
    if (startTime > sched) {
      status = "🔴 Delayed Departure";
    } else if (now > eta) {
      status = "🟡 Arriving Late";
    } else {
      status = "🟢 On Time";
    }

    const div = document.createElement("div");
    div.className = "flightCard";
    div.innerHTML = `
      <strong>${f.callsign}</strong> | ${f.aircraft}<br>
      🛫 ${f.dep} → 🛬 ${f.arr}<br>
      Progress: ${progress.toFixed(0)}%<br>
      Status: ${status}
    `;

    const endBtn = document.createElement("button");
    endBtn.textContent = "✅ End Flight";
    endBtn.style.marginTop = "10px";
    endBtn.onclick = () => {
      db.ref("flights/" + id).update({
        completed: true,
        endTime: Date.now()
      });
    };
    div.appendChild(endBtn);

    flightList.appendChild(div);
  });
});
