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

// Auth UI
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const usernameInput = document.getElementById("username"); // Username field
const userInfo = document.getElementById("userInfo");

document.getElementById("loginBtn").onclick = () => {
  firebase.auth().signInWithEmailAndPassword(
    emailInput.value.trim(),
    passwordInput.value.trim()
  ).catch(err => alert("Login Error: " + err.message));
};

document.getElementById("signupBtn").onclick = () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const username = usernameInput.value.trim();

  if (!username) {
    alert("Please enter a username.");
    return;
  }

  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then(cred => {
      const uid = cred.user.uid;
      return db.ref("users/" + uid).set({ username });
    })
    .then(() => alert("Account created! You're now signed in."))
    .catch(err => alert("Signup Error: " + err.message));
};

firebase.auth().onAuthStateChanged(user => {
  const flightForm = document.getElementById("flightForm");
  const flightList = document.getElementById("flightList");

  if (!user) {
    flightForm.style.display = "none";
    flightList.innerHTML = "<p>🔒 Please sign in to view and manage flights.</p>";
    userInfo.textContent = "";
    return;
  }

  flightForm.style.display = "block";

  db.ref("users/" + user.uid + "/username").once("value").then(snap => {
    const uname = snap.val() || "Unknown Pilot";
    userInfo.innerHTML = `👤 Welcome, <strong>${uname}</strong><br>${user.email}`;
  });

  // Submit new flight
  document.getElementById("flightForm").addEventListener("submit", e => {
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
    const id = "FLT_" + Date.now();
    db.ref("flights/" + id).set(data);
    flightForm.reset();
  });

  // Display ALL active flights with usernames
  db.ref("flights").on("value", snap => {
    flightList.innerHTML = "";
    const now = Date.now();
    const flights = snap.val() || {};

    Object.entries(flights).forEach(([id, f]) => {
      if (f.completed) return;

      db.ref("users/" + f.uid + "/username").once("value").then(userSnap => {
        const pilotName = userSnap.val() || "Unknown Pilot";

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
          👤 Pilot: <strong>${pilotName}</strong><br>
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

        // Only show "End Flight" if it's your flight
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
Pilot: ${pilotName}
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
  });
});
