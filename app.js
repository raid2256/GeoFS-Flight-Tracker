// Initialize Firebase
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

// Sign in anonymously on load
firebase.auth().signInAnonymously().catch(console.error);

// Flight form handler
document.getElementById("flightForm").addEventListener("submit", async e => {
  e.preventDefault();

  const user = firebase.auth().currentUser;
  if (!user) return alert("Not signed in.");

  const data = {
    callsign: callsign.value,
    aircraft: aircraft.value,
    dep: dep.value.toUpperCase(),
    arr: arr.value.toUpperCase(),
    schedDep: new Date(schedDep.value).toISOString(),
    eta: new Date(eta.value).toISOString(),
    timestamp: Date.now(),
    uid: user.uid
  };

  const id = "FLT_" + Date.now();
  await db.ref("flights/" + id).set(data);
  flightForm.reset();
});

// Display active flights
db.ref("flights").on("value", snap => {
  flightList.innerHTML = "";
  const now = Date.now();
  const flights = snap.val() || {};
  const user = firebase.auth().currentUser;

  Object.entries(flights).forEach(([id, f]) => {
    if (f.completed) return;

    const sched = new Date(f.schedDep).getTime();
    const eta = new Date(f.eta).getTime();
    const start = f.timestamp || sched;
    const progress = Math.min(100, Math.max(0, ((now - sched) / (eta - sched)) * 100));

    // Status logic
    let status;
    if (start > sched) {
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

    // Only show "End Flight" to creator
    if (user && user.uid === f.uid) {
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
    }

    flightList.appendChild(div);
  });
});
