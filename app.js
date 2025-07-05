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

// Flight Submission
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

// Display Flights
db.ref("flights").on("value", snap => {
  flightList.innerHTML = "";
  pastFlightList.innerHTML = "";

  const now = Date.now();
  const flights = snap.val() || {};

  Object.entries(flights).forEach(([id, f]) => {
    const sched = new Date(f.schedDep).getTime();
    const eta = new Date(f.eta).getTime();
    const start = f.timestamp || sched;
    const end = f.endTime || null;
    const progress = Math.min(100, Math.max(0, ((now - sched) / (eta - sched)) * 100));

    // ⏱ Auto-expiry logic
    const ageSinceStart = now - start;
    const ageSinceEnd = end ? now - end : 0;
    const expired = (end && ageSinceEnd > 12 * 60 * 60 * 1000) || (!end && ageSinceStart > 28 * 60 * 60 * 1000);
    if (expired) return;

    // ✈ Status logic
    let status;
    if (start > sched) {
      status = "🔴 Delayed Departure";
    } else if (now > eta) {
      status = "🟡 Arriving Late";
    } else {
      status = "🟢 On Time";
    }

    // 📦 Create card
    const div = document.createElement("div");
    div.className = "flightCard";
    div.innerHTML = `
      <strong>${f.callsign}</strong> | ${f.aircraft}<br>
      🛫 ${f.dep} → 🛬 ${f.arr}<br>
      Progress: ${progress.toFixed(0)}%<br>
      Status: ${status}
    `;

    if (f.completed) {
      pastFlightList.appendChild(div);
    } else {
      // Add End Flight button
      const endBtn = document.createElement("button");
      endBtn.textContent = "✅ End Flight";
      endBtn.style.marginTop = "10px";
      endBtn.onclick = () => {
        const endTime = Date.now();
        const delay = start > sched ? start - sched : 0;
        const duration = endTime - start;

        alert(`🧾 Flight Summary:
Callsign: ${f.callsign}
Aircraft: ${f.aircraft}
Route: ${f.dep} → ${f.arr}
Status: ${status}
Flight Duration: ${(duration / 60000).toFixed(0)} min
Delay: ${delay > 0 ? "+" + (delay / 60000).toFixed(0) + " min" : "None"}`);

        db.ref("flights/" + id).update({
          completed: true,
          endTime
        });
      };

      div.appendChild(endBtn);
      flightList.appendChild(div);
    }
  });
});
