const firebaseConfig = {
  apiKey: "AIzaSyATDhuV86g9Pa0r6remuusjO1-QLHWhEEI",
  authDomain: "geofs-radar-f163b.firebaseapp.com",
  databaseURL: "https://geofs-radar-f163b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "geofs-radar-f163b",
  storageBucket: "geofs-radar-f163b.firebasestorage.app",
  messagingSenderId: "218546405445",
  appId: "1:218546405445:web:9e1c4854f9bbb55764e32c"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Handle form submission
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

// Load flights
db.ref("flights").on("value", snap => {
  flightList.innerHTML = "";
  const now = Date.now();
  Object.entries(snap.val() || {}).forEach(([id, f]) => {
    const dep = new Date(f.schedDep).getTime();
    const eta = new Date(f.eta).getTime();
    const progress = Math.min(100, Math.max(0, ((now - dep) / (eta - dep)) * 100));
    const delay = now > eta ? "🔴 Delayed" : "🟢 On-Time";

    const div = document.createElement("div");
    div.className = "flightCard";
    div.innerHTML = `
      <strong>${f.callsign}</strong> | ${f.aircraft}<br>
      🛫 ${f.dep} → 🛬 ${f.arr}<br>
      Progress: ${progress.toFixed(0)}%<br>
      Status: ${delay}
    `;
    flightList.appendChild(div);
  });
});
