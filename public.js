// Reference to Firebase DB (assumes firebase.initializeApp has been called)
const flightList = document.getElementById("flightList");

firebase.database().ref("flights").on("value", snapshot => {
  const data = snapshot.val() || {};
  flightList.innerHTML = "";

  const now = Date.now();

  Object.entries(data).forEach(([id, flight]) => {
    if (flight.completed) return; // Show only active flights

    // Lookup pilot username
    firebase.database().ref("users/" + flight.uid + "/username").once("value").then(userSnap => {
      const username = userSnap.val() || "Unknown Pilot";

      const sched = new Date(flight.schedDep).getTime();
      const eta = new Date(flight.eta).getTime();
      const start = flight.timestamp || sched;
      const progress = Math.min(100, Math.max(0, ((now - sched) / (eta - sched)) * 100));
      const elapsed = Math.round((progress / 100) * (eta - sched) / 60000);

      let status;
      if (start > sched) status = "🔴 Delayed Departure";
      else if (now > eta) status = "🟡 Arriving Late";
      else status = "🟢 On Time";

      const div = document.createElement("div");
      div.className = "flightCard";
      div.innerHTML = `
        👤 Pilot: <strong>${username}</strong><br>
        <strong>${flight.callsign}</strong> | ${flight.aircraft}<br>
        🛫 ${flight.dep} → 🛬 ${flight.arr}
        <div class="progressContainer">
          <div class="progressLabel">🕓 ${elapsed} min in flight</div>
          <div class="progressBar">
            <div class="progressFill" style="width: ${progress.toFixed(0)}%;"></div>
          </div>
        </div>
        Status: ${status}
      `;

      flightList.appendChild(div);
    });
  });
});
