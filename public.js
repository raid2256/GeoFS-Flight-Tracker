const flightList = document.getElementById("flightList");

// Time formatter
function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Load public flight data
firebase.database().ref("flights").on("value", snapshot => {
  const flights = snapshot.val() || {};
  flightList.innerHTML = "";
  const now = Date.now();

  Object.entries(flights).forEach(([id, f]) => {
    if (f.completed) return;

    firebase.database().ref("users/" + f.uid + "/username").once("value").then(userSnap => {
      const username = userSnap.val() || "Unknown Pilot";

      const sched = new Date(f.schedDep).getTime();
      const eta = new Date(f.eta).getTime();
      const start = f.timestamp || sched;
      const end = f.endTime || null;

      const progress = Math.min(100, Math.max(0, ((now - sched) / (eta - sched)) * 100));
      const elapsed = Math.round((progress / 100) * (eta - sched) / 60000);

      // Status
      let status = "🟢 On Time";
      if (start > sched) status = "🔴 Delayed Departure";
      else if (now > eta) status = "🟡 Arriving Late";

      const schedStart = formatTime(new Date(f.schedDep));
      const schedEnd = formatTime(new Date(f.eta));
      const actualStart = formatTime(new Date(start));
      const actualEnd = end ? formatTime(new Date(end)) : null;

      const div = document.createElement("div");
      div.className = "flightCard";
      div.innerHTML = `
        👤 Pilot: <strong>${username}</strong><br>
        <strong>${f.callsign}</strong> | ${f.aircraft}<br>
        🛫 ${f.dep} → 🛬 ${f.arr}<br>
        Scheduled: <s>${schedStart} → ${schedEnd}</s><br>
        Actual: ${actualStart}${actualEnd ? " → " + actualEnd : ""}
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
