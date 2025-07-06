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
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  const list = document.getElementById("flightList");

  if (!user) {
    form.style.display = "none";
    list.innerHTML = "🔒 Please sign in to manage flights.";
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
    db.ref("flights/FLT_" + Date.now()).set(data);
    form.reset();
  };

  db.ref("flights").on("value", snap => {
    list.innerHTML = "";
    const now = Date.now();
    const flights = snap.val() || {};

    Object.entries(flights).forEach(([id, f]) => {
      if (f.completed) return;

      db.ref("users/" + f.uid + "/username").once("value").then(uSnap => {
        const pilot = uSnap.val() || "Unknown";
        const sched = new Date(f.schedDep).getTime();
        const eta = new Date(f.eta).getTime();
        const start = f.timestamp || sched;
        const progress = Math.min(100, Math.max(0, ((now - sched) / (eta - sched)) * 100));
        const elapsed = Math.round((progress / 100) * (eta - sched) / 60000);

        let status = "🟢 On Time";
        if (start > sched) status = "🔴 Delayed Departure";
        else if (now > eta) status = "🟡 Arriving Late";

        const div = document.createElement("div");
        div.className = "flightCard";
        div.innerHTML = `
          👤 Pilot: <strong>${pilot}</strong><br>
          <strong>${f.callsign}</strong> | ${f.aircraft}<br>
          🛫 ${f.dep} → 🛬 ${f.arr}
          <div class="progressContainer">
            <div class="progressLabel">🕓 ${elapsed} min in flight</div>
            <div class="progressBar">
              <div class="progressFill" style="width: ${progress.toFixed(0)}%;"></div>
            </div>
          </div>
          Status: ${status}
        `;

        if (f.uid === user.uid) {
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

          div.appendChild(endBtn);
        }

        list.appendChild(div);
      });
    });
  });
});
