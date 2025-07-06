const map = L.map("map").setView([-33.9, 151.2], 4);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap",
}).addTo(map);

let liveMarker = null;
let routeLine = null;

function interpolate(dep, arr, pct) {
  return [
    dep.lat + (arr.lat - dep.lat) * pct,
    dep.lon + (arr.lon - dep.lon) * pct
  ];
}

firebase.database().ref("flights").on("value", snapshot => {
  const flights = snapshot.val() || {};
  const now = Date.now();

  const active = Object.entries(flights).filter(([_, f]) => !f.completed);
  if (active.length === 0) return;

  const [_, f] = active[active.length - 1];
  const depCode = f.dep.toUpperCase();
  const arrCode = f.arr.toUpperCase();

  const dep = airportCoords[depCode];
  const arr = airportCoords[arrCode];
  if (!dep || !arr) return;

  const start = f.timestamp || new Date(f.schedDep).getTime();
  const end = new Date(f.eta).getTime();
  const pct = Math.min(1, Math.max(0, (now - start) / (end - start)));
  const [lat, lon] = interpolate(dep, arr, pct);

  if (routeLine) map.removeLayer(routeLine);
  routeLine = L.polyline([[dep.lat, dep.lon], [arr.lat, arr.lon]], { color: "blue" }).addTo(map);

  if (!liveMarker) {
    liveMarker = L.marker([lat, lon], { title: f.callsign }).addTo(map);
  } else {
    liveMarker.setLatLng([lat, lon]);
  }

  map.setView([lat, lon], 5);
});
