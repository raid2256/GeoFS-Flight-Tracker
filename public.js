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

// Load Active Flights (Public)
db.ref("flights").on("value", snap => {
  const list = document.getElementById("publicFlightList");
  list.innerHTML = "";
  const now = Date.now();
  const flights = snap.val() || {};

  Object.entries(flights).forEach(([id, f]) => {
    if (f.completed) return;

    const sched = new Date(f.schedDep).getTime();
    const eta = new Date(f.eta).getTime();
    const start = f.timestamp || sched;
    const progress = Math.min(100, Math.max(0, ((now - sched) / (eta - sched)) * 100));
    const elapsed = Math.round((progress / 100) * (eta - sched) / 60000);

    let status;
    if (start > sched) status = "🔴 Delayed Departure";
    else if (now > eta) status = "🟡 Arriving Late";
    else status = "🟢 On Time";

    const div = document.createElement("div");
    div.className = "flightCard";
    div.innerHTML = `
      <strong>${f.callsign}</strong> | ${f.aircraft}<br>
      🛫 ${f.dep} → 🛬 ${f.arr}<br>
      🕓 ${elapsed} min in flight<br>
      Progress: ${progress.toFixed(0)}%<br>
      Status: ${status}
    `;

    list.appendChild(div);
  });
});