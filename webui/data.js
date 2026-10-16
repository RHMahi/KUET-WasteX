"use strict";

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "wastex_data.txt");

const NODE_ORDER = [
  "Main Gate", "Janata Bank", "Pocket Gate", "Post Office", "Central Field",
  "Academic Area", "Administration", "Cafeteria", "S.S.H", "A.E.H",
  "F.A.H", "K.A.H", "R.H", "Guest House", "IT Park",
];

/* ------------------------------------------------------------------ */
/* Number formatting (mirrors C++ Format0/1/2)                        */
/* ------------------------------------------------------------------ */
const f0 = (v) => Number(v).toFixed(0);
const f1 = (v) => Number(v).toFixed(1);
const f2 = (v) => Number(v).toFixed(2);

/* ------------------------------------------------------------------ */
/* Bin helpers (mirrors Bin.h)                                        */
/* ------------------------------------------------------------------ */
function updateStatus(bin) {
  if (bin.fill >= 90) bin.status = "CRITICAL";
  else if (bin.fill >= 75) bin.status = "HIGH";
  else if (bin.fill >= 50) bin.status = "MODERATE";
  else bin.status = "NORMAL";
}
function calcPriority(bin) {
  bin.priority = bin.fill * 0.6 + bin.rate * 0.4;
}
function priorityFromStatus(status) {
  if (status === "CRITICAL") return "HIGH";
  if (status === "HIGH" || status === "MODERATE") return "MEDIUM";
  return "LOW";
}
function decorateBin(bin) {
  const b = { ...bin };
  updateStatus(b);
  calcPriority(b);
  b.collection = b.fill > 0 ? "REQUIRED" : "DONE";
  b.priorityText = f1(b.priority);
  return b;
}

/* ------------------------------------------------------------------ */
/* File load / save                                                   */
/* ------------------------------------------------------------------ */
function defaultData() {
  // Mirrors seedBins()/seedUsers()/seedRequests()/Graph.cpp when no file.
  return {
    nextRequestId: 102,
    driverLocation: "Main Gate",
    bins: [
      { id: "B01", location: "Cafeteria", fill: 85, rate: 4 },
      { id: "B02", location: "Academic Area", fill: 60, rate: 6 },
      { id: "B03", location: "S.S.H", fill: 95, rate: 3 },
      { id: "B04", location: "Main Gate", fill: 40, rate: 2 },
      { id: "B05", location: "Administration", fill: 70, rate: 5 },
    ],
    users: [
      { username: "admin", password: "admin123", role: "Admin", name: "System Administrator" },
      { username: "driver1", password: "drive123", role: "Driver", name: "Rahim" },
      { username: "student1", password: "pass123", role: "User", name: "Karim" },
    ],
    requests: [
      { requestId: "R101", binId: "B03", location: "S.S.H", priority: "HIGH", status: "Pending", requestedBy: "student1", assignedDriver: "" },
    ],
    history: [],
    roads: defaultRoads(),
    queue: ["B03"],
  };
}

function defaultRoads() {
  const e = [
    ["Main Gate", "Janata Bank", 0.5], ["Main Gate", "K.A.H", 0.2],
    ["Janata Bank", "Pocket Gate", 0.05], ["Janata Bank", "Post Office", 0.15],
    ["Janata Bank", "K.A.H", 0.25], ["Pocket Gate", "Post Office", 0.20],
    ["Pocket Gate", "Academic Area", 0.40], ["Pocket Gate", "Guest House", 0.40],
    ["Pocket Gate", "IT Park", 0.35], ["Post Office", "Central Field", 0.20],
    ["Post Office", "S.S.H", 0.15], ["Central Field", "Academic Area", 0.15],
    ["Central Field", "S.S.H", 0.10], ["Central Field", "A.E.H", 0.15],
    ["Central Field", "Cafeteria", 0.20], ["Academic Area", "Administration", 0.20],
    ["Academic Area", "A.E.H", 0.20], ["Academic Area", "IT Park", 0.30],
    ["Administration", "K.A.H", 0.20], ["Administration", "R.H", 0.25],
    ["Administration", "F.A.H", 0.30], ["Cafeteria", "A.E.H", 0.20],
    ["S.S.H", "A.E.H", 0.05], ["S.S.H", "F.A.H", 0.20],
    ["A.E.H", "F.A.H", 0.15], ["F.A.H", "R.H", 0.20],
    ["K.A.H", "R.H", 0.15], ["R.H", "Guest House", 0.25],
    ["Guest House", "IT Park", 0.20],
  ];
  return e.map(([from, to, weight]) => ({ from, to, weight }));
}

function clean(v) {
  return String(v == null ? "" : v).replace(/\|/g, "/");
}

function parseFile(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0 || lines[0] !== "WASTEX_DATA_V1") return null;
  const data = {
    nextRequestId: 101,
    driverLocation: "Main Gate",
    bins: [], users: [], requests: [], history: [], roads: [], queue: [],
  };
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === "") continue;
    const parts = line.split("|");
    const tag = parts[0];
    const count = parseInt(parts[1], 10);
    if (tag === "NEXTID") data.nextRequestId = parseInt(parts[1], 10) || 101;
    else if (tag === "LOCATION") data.driverLocation = parts[1];
    else if (tag === "BINCOUNT") {
      for (let k = 0; k < count; k++) {
        const p = lines[++i].split("|");
        if (p.length < 4) break;
        data.bins.push({ id: p[0], location: p[1], fill: parseFloat(p[2]), rate: parseFloat(p[3]) });
      }
    } else if (tag === "USERCOUNT") {
      for (let k = 0; k < count; k++) {
        const p = lines[++i].split("|");
        if (p.length < 4) break;
        data.users.push({ username: p[0], password: p[1], role: p[2], name: p[3] });
      }
    } else if (tag === "REQCOUNT") {
      for (let k = 0; k < count; k++) {
        const p = lines[++i].split("|");
        if (p.length < 7) break;
        data.requests.push({
          requestId: p[0], binId: p[1], location: p[2], priority: p[3],
          status: p[4], requestedBy: p[5], assignedDriver: p[6],
        });
      }
    } else if (tag === "HISTCOUNT") {
      for (let k = 0; k < count; k++) {
        const p = lines[++i].split("|");
        if (p.length < 3) break;
        data.history.push({ binId: p[0], location: p[1], description: p[2] });
      }
    } else if (tag === "ROADCOUNT") {
      for (let k = 0; k < count; k++) {
        const p = lines[++i].split("|");
        if (p.length < 3) break;
        data.roads.push({ from: p[0], to: p[1], weight: parseFloat(p[2]) });
      }
    } else if (tag === "QCOUNT") {
      for (let k = 0; k < count; k++) {
        data.queue.push(lines[++i]);
      }
    }
  }
  return data;
}

function serialize(data) {
  const out = [];
  out.push("WASTEX_DATA_V1");
  out.push("NEXTID|" + data.nextRequestId);
  out.push("LOCATION|" + clean(data.driverLocation));
  out.push("BINCOUNT|" + data.bins.length);
  for (const b of data.bins) out.push([b.id, b.location, f2(b.fill), f2(b.rate)].map(clean).join("|"));
  out.push("USERCOUNT|" + data.users.length);
  for (const u of data.users) out.push([u.username, u.password, u.role, u.name].map(clean).join("|"));
  out.push("REQCOUNT|" + data.requests.length);
  for (const r of data.requests)
    out.push([r.requestId, r.binId, r.location, r.priority, r.status, r.requestedBy, r.assignedDriver].map(clean).join("|"));
  out.push("HISTCOUNT|" + data.history.length);
  for (const h of data.history) out.push([h.binId, h.location, h.description].map(clean).join("|"));
  out.push("ROADCOUNT|" + data.roads.length);
  for (const r of data.roads) out.push([r.from, r.to, f2(r.weight)].map(clean).join("|"));
  out.push("QCOUNT|" + data.queue.length);
  for (const q of data.queue) out.push(clean(q));
  return out.join("\n") + "\n";
}

function load() {
  try {
    const text = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = parseFile(text);
    if (parsed) return parsed;
  } catch (e) { /* fall through */ }
  const d = defaultData();
  save(d);
  return d;
}

function save(data) {
  fs.writeFileSync(DATA_FILE, serialize(data), "utf8");
}

/* ------------------------------------------------------------------ */
/* Graph (mirrors Graph.h / Graph.cpp / Dijkstra.h)                   */
/* ------------------------------------------------------------------ */
function buildGraph(roads) {
  const nodes = NODE_ORDER.slice();
  const idx = new Map(nodes.map((n, i) => [n, i]));
  const adj = nodes.map(() => []);
  for (const r of roads) {
    const u = idx.get(r.from), v = idx.get(r.to);
    if (u === undefined || v === undefined || u === v) continue;
    if (adj[u].some((e) => e.to === v)) continue;
    adj[u].push({ to: v, weight: r.weight });
    adj[v].push({ to: u, weight: r.weight });
  }
  return { nodes, adj };
}

function graphEdges(graph) {
  const seen = new Set();
  const edges = [];
  for (let u = 0; u < graph.nodes.length; u++) {
    for (const e of graph.adj[u]) {
      const key = u < e.to ? u + "-" + e.to : e.to + "-" + u;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ a: graph.nodes[u], b: graph.nodes[e.to], weight: e.weight });
    }
  }
  return edges;
}

function bfs(graph, start) {
  const s = graph.nodes.indexOf(start);
  if (s === -1) return null;
  const visited = new Array(graph.nodes.length).fill(false);
  const order = [];
  const q = [s];
  visited[s] = true;
  while (q.length) {
    const cur = q.shift();
    order.push(graph.nodes[cur]);
    for (const e of graph.adj[cur]) {
      if (!visited[e.to]) { visited[e.to] = true; q.push(e.to); }
    }
  }
  return order;
}

function dfs(graph, start) {
  const s = graph.nodes.indexOf(start);
  if (s === -1) return null;
  const visited = new Array(graph.nodes.length).fill(false);
  const order = [];
  const stack = [s];
  while (stack.length) {
    const cur = stack.pop();
    if (visited[cur]) continue;
    visited[cur] = true;
    order.push(graph.nodes[cur]);
    for (const e of graph.adj[cur]) if (!visited[e.to]) stack.push(e.to);
  }
  return order;
}

function dijkstra(graph, start) {
  const n = graph.nodes.length;
  const dist = new Array(n).fill(1e9);
  const prev = new Array(n).fill(-1);
  const visited = new Array(n).fill(false);
  const s = graph.nodes.indexOf(start);
  if (s === -1) return { dist, prev, source: s };
  dist[s] = 0;
  for (let step = 0; step < n; step++) {
    let cur = -1, best = 1e9;
    for (let i = 0; i < n; i++) if (!visited[i] && dist[i] < best) { best = dist[i]; cur = i; }
    if (cur === -1) break;
    visited[cur] = true;
    for (const e of graph.adj[cur]) {
      if (dist[cur] + e.weight < dist[e.to]) { dist[e.to] = dist[cur] + e.weight; prev[e.to] = cur; }
    }
  }
  const paths = (dest) => {
    const d = graph.nodes.indexOf(dest);
    if (d === -1 || dist[d] >= 1e9) return { path: [], distance: 1e9 };
    const path = [];
    let at = d;
    while (at !== -1) { path.unshift(graph.nodes[at]); at = prev[at]; }
    return { path, distance: dist[d] };
  };
  return { dist, prev, source: s, paths };
}

/* ------------------------------------------------------------------ */
/* Priority queue (mirrors PriorityQueue.h ordering)                  */
/* ------------------------------------------------------------------ */
function priorityList(bins) {
  const heap = [];
  const swap = (i, j) => { const t = heap[i]; heap[i] = heap[j]; heap[j] = t; };
  for (const raw of bins) {
    if (raw.fill <= 0) continue;
    const b = decorateBin(raw);
    heap.push(b);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent].priority < heap[i].priority) { swap(parent, i); i = parent; }
      else break;
    }
  }
  const out = [];
  while (heap.length) {
    out.push(heap[0]);
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = 2 * i + 2;
        let largest = i;
        if (l < heap.length && heap[l].priority > heap[largest].priority) largest = l;
        if (r < heap.length && heap[r].priority > heap[largest].priority) largest = r;
        if (largest === i) break;
        swap(i, largest); i = largest;
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Sort / binary search (mirrors SortSearch.h)                        */
/* ------------------------------------------------------------------ */
function sortBins(list, key, descending) {
  const arr = list.slice();
  if (key === "id") {
    arr.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return arr;
  }
  const getKey = (b) => (key === "fill" ? b.fill : key === "rate" ? b.rate : b.priority);
  arr.sort((a, b) => (descending ? getKey(b) - getKey(a) : getKey(a) - getKey(b)));
  return arr;
}

function binarySearchById(sorted, id) {
  let low = 0, high = sorted.length - 1, steps = 0;
  while (low <= high) {
    steps++;
    const mid = (low + high) >> 1;
    if (sorted[mid].id === id) return { found: true, bin: sorted[mid], steps };
    if (sorted[mid].id < id) low = mid + 1;
    else high = mid - 1;
  }
  return { found: false, bin: null, steps };
}

/* ------------------------------------------------------------------ */
/* Request helpers                                                    */
/* ------------------------------------------------------------------ */
function findRequest(data, id) {
  return data.requests.find((r) => r.requestId === id) || null;
}
function findRequestByBin(data, binId) {
  return data.requests.find((r) => r.binId === binId) || null;
}
function generateRequestId(data) {
  const id = "R" + data.nextRequestId;
  data.nextRequestId++;
  return id;
}
function removeFromQueue(data, binId) {
  data.queue = data.queue.filter((b) => b !== binId);
}
function completeByBin(data, binId) {
  for (const r of data.requests) {
    if (r.binId === binId && (r.status === "Pending" || r.status === "Assigned")) {
      r.status = "Completed";
      return true;
    }
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Smart collection (mirrors smartCollection in main.cpp)             */
/* ------------------------------------------------------------------ */
function smartCollect(data, start, driverUsername) {
  if (data.bins.length === 0) return { error: "No bins available for collection." };
  const graph = buildGraph(data.roads);
  if (graph.nodes.indexOf(start) === -1) return { error: "Invalid starting location." };

  const list = priorityList(data.bins);
  if (list.length === 0) return { error: "No bins need collection. All bins are empty." };

  const driverName = (data.users.find((u) => u.username === driverUsername) || {}).name || driverUsername;

  const steps = [];
  let current = start;
  let total = 0;
  let collected = 0;
  const collectedOrder = [];

  const pq = list.slice(); // already highest priority first
  while (pq.length) {
    const target = pq.shift();
    const dj = dijkstra(graph, current);
    const { path, distance } = dj.paths(target.location);
    if (path.length === 0) {
      steps.push({ type: "skip", binId: target.id, location: target.location });
      continue;
    }
    const previousFill = f0(target.fill);
    const req = findRequestByBin(data, target.id);
    const requestId = req ? req.requestId : "--";
    steps.push({
      type: "route", from: current, to: target.location, path, distance,
      binId: target.id, previousFill, requestId, driver: driverName,
    });
    total += distance;
    collected++;
    collectedOrder.push(target.id);

    data.history.unshift({ binId: target.id, location: target.location, description: "Collected via smart route" });
    completeByBin(data, target.id);
    removeFromQueue(data, target.id);
    const bin = data.bins.find((b) => b.id === target.id);
    if (bin) { bin.fill = 0; updateStatus(bin); calcPriority(bin); }

    steps.push({ type: "complete", binId: target.id, location: target.location, previousFill, driver: driverName, requestId });
    current = target.location;
    data.driverLocation = current;
  }

  const back = dijkstra(graph, current);
  const home = back.paths(start);
  if (home.path.length) {
    steps.push({ type: "route", from: current, to: start, path: home.path, distance: home.distance, returnHome: true });
    total += home.distance;
  }

  data.driverLocation = start;
  const summary = {
    starting: start,
    binsCollected: collected,
    totalDistance: total,
    order: collectedOrder,
  };
  save(data);
  return { steps, summary };
}

/* ------------------------------------------------------------------ */
/* Route plan (read-only, mirrors smartCollection order)              */
/* ------------------------------------------------------------------ */
function routePlan(data, start) {
  if (data.bins.length === 0) return { error: "No bins available for collection." };
  const graph = buildGraph(data.roads);
  if (graph.nodes.indexOf(start) === -1) return { error: "Invalid starting location." };
  const list = priorityList(data.bins);
  if (list.length === 0) return { error: "No bins need collection. All bins are empty." };

  const stops = [];
  let current = start;
  let total = 0;
  for (const target of list) {
    const dj = dijkstra(graph, current);
    const { path, distance } = dj.paths(target.location);
    if (!path.length) { stops.push({ binId: target.id, location: target.location, unreachable: true, fill: target.fill, priority: target.priority }); continue; }
    stops.push({ binId: target.id, location: target.location, path, distance, fill: target.fill, priority: target.priority });
    total += distance;
    current = target.location;
  }
  const back = dijkstra(graph, current);
  const home = back.paths(start);
  const returnLeg = home.path.length ? { from: current, to: start, path: home.path, distance: home.distance } : null;
  if (returnLeg) total += returnLeg.distance;

  return {
    start, stops, returnLeg, totalDistance: total,
    order: stops.filter((s) => !s.unreachable).map((s) => s.binId),
    binsCollected: stops.filter((s) => !s.unreachable).length,
  };
}

/* ------------------------------------------------------------------ */
/* Map data pipeline (OpenStreetMap extracts)                         */
/* ------------------------------------------------------------------ */
const MAP_DIR = path.join(__dirname, "mapdata");

function loadMapJson(name) {
  try { return JSON.parse(fs.readFileSync(path.join(MAP_DIR, name), "utf8")); }
  catch (e) { return null; }
}

function mapMetadata() { return loadMapJson("metadata.json") || {}; }
function mapBuildings() { return loadMapJson("kuet_buildings.geojson") || { type: "FeatureCollection", features: [] }; }
function mapRoads() { return loadMapJson("kuet_roads.geojson") || { type: "FeatureCollection", features: [] }; }

function mapNodes() {
  const base = loadMapJson("campus_nodes.json") || {};
  const manual = loadMapJson("manual_coords.json") || {};
  const out = {};
  for (const name of Object.keys(base)) {
    const n = base[name];
    const m = manual[name];
    if (m && typeof m.lat === "number" && typeof m.lng === "number") {
      out[name] = { lat: m.lat, lng: m.lng, verified: true, source: m.source || "manual", osm_id: m.osm_id || null, note: n.note || "" };
    } else {
      out[name] = { lat: n.lat, lng: n.lng, verified: !!n.verified, source: n.source, osm_id: n.osm_id, note: n.note };
    }
  }
  return out;
}

function saveManualCoord(name, lat, lng, source) {
  const manual = loadMapJson("manual_coords.json") || {};
  manual[name] = { lat: Number(lat), lng: Number(lng), source: source || "manual", at: new Date().toISOString() };
  fs.writeFileSync(path.join(MAP_DIR, "manual_coords.json"), JSON.stringify(manual, null, 2), "utf8");
  return manual[name];
}

/* haversine distance in metres between [lat,lng] points */
function haversine(a, b) {
  const R = 6371000;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLng = (b[1] - a[1]) * Math.PI / 180;
  const la1 = a[0] * Math.PI / 180, la2 = b[0] * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/* Build a routing graph from the OSM road LineStrings.
   Vertices = road geometry points (deduplicated), edges = consecutive
   points weighted by real haversine distance. Reuses the same
   Dijkstra approach as Dijkstra.h (O(n^2) selection). */
function buildRoadGraph() {
  const roads = mapRoads();
  const idx = new Map();
  const nodes = [];
  const adj = [];
  const key = (lat, lng) => lat.toFixed(5) + "," + lng.toFixed(5);
  const vid = (lat, lng) => {
    const k = key(lat, lng);
    let i = idx.get(k);
    if (i === undefined) { i = nodes.length; idx.set(k, i); nodes.push([lat, lng]); adj.push([]); }
    return i;
  };
  for (const f of roads.features || []) {
    const cs = (f.geometry && f.geometry.coordinates) || [];
    for (let k = 0; k < cs.length - 1; k++) {
      const a = [cs[k][1], cs[k][0]], b = [cs[k + 1][1], cs[k + 1][0]];
      const ia = vid(a[0], a[1]), ib = vid(b[0], b[1]);
      if (ia === ib) continue;
      const w = haversine(a, b);
      adj[ia].push({ to: ib, w });
      adj[ib].push({ to: ia, w });
    }
  }
  return { nodes, adj };
}

function nearestVertex(graph, lat, lng) {
  let best = -1, bd = Infinity;
  for (let i = 0; i < graph.nodes.length; i++) {
    const n = graph.nodes[i];
    const d = (n[0] - lat) ** 2 + (n[1] - lng) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

function dijkstraRoad(graph, s, t) {
  const n = graph.nodes.length;
  if (s < 0 || t < 0 || n === 0) return null;
  const dist = new Array(n).fill(Infinity);
  const prev = new Array(n).fill(-1);
  const vis = new Array(n).fill(false);
  dist[s] = 0;
  for (let step = 0; step < n; step++) {
    let cur = -1, best = Infinity;
    for (let i = 0; i < n; i++) if (!vis[i] && dist[i] < best) { best = dist[i]; cur = i; }
    if (cur === -1 || cur === t) break;
    vis[cur] = true;
    for (const e of graph.adj[cur]) if (dist[cur] + e.w < dist[e.to]) { dist[e.to] = dist[cur] + e.w; prev[e.to] = cur; }
  }
  if (!isFinite(dist[t])) return null;
  const path = [];
  let at = t;
  while (at !== -1) { path.unshift(graph.nodes[at]); at = prev[at]; }
  return { path, meters: dist[t] };
}

/* Route between two lat/lng points following mapped roads.
   Returns null if no road path exists (caller falls back gracefully). */
function routeOnRoads(fromLat, fromLng, toLat, toLng) {
  const graph = buildRoadGraph();
  if (!graph.nodes.length) return null;
  const s = nearestVertex(graph, fromLat, fromLng);
  const t = nearestVertex(graph, toLat, toLng);
  const res = dijkstraRoad(graph, s, t);
  if (!res) return null;
  const snap = (i, lat, lng) => ({ lat, lng, snappedLat: graph.nodes[i][0], snappedLng: graph.nodes[i][1], offMeters: haversine([lat, lng], graph.nodes[i]) });
  return {
    path: res.path.map((p) => [p[0], p[1]]),
    meters: res.meters,
    distanceKm: res.meters / 1000,
    from: snap(s, fromLat, fromLng),
    to: snap(t, toLat, toLng),
  };
}

module.exports = {
  DATA_FILE,
  NODE_ORDER,
  f0, f1, f2,
  load, save, defaultData,
  decorateBin, updateStatus, calcPriority, priorityFromStatus,
  buildGraph, graphEdges, bfs, dfs, dijkstra, priorityList,
  sortBins, binarySearchById,
  findRequest, findRequestByBin, generateRequestId, removeFromQueue, completeByBin,
  smartCollect, routePlan,
  mapMetadata, mapBuildings, mapRoads, mapNodes, saveManualCoord,
  haversine, buildRoadGraph, nearestVertex, dijkstraRoad, routeOnRoads,
};