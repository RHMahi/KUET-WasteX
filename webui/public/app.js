"use strict";

/* ================================================================== */
/* Helpers                                                            */
/* ================================================================== */
const $ = (sel, root = document) => (root || document).querySelector(sel);
const $$ = (sel, root = document) => Array.from((root || document).querySelectorAll(sel));
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function api(path, method = "GET", body) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch (e) { data = { ok: false, error: "Bad server response" }; }
  if (!data.ok) throw new Error(data.error || "Request failed");
  return data;
}

function toast(msg, type = "success") {
  const el = document.createElement("div");
  el.className = "toast " + (type === "error" ? "error" : type === "info" ? "info" : type === "warn" ? "warn" : "");
  el.innerHTML = `<div>${esc(msg)}</div>`;
  $("#toasts").appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateX(30px)"; el.style.transition = ".3s"; }, 3200);
  setTimeout(() => el.remove(), 3600);
}

function badge(status) {
  const cls = String(status || "").toUpperCase();
  return `<span class="badge ${cls}">${esc(status)}</span>`;
}
function barFor(fill, status) {
  const cls = fill >= 90 ? "crit" : fill >= 50 ? "warn" : "";
  return `<div class="fillcell"><div class="bar ${cls}"><i style="width:${Math.min(100, fill)}%"></i></div><b>${Number(fill).toFixed(0)}%</b></div>`;
}
function options(list, selected) {
  return list.map((v) => `<option value="${esc(v)}" ${v === selected ? "selected" : ""}>${esc(v)}</option>`).join("");
}
function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

const DEPARTMENTS = ["CSE", "EEE", "ECE", "ME", "CE", "BME", "MTE", "CHE", "IEM", "LE", "TE", "URP", "Architecture", "BECM", "Other"];
const YEARS = ["1", "2", "3", "4"];
const SEMESTERS = ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2"];

/* ================================================================== */
/* Session + shell                                                    */
/* ================================================================== */
let SESSION = null;
let LOCS = [];
let REFRESH = null;

const NAV = {
  Admin: [
    ["dashboard", "Dashboard", "◎"],
    ["livemap", "Live Tracking Map", "◱"],
    ["bins", "Manage Bins", "▤"],
    ["users", "Manage Users", "☰"],
    ["requests", "Manage Requests", "⇄"],
    ["history", "Collection History", "⟲"],
    ["graph", "Campus Road Network", "⬡"],
    ["searchsort", "Search & Sort Bins", "⇅"],
    ["stats", "System Statistics", "▦"],
    ["overview", "System Overview", "❖"],
  ],
  User: [
    ["udashboard", "Dashboard", "◎"],
    ["livemap", "Campus Map", "◱"],
    ["nearby", "Find Nearby Bins", "➤"],
    ["searchbin", "Search Bin", "⌕"],
    ["report", "Report Full Bin", "!"],
    ["createreq", "Create Collection Request", "+"],
    ["myrequests", "My Requests", "☰"],
    ["track", "Track Request", "◍"],
    ["myhistory", "My Collection History", "⟲"],
  ],
  Driver: [
    ["ddashboard", "Dashboard", "◎"],
    ["livemap", "Live Tracking Map", "◱"],
    ["assigned", "Assigned Requests", "☰"],
    ["priority", "Priority Bins", "⇧"],
    ["smart", "Smart Collection", "✦"],
    ["shortest", "Find Shortest Route", "⇄"],
    ["collect", "Collect Bin", "✓"],
    ["driverhistory", "Collection History", "⟲"],
    ["location", "Current Location", "◉"],
  ],
};

const TITLES = {
  dashboard: ["Dashboard", "Overview of the waste collection system"],
  livemap: ["Live Tracking Map", "Real-time bin status, truck position and collection route"],
  bins: ["Manage Bins", "Add, update, delete and browse smart bins"],
  users: ["Manage Users", "Accounts for admins, drivers and citizens"],
  requests: ["Manage Collection Requests", "Create, assign and cancel pickups"],
  history: ["Collection History", "Every recorded collection event"],
  graph: ["Campus Road Network", "Graph traversal and shortest path tools on a real OpenStreetMap base layer"],
  searchsort: ["Search & Sort Bins", "Merge sort and binary search on bins"],
  stats: ["System Statistics", "Aggregated system analytics"],
  overview: ["System Overview", "All information at a glance"],
  udashboard: ["User Dashboard", "Bins and requests around campus"],
  nearby: ["Find Nearby Bins", "Bins ordered by walking distance"],
  searchbin: ["Search Bin", "Binary search a bin by ID"],
  report: ["Report Full Bin", "Flag a bin as full and raise a request"],
  createreq: ["Create Collection Request", "Request a pickup for a bin"],
  myrequests: ["My Requests", "Requests you have raised"],
  track: ["Track Request", "Follow a request by its ID or bin"],
  myhistory: ["My Collection History", "Campus collection records"],
  ddashboard: ["Driver Dashboard", "Your workload and priorities"],
  assigned: ["Assigned Requests", "Requests assigned to you"],
  priority: ["Priority Bins", "Proposed collection priority"],
  smart: ["Smart Collection", "Priority queue + Dijkstra route"],
  shortest: ["Find Shortest Route", "Dijkstra between two locations"],
  collect: ["Collect Bin", "Mark a bin as collected"],
  driverhistory: ["Collection History", "Recent collection records"],
  location: ["Current Location", "Where your truck is now"],
};

async function boot() {
  try {
    const s = JSON.parse(sessionStorage.getItem("wx_session") || "null");
    if (s) await enterApp(s);
  } catch (e) { /* ignore */ }
  wireLogin();
}
boot();

function setFieldError(id, msg) {
  const box = document.getElementById(id);
  if (!box) return;
  if (msg) { box.textContent = msg; box.classList.remove("hidden"); }
  else { box.textContent = ""; box.classList.add("hidden"); }
}

function wireLogin() {
  /* show / hide password */
  $$(".pw-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      btn.classList.toggle("on", reveal);
      btn.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
      input.focus();
    });
  });

  /* clear inline errors while typing */
  ["loginUser", "loginPass", "suUser", "suPass", "suName", "suRoll", "suBatch"].forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.addEventListener("input", () => setFieldError(id === "loginUser" || id === "loginPass" ? "loginError" : "signupError", ""));
  });
  ["suDept", "suYear", "suSemester"].forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.addEventListener("change", () => setFieldError("signupError", ""));
  });

  /* role tabs */
  $$("#roleTabs .role-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$("#roleTabs .role-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const isUser = tab.dataset.role === "User";
      $("#signupHint").classList.toggle("hidden", !isUser);
      if (!isUser) { $("#signupForm").classList.add("hidden"); $("#loginForm").classList.remove("hidden"); }
      setFieldError("loginError", ""); setFieldError("signupError", "");
    });
  });
  $("#showSignup").addEventListener("click", () => {
    $("#loginForm").classList.add("hidden");
    $("#signupHint").classList.add("hidden");
    $("#signupForm").classList.remove("hidden");
    setFieldError("loginError", ""); setFieldError("signupError", "");
  });
  $("#hideSignup").addEventListener("click", () => {
    $("#signupForm").classList.add("hidden");
    $("#loginForm").classList.remove("hidden");
    $("#signupHint").classList.remove("hidden");
    setFieldError("signupError", "");
  });

  /* sign in */
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    setFieldError("loginError", "");
    const role = $(".role-tab.active").dataset.role;
    const username = $("#loginUser").value.trim();
    const password = $("#loginPass").value;
    if (!username && !password) return setFieldError("loginError", "Please enter your username and password.");
    if (!username) { $("#loginUser").focus(); return setFieldError("loginError", "Please enter your username."); }
    if (!password) { $("#loginPass").focus(); return setFieldError("loginError", "Please enter your password."); }
    const btn = $("#loginForm").querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const r = await api("/api/login", "POST", { username, password, role });
      await enterApp(r.user);
      toast("Welcome, " + r.user.name + "!");
    } catch (err) {
      const msg = /invalid username or password/i.test(err.message)
        ? "Incorrect username or password. Please try again." : err.message;
      setFieldError("loginError", msg);
      $("#loginPass").value = "";
      $("#loginPass").focus();
    } finally { btn.disabled = false; }
  });

  /* sign up */
  $("#signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    setFieldError("signupError", "");
    const data = {
      username: $("#suUser").value.trim(),
      password: $("#suPass").value,
      name: $("#suName").value.trim(),
      studentId: $("#suRoll").value.trim(),
      department: $("#suDept").value,
      batch: $("#suBatch").value.trim(),
      year: $("#suYear").value,
      semester: $("#suSemester").value,
    };
    const labels = { username: "username", password: "password", name: "full name", studentId: "Student ID / Roll", department: "department", batch: "batch", year: "year", semester: "semester" };
    const missing = Object.keys(labels).filter((k) => !data[k]);
    if (missing.length) return setFieldError("signupError", "Please fill in: " + missing.map((k) => labels[k]).join(", ") + ".");
    const btn = $("#signupForm").querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const r = await api("/api/signup", "POST", data);
      toast(r.message || "Account created. Please sign in.");
      $("#signupForm").reset();
      $("#signupForm").classList.add("hidden");
      $("#loginForm").classList.remove("hidden");
      $("#signupHint").classList.remove("hidden");
      $("#loginUser").value = data.username;
    } catch (err) {
      setFieldError("signupError", err.message);
    } finally { btn.disabled = false; }
  });
}

async function enterApp(user) {
  SESSION = user;
  sessionStorage.setItem("wx_session", JSON.stringify(user));
  try { LOCS = (await api("/api/state")).locations; } catch (e) { LOCS = []; }
  $("#loginView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
  $("#userName").textContent = user.name;
  $("#userRole").textContent = user.role + " · @" + user.username;
  $("#userAvatar").textContent = (user.name || "?").trim().charAt(0).toUpperCase();
  $("#sideRole").textContent = user.role + " Portal";
  buildNav(user.role);
  startClock();
  go(NAV[user.role][0][0]);
}

function buildNav(role) {
  const nav = $("#navList");
  nav.innerHTML = NAV[role].map(([id, label, ico]) =>
    `<div class="nav-item" data-view="${id}"><span class="ico">${ico}</span>${esc(label)}</div>`).join("");
  $$(".nav-item", nav).forEach((it) => it.addEventListener("click", () => go(it.dataset.view)));
}

function go(viewId) {
  destroyLiveMap();
  $$(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === viewId));
  const [title, sub] = TITLES[viewId] || [viewId, ""];
  $("#pageTitle").textContent = title;
  $("#pageSub").textContent = sub;
  const view = $("#view");
  view.innerHTML = `<div class="empty">Loading…</div>`;
  REFRESH = () => renderView(viewId);
  const fn = VIEWS[viewId];
  if (!fn) { view.innerHTML = `<div class="empty">Not implemented.</div>`; return; }
  Promise.resolve(fn()).catch((err) => {
    view.innerHTML = `<div class="empty">Could not load: ${esc(err.message)}</div>`;
  });
}

function currentViewId() { const a = $(".nav-item.active"); return a ? a.dataset.view : null; }
function renderView(id) { go(id); }

function startClock() {
  const tick = () => { const d = new Date(); $("#liveClock").textContent = d.toLocaleString(); };
  tick(); clearInterval(window.__clock); window.__clock = setInterval(tick, 1000);
}

$("#refreshBtn").addEventListener("click", () => { if (REFRESH) REFRESH(); toast("Refreshed", "info"); });
$("#logoutBtn").addEventListener("click", () => {
  SESSION = null; sessionStorage.removeItem("wx_session");
  $("#appView").classList.add("hidden"); $("#loginView").classList.remove("hidden");
});

/* ================================================================== */
/* Graph rendering                                                    */
/* ================================================================== */
const NODE_POS = {
  "Main Gate": [120, 545], "K.A.H": [95, 425], "Janata Bank": [245, 520],
  "Pocket Gate": [365, 468], "Post Office": [445, 380], "Central Field": [575, 355],
  "Academic Area": [560, 490], "Cafeteria": [710, 405], "Administration": [700, 495],
  "S.S.H": [470, 255], "A.E.H": [625, 175], "F.A.H": [745, 255],
  "R.H": [825, 455], "Guest House": [885, 345], "IT Park": [815, 205],
};

function graphSVG(nodes, edges, marks = {}) {
  const pathSet = new Set(marks.path || []);
  const visitMap = marks.visits || {}; // name -> order
  const start = marks.start, target = marks.target;
  const dim = marks.dim || new Set();
  const pe = marks.pathEdges || new Set();
  let s = `<svg class="graph-svg" viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid meet">`;
  for (const e of edges) {
    const a = NODE_POS[e.a], b = NODE_POS[e.b];
    if (!a || !b) continue;
    const onPath = pe.has(e.a + "|" + e.b);
    s += `<line class="edge" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" ${onPath ? 'style="stroke:#22c55e;stroke-width:4"' : ""}/>`;
    s += `<text class="edge-text" x="${(a[0] + b[0]) / 2}" y="${(a[1] + b[1]) / 2 - 4}" text-anchor="middle">${e.weight}</text>`;
  }
  for (const n of nodes) {
    const p = NODE_POS[n]; if (!p) continue;
    let cls = "node";
    if (dim.has(n)) cls += " dim";
    if (start === n) cls += " start";
    if (target === n) cls += " target";
    if (pathSet.has(n)) cls += " path";
    if (visitMap[n] !== undefined) cls += " visit";
    s += `<g class="${cls}"><circle cx="${p[0]}" cy="${p[1]}" r="20"/>`;
    if (visitMap[n] !== undefined) s += `<text x="${p[0]}" y="${p[1] + 4}" style="fill:#fff;font-weight:700;font-size:11.5px;text-anchor:middle">${visitMap[n]}</text>`;
    s += `<text x="${p[0]}" y="${p[1] - 30}">${esc(n)}</text></g>`;
  }
  s += `</svg>`;
  return s;
}

function pathEdgesFrom(pathArr) {
  const set = new Set();
  for (let i = 0; i < pathArr.length - 1; i++) {
    set.add(pathArr[i] + "|" + pathArr[i + 1]);
    set.add(pathArr[i + 1] + "|" + pathArr[i]);
  }
  return set;
}

/* ================================================================== */
/* Live tracking map                                                  */
/* ================================================================== */
const STATUS_COLOR = { CRITICAL: "#ef4444", HIGH: "#f97316", MODERATE: "#f59e0b", NORMAL: "#22c55e" };
const STATUS_LABEL = { CRITICAL: "Critical", HIGH: "High", MODERATE: "Moderate", NORMAL: "Normal" };

/* Views                                                              */
/* ================================================================== */
const VIEWS = {};

/* ==================================================================== */
/* Live tracking map - Leaflet + OpenStreetMap                          */
/*                                                                      */
/* Sources: base tiles and campus geometry from OpenStreetMap           */
/* (c) OpenStreetMap contributors, ODbL 1.0; bin/driver state from      */
/* wastex_data.txt; stop order from the C++-mirrored priority queue +   */
/* campus-graph Dijkstra; path geometry from /api/route/road (real OSM  */
/* road graph). Truck movement shown here is a SIMULATION, not a GPS    */
/* feed, unless a real GPS position has been posted by a device.        */
/* ==================================================================== */
const LM = { map: null };

function destroyLiveMap() {
  if (window.__lmraf) { cancelAnimationFrame(window.__lmraf); window.__lmraf = null; }
  if (window.__lmclock) { clearInterval(window.__lmclock); window.__lmclock = null; }
  if (LM.map) { try { LM.map.remove(); } catch (e) { /* already gone */ } }
  LM.map = null; LM.buildings = null; LM.roads = null; LM.nodesLayer = null;
  LM.bins = null; LM.route = null; LM.done = null; LM.truck = null;
  LM.graphNodes = null; LM.graphEdges = null;
}

const ROAD_STYLE = {
  secondary: { color: "#f0b429", weight: 5, opacity: 0.95 },
  secondary_link: { color: "#f0b429", weight: 3.5, opacity: 0.9 },
  residential: { color: "#9aa7bb", weight: 3.5, opacity: 0.9 },
  unclassified: { color: "#9aa7bb", weight: 3, opacity: 0.85 },
  service: { color: "#6e7c93", weight: 2.2, opacity: 0.8 },
  footway: { color: "#7fbfa5", weight: 2, opacity: 0.85, dashArray: "4 6" },
  path: { color: "#7fbfa5", weight: 2, opacity: 0.8, dashArray: "4 6" },
  default: { color: "#8a97ab", weight: 3, opacity: 0.85 },
};
function roadStyle(props) { return ROAD_STYLE[(props && props.highway) || ""] || ROAD_STYLE.default; }

function haversineM(a, b) {
  const R = 6371000, dLat = (b[0] - a[0]) * Math.PI / 180, dLng = (b[1] - a[1]) * Math.PI / 180;
  const la1 = a[0] * Math.PI / 180, la2 = b[0] * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
function pointAtDist(path, dists, d) {
  if (!path.length) return null;
  if (d <= 0) return path[0];
  for (let i = 1; i < path.length; i++) {
    if (dists[i] >= d) {
      const seg = dists[i] - dists[i - 1] || 1, t = (d - dists[i - 1]) / seg;
      return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * t, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * t];
    }
  }
  return path[path.length - 1];
}
function binIcon(bin, collected) {
  const c = collected ? "#64748b" : (STATUS_COLOR[bin.status] || "#22c55e");
  return L.divIcon({
    className: "",
    html: `<div class="wx-pin${!collected && bin.status === "CRITICAL" ? " crit" : ""}" style="--c:${c}"><span>${esc(bin.id)}</span><b>${Number(bin.fill).toFixed(0)}%</b></div>`,
    iconSize: [46, 34], iconAnchor: [23, 34],
  });
}
function truckIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="wx-truck" title="Truck (simulated)">
      <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 7h11v9H2z"/><path d="M13 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>`,
    iconSize: [30, 30], iconAnchor: [15, 15],
  });
}
function nodeIcon(manual) {
  return L.divIcon({ className: "", html: `<span class="wx-node${manual ? " manual" : ""}"></span>`, iconSize: [11, 11], iconAnchor: [6, 6] });
}

/* Shared map helpers used by every Leaflet view */
function createBaseMap(el, meta) {
  const map = L.map(el, { zoomControl: true, attributionControl: true, preferCanvas: true });
  const bounds = L.latLngBounds([meta.bbox.south, meta.bbox.west], [meta.bbox.north, meta.bbox.east]);
  map.fitBounds(bounds.pad(0.05));
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: meta.attribution || "© OpenStreetMap contributors, ODbL 1.0",
  }).addTo(map);
  return { map, bounds };
}

function manualPlacer(o) {
  let placing = null;
  function begin(type, name) {
    placing = { type, name };
    o.label.textContent = name;
    o.banner.classList.remove("hidden");
    o.stage.classList.add("placing");
    toast("Click the map to set " + name, "info");
  }
  function cancel() {
    placing = null;
    o.banner.classList.add("hidden");
    o.stage.classList.remove("placing");
  }
  o.cancelBtn.addEventListener("click", cancel);
  o.map.on("click", async (ev) => {
    if (!placing) return;
    const ll = ev.latlng, name = placing.name, type = placing.type;
    cancel();
    try {
      if (type === "node") {
        await api("/api/map/coords", "POST", { name, lat: ll.lat, lng: ll.lng });
        toast("Coordinates saved for " + name);
      } else {
        await api("/api/driver/position", "POST", { lat: ll.lat, lng: ll.lng, source: "simulation" });
        toast("Simulated truck position updated");
      }
      o.onSaved();
    } catch (e) { toast(e.message, "error"); }
  });
  return { begin, cancel };
}

VIEWS.livemap = async () => {
  destroyLiveMap();
  const isUser = SESSION.role === "User";
  const isAdmin = SESSION.role === "Admin";

  const [st, binsR, metaR, bldR, rdR, nodesR, posR] = await Promise.all([
    api("/api/state"), api("/api/bins"), api("/api/map/metadata"),
    api("/api/map/buildings"), api("/api/map/roads"), api("/api/map/nodes"),
    api("/api/driver/position"),
  ]);
  const bins = binsR.bins;
  const meta = metaR.metadata || {};
  const buildings = bldR.features || [];
  const roads = rdR.features || [];
  const nodes = nodesR.nodes || {};
  const pos = posR || {};
  const coordOf = (name) => { const n = nodes[name]; return n && n.lat != null && n.lng != null ? [n.lat, n.lng] : null; };

  let plan = null, planNote = "";
  if (bins.some((b) => Number(b.fill) > 0)) {
    try { plan = await api("/api/route/plan?start=" + encodeURIComponent(st.driverLocation)); }
    catch (e) { planNote = e.message; }
  } else { planNote = "Every bin is empty, so there is nothing to collect yet."; }

  /* ---- stop order (C++ logic) -> coordinates (OSM) -> road path ---- */
  const planned = plan ? plan.stops : [];
  const skipped = [];
  const stopList = [];
  for (const s of planned) {
    if (s.unreachable) { skipped.push({ name: s.location, binId: s.binId, why: "no path in campus graph" }); continue; }
    const c = coordOf(s.location);
    if (!c) { skipped.push({ name: s.location, binId: s.binId, why: "no coordinates on the map yet" }); continue; }
    stopList.push({ binId: s.binId, location: s.location, fill: s.fill, coords: c });
  }

  const startPt = pos.lat != null && pos.lng != null ? [pos.lat, pos.lng] : coordOf(st.driverLocation);
  let cur = startPt;
  const legs = [];
  for (const s of stopList) {
    if (!cur) { skipped.push({ name: s.location, binId: s.binId, why: "truck position has no coordinates" }); break; }
    try {
      const r = await api(`/api/route/road?fromLat=${cur[0]}&fromLng=${cur[1]}&toLat=${s.coords[0]}&toLng=${s.coords[1]}`);
      legs.push({ binId: s.binId, location: s.location, coords: r.route.path, meters: r.route.meters, snap: Math.max(r.route.from.offMeters, r.route.to.offMeters) });
      cur = s.coords;
    } catch (e) { skipped.push({ name: s.location, binId: s.binId, why: e.message }); }
  }

  const fullPath = [];
  for (const l of legs) for (const p of l.coords) fullPath.push(p);
  const roadMeters = legs.reduce((a, l) => a + l.meters, 0);
  const pathDists = [];
  for (let i = 0; i < fullPath.length; i++) pathDists.push(i ? pathDists[i - 1] + haversineM(fullPath[i - 1], fullPath[i]) : 0);
  const pathLen = pathDists.length ? pathDists[pathDists.length - 1] : 0;
  const stopAt = [];
  { let acc = 0; for (const l of legs) { acc += l.meters; stopAt.push({ binId: l.binId, location: l.location, meters: acc }); } }

  const unplaced = Object.keys(nodes).filter((n) => nodes[n].lat == null);
  const alerts = bins.filter((b) => b.status === "CRITICAL" || b.status === "HIGH")
    .sort((a, b) => b.fill - a.fill)
    .map((b) => ({ text: `${b.location} bin at ${Number(b.fill).toFixed(0)}% (${STATUS_LABEL[b.status]})`, sev: b.status }));
  const avgFill = bins.length ? bins.reduce((s, b) => s + b.fill, 0) / bins.length : 0;
  const origin = pos.location || st.driverLocation;
  const destination = legs.length ? legs[legs.length - 1].location : "—";
  const gpsBadge = pos.source === "gps"
    ? `<span class="data-source gps">GPS position</span>`
    : `<span class="data-source sim">Simulated &middot; ${pos.source === "logical-node" ? "logical node" : "placed on map"}</span>`;

  $("#view").innerHTML = `
    <div class="live-wrap">
      <div class="map-panel">
        <div class="map-toolbar">
          <span class="live-badge"><span class="live-dot"></span>LIVE</span>
          <span class="map-sub">KUET Campus &middot; OpenStreetMap base layer</span>
          <span class="spacer"></span>
          <span class="pill" id="lmClock"></span>
          <div class="map-controls">
            <button class="btn btn-sm btn-ghost" id="lmFit">⌖ Fit campus</button>
            ${isUser ? "" : `<button class="btn btn-sm btn-primary" id="lmPlay">&#9654; Start</button>
            <button class="btn btn-sm btn-ghost" id="lmPause">&#10074;&#10074; Pause</button>
            <button class="btn btn-sm btn-ghost" id="lmReset">&#8634; Reset</button>
            <button class="btn btn-sm btn-warn" id="lmSave">&#10003; Collect &amp; Save</button>
            ${isAdmin ? `<button class="btn btn-sm btn-ghost" id="lmDemo">&#8981; Load Demo</button>` : ""}`}
          </div>
        </div>
        <div class="place-banner hidden" id="lmPlaceBanner">
          <span>Click the map to set <b id="lmPlaceName"></b></span>
          <button class="btn btn-sm btn-ghost" id="lmPlaceCancel">Cancel</button>
        </div>
        <div class="leaflet-map" id="lmStage"></div>
        <div class="map-legend">
          <span><i style="background:#22c55e"></i>Normal</span>
          <span><i style="background:#f59e0b"></i>Moderate</span>
          <span><i style="background:#f97316"></i>High</span>
          <span><i style="background:#ef4444"></i>Critical</span>
          <span><i class="sq" style="background:#1b2a44;border:1px solid #6f8bb0"></i>Building (OSM)</span>
          <span><i class="road"></i>Road (OSM)</span>
          <span><i style="background:#3f7fd6"></i>Campus node</span>
          <span><i class="dash"></i>Collection route</span>
          <span><i style="background:#38bdf8"></i>Truck (simulated)</span>
          <span class="hint">&#169; OpenStreetMap contributors, ODbL 1.0</span>
        </div>
      </div>
      <aside class="live-side">
        <div class="grid cols-3" style="gap:12px">
          <div class="card stat blue"><span class="k">Stops</span><span class="v" style="font-size:22px">${plan ? plan.binsCollected : 0}</span><span class="d">need pickup</span></div>
          <div class="card stat red"><span class="k">Alerts</span><span class="v" style="font-size:22px">${alerts.length}</span><span class="d">high/critical</span></div>
          <div class="card stat green"><span class="k">Avg Fill</span><span class="v" style="font-size:22px">${avgFill.toFixed(0)}%</span><span class="d">campus</span></div>
        </div>
        <div class="card">
          <h3>Truck Tracking <span class="sub" id="lmStatus">Idle</span></h3>
          <div class="track-rows">
            <div><span>Position source</span><b>${gpsBadge}</b></div>
            <div><span>Current area</span><b id="lmArea">${esc(origin)}</b></div>
            <div><span>Next stop</span><b id="lmNext">${stopAt.length ? esc(stopAt[0].binId + " · " + stopAt[0].location) : "—"}</b></div>
            <div><span>Distance left</span><b id="lmLeft">${(roadMeters / 1000).toFixed(2)} km</b></div>
            <div><span>ETA</span><b id="lmEta">—</b></div>
          </div>
          ${isAdmin || SESSION.role === "Driver" ? `<button class="btn btn-sm btn-ghost btn-block" id="lmPlaceTruck" style="margin-top:10px">⌖ Set truck position on map</button>` : ""}
        </div>
        <div class="card">
          <h3>Route on OSM roads <span class="sub">${(roadMeters / 1000).toFixed(2)} km</span></h3>
          <div class="track-rows">
            <div><span>Origin</span><b>${esc(origin)}</b></div>
            <div><span>Destination</span><b>${esc(destination)}</b></div>
            <div><span>Stops routed</span><b>${legs.length} of ${planned.length}</b></div>
            <div><span>Path geometry</span><b>OpenStreetMap roads</b></div>
            <div><span>Stop order</span><b>Campus graph (Dijkstra)</b></div>
          </div>
          ${plan ? "" : `<div class="empty" style="padding:14px">${esc(planNote || "No route yet.")}${isAdmin ? " Use <b>Load Demo</b> to fill some bins." : ""}</div>`}
          ${skipped.length ? `<details style="margin-top:10px"><summary>${skipped.length} location(s) not on the map</summary><div class="mini-list" style="margin-top:8px">${skipped.map((s) => `<div class="mini-row"><span class="nm">${esc(s.binId ? s.binId + " · " : "")}${esc(s.name)}</span><span class="hint">${esc(s.why)}</span></div>`).join("")}</div></details>` : ""}
        </div>
        <div class="card">
          <h3>Collection Progress <span class="sub" id="lmProgText">0 / ${stopAt.length}</span></h3>
          <div class="bar big"><i id="lmProgBar" style="width:0%"></i></div>
          <div class="track-rows" style="margin-top:12px">
            <div><span>Collected</span><b id="lmCollected">0</b></div>
            <div><span>Total distance</span><b>${(roadMeters / 1000).toFixed(3)} km</b></div>
          </div>
        </div>
        <div class="card">
          <h3>Smart Alerts <span class="sub">${alerts.length}</span></h3>
          <div class="alerts">
            ${alerts.length ? alerts.slice(0, 5).map((a) => `<div class="alert-item sev-${a.sev}"><span class="dot"></span><span>${esc(a.text)}</span></div>`).join("")
      : `<div class="empty" style="padding:16px">No alerts. All bins healthy.</div>`}
          </div>
        </div>
        ${unplaced.length ? `<div class="card">
          <h3>Not yet mapped <span class="sub">${unplaced.length}</span></h3>
          <div class="mini-list">${unplaced.map((n) => {
            const b = bins.find((x) => x.location === n);
            const note = nodes[n] && nodes[n].note ? nodes[n].note : "";
            return `<div class="mini-row"><span><span class="nm">${esc(n)}</span><span class="hint"> ${b ? esc(b.id) + " sits here" : "no bin here"}</span><br><span class="hint">${esc(note)}</span></span>
              ${isAdmin ? `<button class="btn btn-sm btn-ghost" data-place-node="${esc(n)}">Set</button>` : ""}</div>`;
          }).join("")}</div>
          ${isAdmin ? `<div class="hint" style="margin-top:8px">These locations are not named objects in OpenStreetMap. Click <b>Set</b>, then click the exact spot on the map.</div>` : ""}
        </div>` : ""}
        <div class="card">
          <h3>Map data</h3>
          <div class="track-rows">
            <div><span>Base layer</span><b>OpenStreetMap tiles</b></div>
            <div><span>Buildings</span><b>${buildings.length} (OSM)</b></div>
            <div><span>Roads</span><b>${roads.length} (OSM)</b></div>
            <div><span>Locations placed</span><b>${Object.keys(nodes).length - unplaced.length} / ${Object.keys(nodes).length}</b></div>
            <div><span>Licence</span><b>ODbL 1.0</b></div>
          </div>
        </div>
        <div class="card" id="lmSelected"><h3>Bin Details</h3><div class="empty" style="padding:16px">Click a bin marker on the map.</div></div>
      </aside>
    </div>`;

  const clock = () => { const t = $("#lmClock"); if (t) t.textContent = new Date().toLocaleTimeString(); };
  clock(); window.__lmclock = setInterval(clock, 1000);

  const stage = $("#lmStage");
  if (!window.L) {
    stage.innerHTML = `<div class="map-offline">
      <b>Interactive map unavailable</b>
      <div>Leaflet or the OpenStreetMap tiles could not be loaded (no internet connection).<br>
      Bin, route and location data below still works from the local system.</div>
      <button class="btn btn-sm btn-ghost" id="lmRetry">Retry</button></div>`;
    $("#lmRetry").addEventListener("click", () => renderView("livemap"));
    return;
  }

  /* --------------------------- Leaflet map --------------------------- */
  const { map, bounds } = createBaseMap(stage, meta);
  LM.map = map;

  LM.buildings = L.geoJSON({ type: "FeatureCollection", features: buildings }, {
    style: () => ({ color: "#6f8bb0", weight: 1, fillColor: "#1b2a44", fillOpacity: 0.7 }),
    onEachFeature: (f, layer) => {
      const p = f.properties || {};
      const nm = p.name && p.name !== "Building" ? p.name : null;
      const rows = [];
      if (p.name) rows.push(`<tr><td>Name</td><td>${esc(p.name)}</td></tr>`);
      if (p.building) rows.push(`<tr><td>Type</td><td>building=${esc(p.building)}</td></tr>`);
      if (p.levels) rows.push(`<tr><td>Levels</td><td>${esc(p.levels)}</td></tr>`);
      if (p.amenity) rows.push(`<tr><td>Amenity</td><td>${esc(p.amenity)}</td></tr>`);
      if (p.operator) rows.push(`<tr><td>Operator</td><td>${esc(p.operator)}</td></tr>`);
      if (p.osm_id) rows.push(`<tr><td>OSM ID</td><td>way/${esc(p.osm_id)}</td></tr>`);
      if (nm) layer.bindTooltip(nm, { sticky: true, direction: "top" });
      if (rows.length) layer.bindPopup(`<h4>${esc(p.name || "Building")}</h4><table>${rows.join("")}</table>`);
    },
  }).addTo(map);

  LM.roads = L.geoJSON({ type: "FeatureCollection", features: roads }, {
    style: (f) => roadStyle(f.properties),
    onEachFeature: (f, layer) => {
      const p = f.properties || {};
      const rows = [];
      if (p.name) rows.push(`<tr><td>Name</td><td>${esc(p.name)}</td></tr>`);
      if (p.highway) rows.push(`<tr><td>Road type</td><td>${esc(p.highway)}</td></tr>`);
      if (p.surface) rows.push(`<tr><td>Surface</td><td>${esc(p.surface)}</td></tr>`);
      if (p.osm_id) rows.push(`<tr><td>OSM ID</td><td>way/${esc(p.osm_id)}</td></tr>`);
      layer.bindPopup(`<h4>${esc(p.name || "Road")}</h4><table>${rows.join("")}</table>`);
    },
  }).addTo(map);

  const nodeLayer = L.layerGroup().addTo(map);
  LM.nodesLayer = nodeLayer;
  const binMarkers = {};
  LM.bins = binMarkers;
  for (const name of Object.keys(nodes)) {
    const n = nodes[name];
    if (n.lat == null || n.lng == null) continue;
    const m = L.marker([n.lat, n.lng], { icon: nodeIcon(n.source === "manual"), title: name }).addTo(nodeLayer);
    m.bindTooltip(`${name} · ${n.source === "manual" ? "manually placed" : "OpenStreetMap"}`, { direction: "top", offset: [0, -8] });
    m.bindPopup(`<h4>${esc(name)}</h4><table>
      <tr><td>Source</td><td>${esc(n.source || "OpenStreetMap")}</td></tr>
      <tr><td>Coordinates</td><td>${n.lat.toFixed(6)}, ${n.lng.toFixed(6)}</td></tr>
      ${n.osm_id ? `<tr><td>OSM ID</td><td>way/${esc(n.osm_id)}</td></tr>` : ""}
      ${n.note ? `<tr><td>Note</td><td>${esc(n.note)}</td></tr>` : ""}</table>`);
  }

  const collected = new Set();
  bins.forEach((b) => {
    const c = coordOf(b.location);
    if (!c) return;
    const m = L.marker(c, { icon: binIcon(b, false) }).addTo(map);
    m.bindTooltip(`${b.id} · ${b.location} · ${Number(b.fill).toFixed(0)}%`, { direction: "top", offset: [0, -14] });
    m.on("click", () => {
      const isCol = collected.has(b.id);
      $("#lmSelected").innerHTML = `<h3>Bin ${esc(b.id)} ${isCol ? '<span class="badge Completed">collected</span>' : badge(b.status)}</h3>
        <div class="track-rows">
          <div><span>Location</span><b>${esc(b.location)}</b></div>
          <div><span>Coordinates</span><b>${c[0].toFixed(6)}, ${c[1].toFixed(6)}</b></div>
          <div><span>Fill level</span><b>${Number(b.fill).toFixed(0)}%</b></div>
          <div><span>Fill rate</span><b>${Number(b.rate).toFixed(1)} %/h</b></div>
          <div><span>Priority</span><b>${esc(b.priorityText)}</b></div>
          <div><span>Collection</span><b>${esc(b.collection)}</b></div>
          <div><span>Coordinates source</span><b>${esc((nodes[b.location] || {}).source || "OpenStreetMap")}</b></div>
        </div>`;
    });
    binMarkers[b.id] = { marker: m, bin: b };
  });

  let routeLine = null, doneLine = null;
  if (fullPath.length > 1) {
    routeLine = L.polyline(fullPath, { color: "#22c55e", weight: 5, opacity: 0.8, lineJoin: "round" }).addTo(map);
    doneLine = L.polyline([], { color: "#a3e635", weight: 7, opacity: 0.95, lineJoin: "round" }).addTo(map);
    map.fitBounds(routeLine.getBounds().pad(0.15), { maxZoom: 18 });
  }
  LM.route = routeLine;
  LM.done = doneLine;

  const startPos = startPt || [meta.center.lat, meta.center.lng];
  const truck = L.marker(startPos, { icon: truckIcon(), zIndexOffset: 1000 }).addTo(map);
  LM.truck = truck;
  LM.bounds = bounds;
  truck.bindTooltip("Truck (simulated position)", { direction: "top", offset: [0, -14] });

  const SPEED = 14; /* metres per second, simulated */
  const STATE = { traveled: 0, playing: false, finished: false, last: 0 };

  function nearestNodeName(pt) {
    let best = null, bd = Infinity;
    for (const n of Object.keys(nodes)) {
      const c = nodes[n];
      if (c.lat == null) continue;
      const d = haversineM(pt, [c.lat, c.lng]);
      if (d < bd) { bd = d; best = n; }
    }
    return bd <= 160 ? best : null;
  }

  function updatePanel(traveled) {
    const remaining = Math.max(0, pathLen - traveled);
    $("#lmLeft").textContent = (remaining / 1000).toFixed(2) + " km";
    $("#lmEta").textContent = remaining <= 3 ? "arriving" : Math.max(1, Math.round(remaining / SPEED / 60)) + " min";
    $("#lmCollected").textContent = collected.size;
    const pct = pathLen > 0 ? Math.min(100, (traveled / pathLen) * 100) : (collected.size ? 100 : 0);
    $("#lmProgBar").style.width = pct.toFixed(1) + "%";
    $("#lmProgText").textContent = collected.size + " / " + stopAt.length;
    const next = stopAt.find((s) => !collected.has(s.binId));
    $("#lmNext").textContent = next ? next.binId + " · " + next.location : "—";
    const pt = pointAtDist(fullPath, pathDists, traveled);
    if (pt) {
      if (traveled > 0.001) truck.setLatLng(pt);
      const area = nearestNodeName(pt);
      $("#lmArea").textContent = area || "On mapped road";
      if (doneLine) {
        let i = 0; while (i < pathDists.length - 1 && pathDists[i + 1] <= traveled) i++;
        doneLine.setLatLngs(fullPath.slice(0, i + 1).concat(pathDists[i] < traveled ? [pt] : []));
      }
      for (const s of stopAt) {
        if (collected.has(s.binId) || traveled < s.meters - 0.01) continue;
        collected.add(s.binId);
        const bm = binMarkers[s.binId];
        if (bm) bm.marker.setIcon(binIcon(bm.bin, true));
      }
    }
  }

  function frame(ts) {
    if (!STATE.playing) return;
    if (!STATE.last) STATE.last = ts;
    const dt = Math.min(0.25, (ts - STATE.last) / 1000);
    STATE.last = ts;
    STATE.traveled = Math.min(pathLen, STATE.traveled + SPEED * dt);
    updatePanel(STATE.traveled);
    if (STATE.traveled >= pathLen - 0.01) {
      STATE.playing = false; STATE.finished = true;
      $("#lmStatus").textContent = "Complete";
      $("#lmNext").textContent = "—";
      $("#lmEta").textContent = "arrived";
      return;
    }
    window.__lmraf = requestAnimationFrame(frame);
  }

  $("#lmFit").addEventListener("click", () => map.fitBounds(bounds.pad(0.05)));
  if (!isUser) {
    $("#lmPlay").addEventListener("click", () => {
      if (STATE.finished || pathLen === 0) { renderView("livemap"); return; }
      if (STATE.playing) return;
      STATE.playing = true; STATE.last = 0;
      $("#lmStatus").textContent = "En route";
      window.__lmraf = requestAnimationFrame(frame);
    });
    $("#lmPause").addEventListener("click", () => {
      STATE.playing = false; $("#lmStatus").textContent = "Paused";
      if (window.__lmraf) { cancelAnimationFrame(window.__lmraf); window.__lmraf = null; }
    });
    $("#lmReset").addEventListener("click", () => renderView("livemap"));
    const demo = $("#lmDemo");
    if (demo) demo.addEventListener("click", async () => {
      try {
        await api("/api/bins/B01", "PUT", { fill: 85, rate: 4 });
        await api("/api/bins/B03", "PUT", { fill: 95, rate: 3 });
        await api("/api/bins/B05", "PUT", { fill: 70, rate: 5 });
        await api("/api/bins/B04", "PUT", { fill: 55, rate: 2 });
        toast("Demo bin levels loaded.");
        renderView("livemap");
      } catch (e) { toast(e.message, "error"); }
    });
    $("#lmSave").addEventListener("click", async () => {
      if (!confirm("Collect all bins along this route and save to history?")) return;
      try {
        const r = await api("/api/smart-collect", "POST", { start: st.driverLocation, driver: SESSION.username });
        toast("Collected " + r.summary.binsCollected + " bins.");
        renderView("livemap");
      } catch (e) { toast(e.message, "error"); }
    });
  }

  /* ------------------ manual coordinate placement ------------------ */
  const plc = manualPlacer({
    map, stage, banner: $("#lmPlaceBanner"), label: $("#lmPlaceName"),
    cancelBtn: $("#lmPlaceCancel"), onSaved: () => renderView("livemap"),
  });
  $$("[data-place-node]").forEach((btn) => btn.addEventListener("click", () => plc.begin("node", btn.dataset.placeNode)));
  const placeTruck = $("#lmPlaceTruck");
  if (placeTruck) placeTruck.addEventListener("click", () => plc.begin("driver", "Truck position (simulated)"));

  updatePanel(0);
  if (fullPath.length < 2 && plan) toast("No road path could be built yet — place the missing locations first.", "warn");
};

/* ---------------------- ADMIN: Dashboard ---------------------- */
VIEWS.dashboard = async () => {
  const [stats, prio, hist, graph] = await Promise.all([
    api("/api/stats"), api("/api/priority"), api("/api/history"), api("/api/graph"),
  ]);
  const b = stats.bin, c = stats.collection, sy = stats.system;
  $("#view").innerHTML = `
    <div class="grid cols-4">
      ${statCard("Total Bins", b.total, "green", "Campus collection points")}
      ${statCard("Critical / High", b.critical + b.high, "red", "Needs collection now")}
      ${statCard("Active Requests", c.pending + c.assigned, "blue", "Pending + assigned")}
      ${statCard("Collection Records", sy.collectionRecords, "violet", "Logged pickups")}
    </div>
    <div class="grid cols-2">
      <div class="card"><h3>Proposed Collection Priority <span class="sub">max-heap</span></h3>
        ${prioTable(prio.queue)}
      </div>
      <div class="card"><h3>Recent Collections <span class="sub">linked list</span></h3>
        ${histTable(hist.history.slice(0, 6))}
      </div>
    </div>
    <div class="card"><h3>Campus Road Network <span class="sub">${sy.roadSegments} road segments · ${sy.locations} locations</span></h3>
      <div class="graph-wrap">${graphSVG(graph.nodes, graph.edges, {})}</div>
    </div>`;
};

function statCard(k, v, color, d) {
  return `<div class="card stat ${color}"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span><span class="d">${esc(d)}</span></div>`;
}
function prioTable(list) {
  if (!list || !list.length) return `<div class="empty">No bins need collection.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>#</th><th>Bin</th><th>Location</th><th>Fill</th><th class="right">Priority</th></tr></thead><tbody>
    ${list.map((b, i) => `<tr><td class="mono">${i + 1}</td><td><b>${esc(b.id)}</b></td><td>${esc(b.location)}</td><td>${barFor(b.fill)}</td><td class="right mono">${b.priorityText}</td></tr>`).join("")}
  </tbody></table></div>`;
}
function histTable(hist) {
  if (!hist || !hist.length) return `<div class="empty">No collection records yet.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Bin</th><th>Location</th><th>Details</th></tr></thead><tbody>
    ${hist.map((h) => `<tr><td><b>${esc(h.binId)}</b></td><td>${esc(h.location)}</td><td class="muted">${esc(h.description)}</td></tr>`).join("")}
  </tbody></table></div>`;
}

/* ---------------------- ADMIN: Manage Bins ---------------------- */
VIEWS.bins = async () => {
  const { bins } = await api("/api/bins");
  $("#view").innerHTML = `
    <div class="card">
      <h3>Add Bin <span class="sub">register a new smart bin</span></h3>
      <div class="form-row c4">
        <div class="field"><label>Bin ID</label><input id="bId" placeholder="B06" /></div>
        <div class="field"><label>Location</label><select id="bLoc">${options(LOCS)}</select></div>
        <div class="field"><label>Fill %</label><input id="bFill" type="number" min="0" max="100" value="0" /></div>
        <div class="field"><label>Fill Rate %/h</label><input id="bRate" type="number" min="0" value="1" /></div>
      </div>
      <button class="btn btn-primary" id="bAdd" style="margin-top:14px">Add Bin</button>
    </div>
    <div class="card">
      <h3>All Bins <span class="sub">${bins.length} bins</span></h3>
      ${binsTable(bins)}
    </div>`;
  $("#bAdd").addEventListener("click", async () => {
    try {
      const r = await api("/api/bins", "POST", { id: $("#bId").value.trim(), location: $("#bLoc").value, fill: Number($("#bFill").value), rate: Number($("#bRate").value) });
      if (r.warning) toast(r.warning, "warn"); else toast("Bin added successfully.");
      renderView("bins");
    } catch (e) { toast(e.message, "error"); }
  });
  wireBinRows();
};

function binsTable(bins) {
  if (!bins.length) return `<div class="empty">No bins available.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Location</th><th>Fill</th><th>Rate</th><th>Status</th><th>Priority</th><th>Collection</th><th></th></tr></thead><tbody>
    ${bins.map((b) => `<tr data-bin="${esc(b.id)}">
      <td><b>${esc(b.id)}</b></td><td>${esc(b.location)}</td>
      <td>${barFor(b.fill)}</td><td class="mono">${Number(b.rate).toFixed(1)}</td>
      <td>${badge(b.status)}</td><td class="mono">${b.priorityText}</td><td>${badge(b.collection)}</td>
      <td class="right nowrap">
        <button class="btn btn-sm btn-info" data-act="edit">Edit</button>
        <button class="btn btn-sm btn-danger" data-act="del">Delete</button>
      </td></tr>`).join("")}
  </tbody></table></div>`;
}
function wireBinRows() {
  $$("tr[data-bin]").forEach((tr) => {
    const id = tr.dataset.bin;
    const edit = $('[data-act="edit"]', tr), del = $('[data-act="del"]', tr);
    if (edit) edit.addEventListener("click", () => openBinEdit(id));
    if (del) del.addEventListener("click", async () => {
      if (!confirm("Delete bin " + id + "?")) return;
      try { await api("/api/bins/" + encodeURIComponent(id), "DELETE"); toast("Bin deleted."); renderView("bins"); }
      catch (e) { toast(e.message, "error"); }
    });
  });
}
function openBinEdit(id) {
  const m = el(`<div class="modal-back"><div class="modal">
    <h3>Update Bin ${esc(id)}</h3>
    <div class="form-row c2">
      <div class="field"><label>New Fill %</label><input id="mFill" type="number" min="0" max="100" /></div>
      <div class="field"><label>New Fill Rate %/h</label><input id="mRate" type="number" min="0" /></div>
    </div>
    <div class="modal-actions"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" data-save>Save</button></div>
  </div></div>`);
  $("#modalRoot").appendChild(m);
  const close = () => m.remove();
  $("[data-close]", m).addEventListener("click", close);
  m.addEventListener("click", (e) => { if (e.target === m) close(); });
  $("[data-save]", m).addEventListener("click", async () => {
    try {
      const body = {};
      if ($("#mFill", m).value !== "") body.fill = Number($("#mFill", m).value);
      if ($("#mRate", m).value !== "") body.rate = Number($("#mRate", m).value);
      await api("/api/bins/" + encodeURIComponent(id), "PUT", body);
      toast("Bin updated."); close(); renderView("bins");
    } catch (e) { toast(e.message, "error"); }
  });
}

/* ---------------------- ADMIN: Users ---------------------- */
VIEWS.users = async () => {
  const { users } = await api("/api/users");
  $("#view").innerHTML = `
    <div class="card">
      <h3>Add Account <span class="sub">student details apply to User role</span></h3>
      <div class="form-row c4">
        <div class="field"><label>Username</label><input id="uUser" placeholder="username" /></div>
        <div class="field"><label>Password</label><input id="uPass" placeholder="password" /></div>
        <div class="field"><label>Full Name</label><input id="uName" placeholder="Full name" /></div>
        <div class="field"><label>Role</label><select id="uRole"><option>User</option><option>Driver</option><option>Admin</option></select></div>
      </div>
      <div class="form-row c4" style="margin-top:12px">
        <div class="field"><label>Student ID / Roll</label><input id="uRoll" placeholder="e.g. 2107001" /></div>
        <div class="field"><label>Department</label><select id="uDept">${deptOptions()}</select></div>
        <div class="field"><label>Batch</label><input id="uBatch" placeholder="e.g. 2K22" /></div>
        <div class="field"><label>Year / Semester</label>
          <div style="display:flex;gap:8px">
            <select id="uYear">${yearOptions()}</select>
            <select id="uSemester">${semesterOptions()}</select>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" id="uAdd" style="margin-top:14px">Add Account</button>
    </div>
    <div class="card"><h3>Registered Users <span class="sub">${users.length} accounts</span></h3>
      <div class="table-wrap"><table><thead><tr><th>#</th><th>Username</th><th>Name</th><th>Role</th><th>Dept</th><th>Batch</th><th>Year</th><th>Sem</th><th></th></tr></thead><tbody>
        ${users.map((u, i) => `<tr data-user="${esc(u.username)}"><td class="mono">${i + 1}</td><td><b>${esc(u.username)}</b></td><td>${esc(u.name)}</td>
          <td><span class="badge role">${esc(u.role)}</span></td>
          <td>${u.department ? esc(u.department) : '<span class="muted">—</span>'}</td>
          <td>${u.batch ? esc(u.batch) : '<span class="muted">—</span>'}</td>
          <td>${u.year ? esc(u.year) : '<span class="muted">—</span>'}</td>
          <td>${u.semester ? esc(u.semester) : '<span class="muted">—</span>'}</td>
          <td class="right"><button class="btn btn-sm btn-danger" data-del>Delete</button></td></tr>`).join("")}
      </tbody></table></div>
    </div>`;
  $("#uAdd").addEventListener("click", async () => {
    try {
      const r = await api("/api/users", "POST", {
        username: $("#uUser").value.trim(), password: $("#uPass").value, name: $("#uName").value.trim(), role: $("#uRole").value,
        studentId: $("#uRoll").value.trim(), department: $("#uDept").value, batch: $("#uBatch").value.trim(),
        year: $("#uYear").value, semester: $("#uSemester").value,
      });
      toast(r.message); renderView("users");
    } catch (e) { toast(e.message, "error"); }
  });
  $$("tr[data-user]").forEach((tr) => {
    $("[data-del]", tr).addEventListener("click", async () => {
      const un = tr.dataset.user;
      if (!confirm("Delete user " + un + "?")) return;
      try { const r = await api("/api/users/" + encodeURIComponent(un), "DELETE"); toast(r.message); renderView("users"); }
      catch (e) { toast(e.message, "error"); }
    });
  });
};
function deptOptions(selected) {
  return ['<option value="">—</option>'].concat(DEPARTMENTS.map((d) => `<option ${d === selected ? "selected" : ""}>${esc(d)}</option>`)).join("");
}
function yearOptions(selected) {
  return ['<option value="">—</option>'].concat(YEARS.map((y) => `<option value="${y}" ${y === selected ? "selected" : ""}>${y}</option>`)).join("");
}
function semesterOptions(selected) {
  return ['<option value="">—</option>'].concat(SEMESTERS.map((s) => `<option ${s === selected ? "selected" : ""}>${s}</option>`)).join("");
}

/* ---------------------- ADMIN: Requests ---------------------- */
VIEWS.requests = async () => {
  const [{ requests }, { users }, { bins }] = await Promise.all([api("/api/requests"), api("/api/users"), api("/api/bins")]);
  const drivers = users.filter((u) => u.role === "Driver");
  $("#view").innerHTML = `
    <div class="card">
      <h3>Create Collection Request</h3>
      <div class="form-row c2">
        <div class="field"><label>Bin</label><select id="rBin">${bins.map((b) => `<option value="${esc(b.id)}">${esc(b.id)} · ${esc(b.location)} (${Number(b.fill).toFixed(0)}%)</option>`).join("")}</select></div>
        <div class="field"><label>Requested By</label><input id="rBy" placeholder="username" value="${esc(SESSION.username)}" /></div>
      </div>
      <button class="btn btn-primary" id="rCreate" style="margin-top:14px">Create Request</button>
    </div>
    <div class="card"><h3>All Requests <span class="sub">${requests.length} total</span></h3>
      ${requestsTable(requests, drivers)}
    </div>`;
  $("#rCreate").addEventListener("click", async () => {
    try { const r = await api("/api/requests", "POST", { binId: $("#rBin").value, username: $("#rBy").value.trim() }); toast(r.message); renderView("requests"); }
    catch (e) { toast(e.message, "error"); }
  });
  wireRequestRows(drivers);
};

function requestsTable(requests, drivers) {
  if (!requests.length) return `<div class="empty">No requests yet.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Bin</th><th>Location</th><th>Priority</th><th>By</th><th>Driver</th><th>Status</th><th></th></tr></thead><tbody>
    ${requests.map((r) => `<tr data-req="${esc(r.requestId)}">
      <td><b>${esc(r.requestId)}</b></td><td>${esc(r.binId)}</td><td>${esc(r.location)}</td>
      <td><span class="badge role">${esc(r.priority)}</span></td>
      <td>${esc(r.requestedBy)}</td><td>${r.assignedDriver ? esc(r.assignedDriver) : '<span class="muted">—</span>'}</td>
      <td>${badge(r.status)}</td>
      <td class="right nowrap">
        ${(r.status === "Pending" || r.status === "Assigned") ? `
          <select data-assign style="width:auto;display:inline-block;padding:6px 8px;font-size:12.5px">
            <option value="">Assign…</option>${drivers.map((d) => `<option value="${esc(d.username)}">${esc(d.username)}</option>`).join("")}
          </select>
          <button class="btn btn-sm btn-warn" data-cancel>Cancel</button>` : ""}
      </td></tr>`).join("")}
  </tbody></table></div>`;
}
function wireRequestRows(drivers) {
  $$("tr[data-req]").forEach((tr) => {
    const id = tr.dataset.req;
    const sel = $("[data-assign]", tr);
    if (sel) sel.addEventListener("change", async () => {
      if (!sel.value) return;
      try { const r = await api("/api/requests/" + encodeURIComponent(id) + "/assign", "POST", { driver: sel.value }); toast(r.message); renderView("requests"); }
      catch (e) { toast(e.message, "error"); }
    });
    const can = $("[data-cancel]", tr);
    if (can) can.addEventListener("click", async () => {
      try { const r = await api("/api/requests/" + encodeURIComponent(id) + "/cancel", "POST", {}); toast(r.message); renderView("requests"); }
      catch (e) { toast(e.message, "error"); }
    });
  });
}

/* ---------------------- ADMIN: History ---------------------- */
VIEWS.history = async () => {
  const { history } = await api("/api/history");
  $("#view").innerHTML = `
    <div class="card">
      <h3>Search / Delete Record</h3>
      <div class="form-row c3">
        <div class="field"><label>Bin ID</label><input id="hBin" placeholder="B01" /></div>
        <button class="btn btn-info" id="hSearch">Search</button>
        <button class="btn btn-danger" id="hDel">Delete Record</button>
      </div>
    </div>
    <div class="card"><h3>Collection History <span class="sub">${history.length} records</span></h3>${histTable(history)}</div>`;
  $("#hSearch").addEventListener("click", async () => {
    try { const r = await api("/api/history/search?binId=" + encodeURIComponent($("#hBin").value.trim())); toast("Record found: Bin " + r.record.binId + " | " + r.record.location + " | " + r.record.description); }
    catch (e) { toast(e.message, "error"); }
  });
  $("#hDel").addEventListener("click", async () => {
    const id = $("#hBin").value.trim();
    if (!confirm("Delete a history record for bin " + id + "?")) return;
    try { const r = await api("/api/history?binId=" + encodeURIComponent(id), "DELETE"); toast(r.message); renderView("history"); }
    catch (e) { toast(e.message, "error"); }
  });
};

/* ---------------------- ADMIN: Graph ---------------------- */
VIEWS.graph = async () => {
  destroyLiveMap();
  const [g, metaR, bldR, rdR, nodesR] = await Promise.all([
    api("/api/graph"), api("/api/map/metadata"), api("/api/map/buildings"),
    api("/api/map/roads"), api("/api/map/nodes"),
  ]);
  const meta = metaR.metadata || {};
  const buildings = bldR.features || [];
  const osmRoads = rdR.features || [];
  const cmap = nodesR.nodes || {};
  const coordOf = (n) => { const c = cmap[n]; return c && c.lat != null && c.lng != null ? [c.lat, c.lng] : null; };
  const missing = g.nodes.filter((n) => !coordOf(n));
  const drawable = g.edges.filter((e) => coordOf(e.a) && coordOf(e.b));
  const roadRows = g.edges.slice().sort((a, b) => (a.a + a.b).localeCompare(b.a + b.b));
  const canMap = !!window.L;
  const mode0 = canMap ? "map" : "schematic";

  $("#view").innerHTML = `
    <div class="grid cols-2">
      <div class="card"><h3>Add Road</h3>
        <div class="form-row c3">
          <div class="field"><label>First Location</label><select id="gFrom">${options(LOCS)}</select></div>
          <div class="field"><label>Second Location</label><select id="gTo">${options(LOCS)}</select></div>
          <div class="field"><label>Distance (km)</label><input id="gW" type="number" step="0.05" value="0.20" /></div>
        </div>
        <button class="btn btn-primary" id="gAdd" style="margin-top:14px">Add Road</button>
      </div>
      <div class="card"><h3>Traversal</h3>
        <div class="form-row c3">
          <div class="field"><label>Start Location</label><select id="tStart">${options(LOCS, "Main Gate")}</select></div>
          <button class="btn btn-info" id="bfsBtn">BFS</button>
          <button class="btn btn-info" id="dfsBtn">DFS</button>
        </div>
        <div class="form-row c3" style="margin-top:12px">
          <div class="field"><label>From</label><select id="dFrom">${options(LOCS, "Main Gate")}</select></div>
          <div class="field"><label>To</label><select id="dTo">${options(LOCS, "IT Park")}</select></div>
          <button class="btn btn-primary" id="dijBtn">Shortest Path</button>
        </div>
      </div>
    </div>
    <div class="card">
      <h3>Campus Road Network <span class="sub">${g.edges.length} road segments &middot; ${g.nodes.length} locations &middot; ${drawable.length} drawn on the real map</span></h3>
      <div class="map-toolbar">
        <div class="map-controls">
          <button class="btn btn-sm ${mode0 === "map" ? "btn-primary" : "btn-ghost"}" id="gModeMap">&#9707; Real map (OSM)</button>
          <button class="btn btn-sm ${mode0 === "schematic" ? "btn-primary" : "btn-ghost"}" id="gModeSchematic">&#11041; Schematic</button>
        </div>
        <span class="spacer"></span>
        <span class="map-sub">${canMap ? "Campus graph over an OpenStreetMap base layer" : "Leaflet unavailable &mdash; showing the schematic"}</span>
      </div>
      ${canMap ? `
      <div class="place-banner hidden" id="gPlaceBanner">
        <span>Click the map to set <b id="gPlaceName"></b></span>
        <button class="btn btn-sm btn-ghost" id="gPlaceCancel">Cancel</button>
      </div>
      <div class="leaflet-map graph-map${mode0 === "map" ? "" : " hidden"}" id="graphMap"></div>` : ""}
      <div class="graph-wrap${mode0 === "schematic" ? "" : " hidden"}" id="graphBox">${graphSVG(g.nodes, g.edges, {})}</div>
      <div class="legend">
        <span><i class="n-def"></i>Campus node</span>
        <span><i class="n-src"></i>Source</span>
        <span><i class="n-path"></i>Route</span>
        <span><i class="n-visit"></i>Visited</span>
        <span><i class="n-dst"></i>Destination</span>
        <span><i class="edge"></i>Road segment (km on hover)</span>
      </div>
      ${canMap ? `<div class="hint" style="margin-top:8px">Straight lines are the abstract campus graph (the km weights shown in the table below); the faint network underneath is real OpenStreetMap road geometry. &copy; OpenStreetMap contributors, ODbL 1.0</div>` : ""}
      <div id="graphOut" style="margin-top:16px"></div>
    </div>
    ${missing.length ? `
    <div class="card"><h3>Not yet mapped <span class="sub">${missing.length} of ${g.nodes.length}</span></h3>
      <div class="mini-list">${missing.map((n) => {
        const note = cmap[n] && cmap[n].note ? cmap[n].note : "";
        return `<div class="mini-row"><span><span class="nm">${esc(n)}</span>${note ? `<br><span class="hint">${esc(note)}</span>` : ""}</span>
          ${canMap ? `<button class="btn btn-sm btn-ghost" data-place-node="${esc(n)}">Set</button>` : ""}</div>`;
      }).join("")}</div>
      ${canMap ? `<div class="hint" style="margin-top:8px">These locations are not named objects in OpenStreetMap. Click <b>Set</b>, then click the exact spot on the map.</div>` : ""}
    </div>` : ""}
    <div class="card"><h3>Road Segments <span class="sub">${g.edges.length} segments</span></h3>
      <div class="table-wrap"><table><thead><tr><th>From</th><th>To</th><th class="right">Distance (km)</th><th>On real map</th></tr></thead><tbody>
        ${roadRows.map((e) => {
          const okA = coordOf(e.a), okB = coordOf(e.b);
          const needs = [okA ? null : e.a, okB ? null : e.b].filter(Boolean);
          return `<tr><td>${esc(e.a)}</td><td>${esc(e.b)}</td><td class="right mono">${Number(e.weight).toFixed(2)}</td>
            <td>${okA && okB ? `<span class="mapped-yes">&#10003; drawn</span>` : `<span class="td-hint">needs ${esc(needs.join(" and "))}</span>`}</td></tr>`;
        }).join("")}
      </tbody></table></div>
    </div>`;

  /* --------------------------- Leaflet map --------------------------- */
  let map = null, edgesL = null, nodesL = null, bounds = null;
  let mode = mode0;
  if (canMap) {
    const built = createBaseMap($("#graphMap"), meta);
    map = built.map; bounds = built.bounds;
    LM.map = map;
    L.geoJSON({ type: "FeatureCollection", features: buildings }, {
      style: () => ({ color: "#6f8bb0", weight: 1, fillColor: "#1b2a44", fillOpacity: 0.5 }),
    }).addTo(map);
    L.geoJSON({ type: "FeatureCollection", features: osmRoads }, { style: (f) => roadStyle(f.properties) }).addTo(map);
    edgesL = L.layerGroup().addTo(map);
    nodesL = L.layerGroup().addTo(map);
    LM.graphEdges = edgesL; LM.graphNodes = nodesL;
  }

  function drawGraph(marks) {
    const mk = marks || {};
    $("#graphBox").innerHTML = graphSVG(g.nodes, g.edges, mk);
    if (!map) return;
    const pathSet = new Set(mk.path || []);
    const pe = mk.pathEdges || new Set();
    const visits = mk.visits || {};
    const colorOf = (n) => {
      if (mk.start === n) return "#22c55e";
      if (mk.target === n) return "#f59e0b";
      if (pathSet.has(n)) return "#0ea5e9";
      if (visits[n] !== undefined) return "#8b5cf6";
      return "#3f7fd6";
    };
    edgesL.clearLayers(); nodesL.clearLayers();
    for (const e of g.edges) {
      const a = coordOf(e.a), b = coordOf(e.b);
      if (!a || !b) continue;
      const onPath = pe.has(e.a + "|" + e.b);
      L.polyline([a, b], {
        color: onPath ? "#22c55e" : "#9aa7bb",
        weight: onPath ? 5 : 3,
        opacity: onPath ? 0.95 : 0.8,
        dashArray: onPath ? null : "7 5",
      }).bindTooltip(`${e.a} → ${e.b} · ${Number(e.weight).toFixed(2)} km`, { sticky: true }).addTo(edgesL);
    }
    for (const n of g.nodes) {
      const c = coordOf(n); if (!c) continue;
      const order = visits[n];
      const m = L.circleMarker(c, { radius: 11, color: "#0b1220", weight: 2, fillColor: colorOf(n), fillOpacity: 0.95 });
      m.bindTooltip(order !== undefined ? `${n} · ${order}` : n, { permanent: true, direction: "top", className: "wx-lbl", offset: [0, -14] });
      const rows = [
        `<tr><td>Coordinates</td><td>${c[0].toFixed(6)}, ${c[1].toFixed(6)}</td></tr>`,
        `<tr><td>Coordinates source</td><td>${esc(cmap[n].source || "OpenStreetMap")}</td></tr>`,
      ];
      if (order !== undefined) rows.push(`<tr><td>Visit order</td><td>${order}</td></tr>`);
      m.bindPopup(`<h4>${esc(n)}</h4><table>${rows.join("")}</table>`);
      m.addTo(nodesL);
    }
  }

  function setMode(m) {
    if (!map) return;
    mode = m;
    $("#gModeMap").className = "btn btn-sm " + (m === "map" ? "btn-primary" : "btn-ghost");
    $("#gModeSchematic").className = "btn btn-sm " + (m === "schematic" ? "btn-primary" : "btn-ghost");
    $("#graphMap").classList.toggle("hidden", m !== "map");
    $("#graphBox").classList.toggle("hidden", m !== "schematic");
    if (m === "map") { map.invalidateSize(); if (bounds) map.fitBounds(bounds.pad(0.05)); }
  }

  $("#gModeMap").addEventListener("click", () => setMode("map"));
  $("#gModeSchematic").addEventListener("click", () => setMode("schematic"));

  if (canMap) {
    const plc = manualPlacer({
      map, stage: $("#graphMap"), banner: $("#gPlaceBanner"), label: $("#gPlaceName"),
      cancelBtn: $("#gPlaceCancel"), onSaved: () => renderView("graph"),
    });
    $$("[data-place-node]").forEach((btn) => btn.addEventListener("click", () => plc.begin("node", btn.dataset.placeNode)));
    drawGraph({});
  }

  $("#gAdd").addEventListener("click", async () => {
    try { const r = await api("/api/graph/road", "POST", { from: $("#gFrom").value, to: $("#gTo").value, weight: Number($("#gW").value) }); toast(r.message); renderView("graph"); }
    catch (e) { toast(e.message, "error"); }
  });
  $("#bfsBtn").addEventListener("click", () => runTraversal("bfs"));
  $("#dfsBtn").addEventListener("click", () => runTraversal("dfs"));
  $("#dijBtn").addEventListener("click", async () => {
    try {
      const r = await api(`/api/graph/dijkstra?from=${encodeURIComponent($("#dFrom").value)}&to=${encodeURIComponent($("#dTo").value)}`);
      drawGraph({ path: r.path, pathEdges: pathEdgesFrom(r.path), start: r.from, target: r.to });
      $("#graphOut").innerHTML = routeCard(r.from, r.to, r.path, r.distance);
    } catch (e) { toast(e.message, "error"); }
  });

  async function runTraversal(kind) {
    try {
      const start = $("#tStart").value;
      const r = await api(`/api/graph/${kind}?start=${encodeURIComponent(start)}`);
      const visits = {}; r.order.forEach((n, i) => (visits[n] = i + 1));
      drawGraph({ start, visits });
      $("#graphOut").innerHTML = `<div class="card" style="box-shadow:none">
        <h3>${kind.toUpperCase()} Visit Order <span class="sub">from ${esc(start)}</span></h3>
        <div class="chips">${r.order.map((n, i) => `<span class="chip">${i + 1}. ${esc(n)}</span>`).join("")}</div>
      </div>`;
    } catch (e) { toast(e.message, "error"); }
  }
};

function routeCard(from, to, path, distance) {
  let legs = "";
  for (let i = 0; i < path.length - 1; i++) legs += `<span>${esc(path[i])}</span><span class="arrow">→</span>`;
  legs += `<span>${esc(path[path.length - 1])}</span>`;
  return `<div class="card" style="box-shadow:none">
    <h3>Shortest Route <span class="sub">Dijkstra</span></h3>
    <div class="step">
      <div class="step-head"><strong>${esc(from)} → ${esc(to)}</strong><span class="chip">${Number(distance).toFixed(2)} km</span></div>
      <div class="route-line">${legs}</div>
    </div>
  </div>`;
}

/* ---------------------- ADMIN: Search & Sort ---------------------- */
VIEWS.searchsort = async () => {
  $("#view").innerHTML = `
    <div class="grid cols-2">
      <div class="card"><h3>Sort Bins</h3>
        <div class="form-row c2">
          <div class="field"><label>Sort Key</label><select id="sKey">
            <option value="fill">Fill Level</option><option value="rate">Fill Rate</option>
            <option value="priority">Priority</option><option value="id">Bin ID</option></select></div>
          <div class="field"><label>Order</label><select id="sDir"><option value="1">Descending</option><option value="0">Ascending</option></select></div>
        </div>
        <button class="btn btn-primary" id="sGo" style="margin-top:14px">Sort (Merge Sort)</button>
      </div>
      <div class="card"><h3>Binary Search</h3>
        <div class="form-row c2">
          <div class="field"><label>Bin ID</label><input id="bsId" placeholder="B03" /></div>
          <button class="btn btn-info" id="bsGo">Search</button>
        </div>
      </div>
    </div>
    <div class="card" id="ssOut"><h3>Result</h3><div class="empty">Choose a sort key or search for a bin.</div></div>`;
  $("#sGo").addEventListener("click", async () => {
    const r = await api(`/api/bins/sort?key=${$("#sKey").value}&desc=${$("#sDir").value}`);
    $("#ssOut").innerHTML = `<h3>Sorted Bins <span class="sub">by ${esc(r.key)} · ${r.descending ? "descending" : "ascending"}</span></h3>
      <div class="table-wrap"><table><thead><tr><th>#</th><th>ID</th><th>Location</th><th>Fill</th><th>Rate</th><th>Priority</th><th>Status</th></tr></thead><tbody>
      ${r.bins.map((b, i) => `<tr><td class="mono">${i + 1}</td><td><b>${esc(b.id)}</b></td><td>${esc(b.location)}</td><td class="mono">${Number(b.fill).toFixed(0)}%</td><td class="mono">${Number(b.rate).toFixed(1)}</td><td class="mono">${b.priorityText}</td><td>${badge(b.status)}</td></tr>`).join("")}
      </tbody></table></div>`;
  });
  $("#bsGo").addEventListener("click", async () => {
    try {
      const r = await api("/api/bins/search?id=" + encodeURIComponent($("#bsId").value.trim()));
      if (r.found) {
        const b = r.bin;
        $("#ssOut").innerHTML = `<h3>Bin Found <span class="sub">after ${r.steps} comparisons</span></h3>
          <div class="grid cols-3">
            <div class="card stat green"><span class="k">Bin</span><span class="v">${esc(b.id)}</span><span class="d">${esc(b.location)}</span></div>
            <div class="card stat ${b.fill >= 90 ? "red" : b.fill >= 50 ? "amber" : "green"}"><span class="k">Fill</span><span class="v">${Number(b.fill).toFixed(0)}%</span><span class="d">${esc(b.status)}</span></div>
            <div class="card stat blue"><span class="k">Priority</span><span class="v">${b.priorityText}</span><span class="d">rate ${Number(b.rate).toFixed(1)}%/h</span></div>
          </div>`;
      } else {
        $("#ssOut").innerHTML = `<h3>Not Found <span class="sub">after ${r.steps} comparisons</span></h3><div class="empty">No bin matches that ID.</div>`;
      }
    } catch (e) { toast(e.message, "error"); }
  });
};

/* ---------------------- ADMIN: Statistics ---------------------- */
VIEWS.stats = async () => {
  const s = await api("/api/stats");
  const b = s.bin, c = s.collection, sy = s.system;
  $("#view").innerHTML = `
    <div class="grid cols-3">
      ${statCard("Total Bins", b.total, "green", "Registered bins")}
      ${statCard("Average Fill", Number(b.average).toFixed(1) + "%", b.average >= 50 ? "amber" : "green", "Across all bins")}
      ${statCard("Road Segments", sy.roadSegments, "blue", "Graph edges")}
    </div>
    <div class="grid cols-2">
      <div class="card"><h3>Bin Statistics</h3>
        <div class="table-wrap"><table><tbody>
          ${row("Total Bins", b.total)}${row("Critical", b.critical)}${row("High", b.high)}${row("Moderate", b.moderate)}${row("Normal", b.normal)}${row("Average Fill", Number(b.average).toFixed(1) + "%")}
        </tbody></table></div>
      </div>
      <div class="card"><h3>Collection Statistics</h3>
        <div class="table-wrap"><table><tbody>
          ${row("Pending Requests", c.pending)}${row("Assigned Requests", c.assigned)}${row("Completed Requests", c.completed)}${row("Cancelled Requests", c.cancelled)}
        </tbody></table></div>
      </div>
    </div>
    <div class="card"><h3>System</h3>
      <div class="grid cols-4">
        ${statCard("Locations", sy.locations, "violet", "Campus nodes")}
        ${statCard("Road Segments", sy.roadSegments, "blue", "Connections")}
        ${statCard("Registered Users", sy.registeredUsers, "green", "All roles")}
        ${statCard("Collection Records", sy.collectionRecords, "amber", "History entries")}
      </div>
    </div>`;
};
function row(k, v) { return `<tr><td>${esc(k)}</td><td class="right mono"><b>${esc(v)}</b></td></tr>`; }

/* ---------------------- ADMIN: Overview ---------------------- */
VIEWS.overview = async () => {
  const [stats, bins, users, requests, history, prio, graph] = await Promise.all([
    api("/api/stats"), api("/api/bins"), api("/api/users"), api("/api/requests"), api("/api/history"), api("/api/priority"), api("/api/graph"),
  ]);
  $("#view").innerHTML = `
    <div class="grid cols-4">
      ${statCard("Bins", stats.bin.total, "green", "Monitored")}
      ${statCard("Active Requests", stats.collection.pending + stats.collection.assigned, "blue", "In progress")}
      ${statCard("Users", stats.system.registeredUsers, "violet", "All roles")}
      ${statCard("History", stats.system.collectionRecords, "amber", "Collections logged")}
    </div>
    <div class="card"><h3>Bin Status <span class="sub">${bins.bins.length}</span></h3>${binsTable(bins.bins)}</div>
    <div class="grid cols-2">
      <div class="card"><h3>Priority Queue</h3>${prioTable(prio.queue)}</div>
      <div class="card"><h3>Registered Users</h3>
        <div class="table-wrap"><table><thead><tr><th>Username</th><th>Name</th><th>Role</th></tr></thead><tbody>
          ${users.users.map((u) => `<tr><td><b>${esc(u.username)}</b></td><td>${esc(u.name)}</td><td><span class="badge role">${esc(u.role)}</span></td></tr>`).join("")}
        </tbody></table></div>
      </div>
    </div>
    <div class="card"><h3>Active Requests &amp; Queue</h3>
      ${requestsTable(requests.requests.filter((r) => r.status === "Pending" || r.status === "Assigned"), users.users.filter((u) => u.role === "Driver"))}
      <p class="muted" style="margin-top:12px">Pending Request Queue (FIFO): ${requests.requests.length ? "" : ""}${(await queueNames()) || "Empty"}</p>
    </div>
    <div class="card"><h3>Campus Network <span class="sub">BST in-order + adjacency</span></h3>
      <div class="graph-wrap">${graphSVG(graph.nodes, graph.edges, {})}</div>
    </div>`;
  wireRequestRows(users.users.filter((u) => u.role === "Driver"));
};
async function queueNames() {
  const s = await api("/api/state");
  return s.queue.length ? s.queue.map((b) => `<span class="chip muted">${esc(b)}</span>`).join(" ") : "";
}

/* ---------------------- USER: Dashboard ---------------------- */
VIEWS.udashboard = async () => {
  const [bins, mine] = await Promise.all([api("/api/bins"), api("/api/requests/by-user?username=" + encodeURIComponent(SESSION.username))]);
  const active = mine.requests.filter((r) => r.status === "Pending" || r.status === "Assigned").length;
  const full = bins.bins.filter((b) => b.fill >= 75).length;
  const p = SESSION;
  const profile = [
    ["Student ID / Roll", p.studentId], ["Department", p.department],
    ["Batch", p.batch], ["Year", p.year], ["Semester", p.semester],
  ].filter(([, v]) => v);
  $("#view").innerHTML = `
    ${profile.length ? `<div class="card"><h3>My Profile</h3>
      <div class="chips">${profile.map(([k, v]) => `<span class="chip muted">${esc(k)}: <b>${esc(v)}</b></span>`).join("")}</div></div>` : ""}
    <div class="grid cols-3">
      ${statCard("Bins Nearby", bins.bins.length, "green", "Across campus")}
      ${statCard("My Active Requests", active, "blue", "Being handled")}
      ${statCard("Bins Needing Attention", full, "red", "75%+ full")}
    </div>
    <div class="card"><h3>Bin Snapshot</h3>
      <div class="table-wrap"><table><thead><tr><th>ID</th><th>Location</th><th>Fill</th><th>Status</th><th>Priority</th></tr></thead><tbody>
        ${bins.bins.map((b) => `<tr><td><b>${esc(b.id)}</b></td><td>${esc(b.location)}</td><td>${barFor(b.fill)}</td><td>${badge(b.status)}</td><td class="mono">${b.priorityText}</td></tr>`).join("")}
      </tbody></table></div>
    </div>`;
};

/* ---------------------- USER: Nearby ---------------------- */
VIEWS.nearby = async () => {
  $("#view").innerHTML = `
    <div class="card"><h3>Find Nearby Bins</h3>
      <div class="form-row c2">
        <div class="field"><label>Your Location</label><select id="nFrom">${options(LOCS, "Cafeteria")}</select></div>
        <button class="btn btn-primary" id="nGo">Find</button>
      </div>
    </div>
    <div class="card" id="nOut"><div class="empty">Choose your location to see nearby bins.</div></div>`;
  $("#nGo").addEventListener("click", async () => {
    try {
      const r = await api("/api/graph/nearby?from=" + encodeURIComponent($("#nFrom").value));
      $("#nOut").innerHTML = `<h3>Nearby Bins from ${esc(r.from)} <span class="sub">Dijkstra distance</span></h3>
        <div class="table-wrap"><table><thead><tr><th>#</th><th>Bin</th><th>Location</th><th>Fill</th><th>Status</th><th class="right">Distance</th></tr></thead><tbody>
        ${r.bins.map((b, i) => `<tr><td class="mono">${i + 1}</td><td><b>${esc(b.id)}</b></td><td>${esc(b.location)}</td><td>${barFor(b.fill)}</td><td>${badge(b.status)}</td><td class="right mono">${b.distance >= 1e9 ? "unreachable" : Number(b.distance).toFixed(2) + " km"}</td></tr>`).join("")}
        </tbody></table></div>`;
    } catch (e) { toast(e.message, "error"); }
  });
};

/* ---------------------- USER: Search Bin ---------------------- */
VIEWS.searchbin = async () => {
  $("#view").innerHTML = `
    <div class="card"><h3>Search Bin by ID</h3>
      <div class="form-row c2">
        <div class="field"><label>Bin ID</label><input id="usId" placeholder="B03" /></div>
        <button class="btn btn-primary" id="usGo">Search</button>
      </div>
    </div>
    <div class="card" id="usOut"><div class="empty">Bins are sorted by ID then binary-searched.</div></div>`;
  $("#usGo").addEventListener("click", async () => {
    try {
      const r = await api("/api/bins/search?id=" + encodeURIComponent($("#usId").value.trim()));
      if (!r.found) return ($("#usOut").innerHTML = `<h3>Not Found <span class="sub">after ${r.steps} comparisons</span></h3><div class="empty">No bin matches that ID.</div>`);
      const b = r.bin;
      $("#usOut").innerHTML = `<h3>Bin Found <span class="sub">after ${r.steps} comparisons</span></h3>
        <div class="grid cols-3">
          <div class="card stat green"><span class="k">Bin</span><span class="v">${esc(b.id)}</span><span class="d">${esc(b.location)}</span></div>
          <div class="card stat amber"><span class="k">Fill</span><span class="v">${Number(b.fill).toFixed(0)}%</span><span class="d">${esc(b.status)}</span></div>
          <div class="card stat blue"><span class="k">Priority</span><span class="v">${b.priorityText}</span><span class="d">rate ${Number(b.rate).toFixed(1)}%/h</span></div>
        </div>`;
    } catch (e) { toast(e.message, "error"); }
  });
};

/* ---------------------- USER: Report Full ---------------------- */
VIEWS.report = async () => {
  const { bins } = await api("/api/bins");
  $("#view").innerHTML = `
    <div class="card"><h3>Report a Full Bin</h3>
      <div class="form-row c3">
        <div class="field"><label>Bin</label><select id="rfBin">${bins.map((b) => `<option value="${esc(b.id)}">${esc(b.id)} · ${esc(b.location)} (${Number(b.fill).toFixed(0)}%)</option>`).join("")}</select></div>
        <div class="field"><label>Raise request now?</label><select id="rfReq"><option value="1">Yes, create request</option><option value="0">No</option></select></div>
        <button class="btn btn-warn" id="rfGo">Report Full</button>
      </div>
    </div>
    <div class="card" id="rfOut"><div class="empty">Reporting marks the bin 100% full and can open a collection request.</div></div>`;
  $("#rfGo").addEventListener("click", async () => {
    try {
      const r = await api("/api/bins/" + encodeURIComponent($("#rfBin").value) + "/report-full", "POST", { username: SESSION.username, createRequest: $("#rfReq").value === "1" });
      let html = `<h3>Reported <span class="sub">${esc(r.message)}</span></h3>`;
      if (r.request) html += `<div class="step"><div class="step-head"><strong>${esc(r.request.requestId)}</strong>${badge(r.request.status)}</div>
        <p class="muted">Bin ${esc(r.request.binId)} · ${esc(r.request.location)} · Priority ${esc(r.request.priority)}</p></div>`;
      $("#rfOut").innerHTML = html;
      toast("Bin reported as FULL.");
    } catch (e) { toast(e.message, "error"); }
  });
};

/* ---------------------- USER: Create Request ---------------------- */
VIEWS.createreq = async () => {
  const { bins } = await api("/api/bins");
  $("#view").innerHTML = `
    <div class="card"><h3>Create Collection Request</h3>
      <div class="form-row c2">
        <div class="field"><label>Bin</label><select id="crBin">${bins.map((b) => `<option value="${esc(b.id)}">${esc(b.id)} · ${esc(b.location)} (${Number(b.fill).toFixed(0)}%)</option>`).join("")}</select></div>
        <button class="btn btn-primary" id="crGo">Create Request</button>
      </div>
    </div>
    <div class="card" id="crOut"><div class="empty">A request moves the bin into the pickup queue.</div></div>`;
  $("#crGo").addEventListener("click", async () => {
    try {
      const r = await api("/api/requests", "POST", { binId: $("#crBin").value, username: SESSION.username });
      $("#crOut").innerHTML = `<h3>Request Created <span class="sub">${esc(r.request.requestId)}</span></h3>
        <div class="step"><div class="step-head"><strong>${esc(r.request.requestId)}</strong>${badge(r.request.status)}</div>
        <p class="muted">Bin ${esc(r.request.binId)} · ${esc(r.request.location)} · Priority ${esc(r.request.priority)}</p></div>`;
      toast(r.message);
    } catch (e) { toast(e.message, "error"); }
  });
};

/* ---------------------- USER: My Requests ---------------------- */
VIEWS.myrequests = async () => {
  const r = await api("/api/requests/by-user?username=" + encodeURIComponent(SESSION.username));
  $("#view").innerHTML = `<div class="card"><h3>My Requests <span class="sub">${r.requests.length}</span></h3>
    ${userRequestsTable(r.requests)}</div>`;
};
function userRequestsTable(requests) {
  if (!requests.length) return `<div class="empty">You have no requests.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Bin</th><th>Location</th><th>Priority</th><th>Driver</th><th>Status</th></tr></thead><tbody>
    ${requests.map((r) => `<tr><td><b>${esc(r.requestId)}</b></td><td>${esc(r.binId)}</td><td>${esc(r.location)}</td><td><span class="badge role">${esc(r.priority)}</span></td><td>${r.assignedDriver ? esc(r.assignedDriver) : '<span class="muted">—</span>'}</td><td>${badge(r.status)}</td></tr>`).join("")}
  </tbody></table></div>`;
}

/* ---------------------- USER: Track ---------------------- */
VIEWS.track = async () => {
  $("#view").innerHTML = `
    <div class="card"><h3>Track Request</h3>
      <div class="form-row c2">
        <div class="field"><label>Request ID or Bin ID</label><input id="trKey" placeholder="R102 or B01" /></div>
        <button class="btn btn-primary" id="trGo">Track</button>
      </div>
    </div>
    <div class="card" id="trOut"><div class="empty">Enter a request ID (R###) or a bin ID (B##).</div></div>`;
  $("#trGo").addEventListener("click", async () => {
    try {
      const r = await api(`/api/requests/track?key=${encodeURIComponent($("#trKey").value.trim())}&username=${encodeURIComponent(SESSION.username)}`);
      const q = r.request;
      $("#trOut").innerHTML = `<h3>Request ${esc(q.requestId)}</h3>
        <div class="grid cols-3">
          <div class="card stat blue"><span class="k">Status</span><span class="v" style="font-size:20px">${esc(q.status)}</span><span class="d">by ${esc(q.requestedBy)}</span></div>
          <div class="card stat green"><span class="k">Bin</span><span class="v" style="font-size:20px">${esc(q.binId)}</span><span class="d">${esc(q.location)}</span></div>
          <div class="card stat violet"><span class="k">Driver</span><span class="v" style="font-size:20px">${q.assignedDriver ? esc(q.assignedDriver) : "—"}</span><span class="d">priority ${esc(q.priority)}</span></div>
        </div>`;
    } catch (e) { toast(e.message, "error"); }
  });
};

/* ---------------------- USER: History ---------------------- */
VIEWS.myhistory = async () => {
  const { history } = await api("/api/history");
  $("#view").innerHTML = `<div class="card"><h3>Campus Collection History <span class="sub">${history.length} records</span></h3>${histTable(history)}</div>`;
};

/* ---------------------- DRIVER: Dashboard ---------------------- */
VIEWS.ddashboard = async () => {
  const [st, assigned, prio] = await Promise.all([
    api("/api/state"), api("/api/requests/by-driver?username=" + encodeURIComponent(SESSION.username)), api("/api/priority"),
  ]);
  $("#view").innerHTML = `
    <div class="grid cols-3">
      ${statCard("My Assigned", assigned.requests.length, "blue", "Active tasks")}
      ${statCard("Bins To Collect", prio.queue.length, "amber", "Fill > 0")}
      ${statCard("Total Distance Ready", "—", "green", "Plan with smart route")}
    </div>
    <div class="grid cols-2">
      <div class="card"><h3>Current Location</h3>
        <div class="stat green"><span class="k">Truck Area</span><span class="v" style="font-size:24px">${esc(st.driverLocation)}</span></div>
      </div>
      <div class="card"><h3>Assigned Requests</h3>${userRequestsTable(assigned.requests)}</div>
    </div>
    <div class="card"><h3>Proposed Collection Priority</h3>${prioTable(prio.queue)}</div>`;
};

/* ---------------------- DRIVER: Assigned ---------------------- */
VIEWS.assigned = async () => {
  const r = await api("/api/requests/by-driver?username=" + encodeURIComponent(SESSION.username));
  $("#view").innerHTML = `<div class="card"><h3>Assigned Requests <span class="sub">${r.requests.length}</span></h3>${userRequestsTable(r.requests)}</div>`;
};

/* ---------------------- DRIVER: Priority ---------------------- */
VIEWS.priority = async () => {
  const r = await api("/api/priority");
  $("#view").innerHTML = `<div class="card"><h3>Proposed Collection Priority <span class="sub">max heap by priority = fill×0.6 + rate×0.4</span></h3>${prioTable(r.queue)}</div>`;
};

/* ---------------------- DRIVER: Smart collection ---------------------- */
VIEWS.smart = async () => {
  $("#view").innerHTML = `
    <div class="card"><h3>Smart Collection</h3>
      <p class="muted" style="margin-bottom:14px">The engine pops the highest-priority bin, routes to it with Dijkstra, collects, then returns to the start.</p>
      <div class="form-row c2">
        <div class="field"><label>Truck Starting Location</label><select id="scStart">${options(LOCS, "Main Gate")}</select></div>
        <button class="btn btn-primary" id="scGo">Start Smart Collection</button>
      </div>
    </div>
    <div id="scOut"></div>`;
  $("#scGo").addEventListener("click", async () => {
    $("#scOut").innerHTML = `<div class="empty">Running…</div>`;
    try {
      const r = await api("/api/smart-collect", "POST", { start: $("#scStart").value, driver: SESSION.username });
      const s = r.summary;
      let html = `<div class="grid cols-3" style="margin-bottom:18px">
        ${statCard("Bins Collected", s.binsCollected, "green", "Empty now")}
        ${statCard("Total Distance", Number(s.totalDistance).toFixed(2) + " km", "blue", "Round trip")}
        ${statCard("Starting Point", s.starting, "violet", "Returned home")}
      </div>`;
      if (s.order.length) html += `<div class="card"><h3>Collection Order</h3><div class="chips">${s.order.map((b, i) => `<span class="chip">${i + 1}. ${esc(b)}</span>`).join("")}</div></div>`;
      const routes = r.steps.filter((x) => x.type === "route");
      html += `<div class="card"><h3>Route Log <span class="sub">${routes.length} legs</span></h3><div class="steps">`;
      for (const st of r.steps) {
        if (st.type === "route") {
          html += stepRoute(st);
        } else if (st.type === "complete") {
          html += `<div class="step"><div class="step-head"><strong>✓ Collected ${esc(st.binId)}</strong>${badge("Completed")}</div>
            <p class="muted">${esc(st.location)} · was ${esc(st.previousFill)}% · driver ${esc(st.driver)} · request ${esc(st.requestId)}</p></div>`;
        } else if (st.type === "skip") {
          html += `<div class="step"><div class="step-head"><strong>${esc(st.binId)} unreachable</strong>${badge("NORMAL")}</div><p class="muted">Skipped ${esc(st.location)}</p></div>`;
        }
      }
      html += `</div></div>`;
      $("#scOut").innerHTML = html;
      toast("Smart collection complete.");
      REFRESH = () => renderView("smart");
    } catch (e) { $("#scOut").innerHTML = `<div class="empty">${esc(e.message)}</div>`; toast(e.message, "error"); }
  });
};
function stepRoute(st) {
  let legs = "";
  for (let i = 0; i < st.path.length - 1; i++) legs += `<span>${esc(st.path[i])}</span><span class="arrow">→</span>`;
  legs += `<span>${esc(st.path[st.path.length - 1])}</span>`;
  return `<div class="step"><div class="step-head"><strong>${st.returnHome ? "Return" : "Route"} ${esc(st.from)} → ${esc(st.to)}</strong><span class="chip">${Number(st.distance).toFixed(2)} km</span></div>
    <div class="route-line">${legs}</div></div>`;
}

/* ---------------------- DRIVER: Shortest route ---------------------- */
VIEWS.shortest = async () => {
  const g = await api("/api/graph");
  $("#view").innerHTML = `
    <div class="card"><h3>Find Shortest Route</h3>
      <div class="form-row c3">
        <div class="field"><label>Source</label><select id="sdFrom">${options(LOCS, "Main Gate")}</select></div>
        <div class="field"><label>Destination</label><select id="sdTo">${options(LOCS, "IT Park")}</select></div>
        <button class="btn btn-primary" id="sdGo">Find Route</button>
      </div>
    </div>
    <div class="card" id="sdOut"><div class="empty">Pick a source and destination.</div></div>`;
  $("#sdGo").addEventListener("click", async () => {
    try {
      const r = await api(`/api/graph/dijkstra?from=${encodeURIComponent($("#sdFrom").value)}&to=${encodeURIComponent($("#sdTo").value)}`);
      const pe = pathEdgesFrom(r.path);
      $("#sdOut").innerHTML = `<h3>Shortest Route</h3>
        <div class="graph-wrap" style="margin-bottom:16px">${graphSVG(g.nodes, g.edges, { path: r.path, pathEdges: pe, start: r.from, target: r.to })}</div>
        ${routeCard(r.from, r.to, r.path, r.distance)}`;
    } catch (e) { toast(e.message, "error"); }
  });
};

/* ---------------------- DRIVER: Collect Bin ---------------------- */
VIEWS.collect = async () => {
  const { bins } = await api("/api/bins");
  const collectable = bins.filter((b) => b.fill > 0);
  $("#view").innerHTML = `
    <div class="card"><h3>Collect a Bin</h3>
      ${collectable.length ? `<div class="form-row c2">
        <div class="field"><label>Bin</label><select id="clBin">${collectable.map((b) => `<option value="${esc(b.id)}">${esc(b.id)} · ${esc(b.location)} (${Number(b.fill).toFixed(0)}%)</option>`).join("")}</select></div>
        <button class="btn btn-primary" id="clGo">Mark Collected</button>
      </div>` : `<div class="empty">All bins are already empty.</div>`}
    </div>
    <div class="card" id="clOut">${collectable.length ? `<div class="empty">Collecting empties the bin and completes its request.</div>` : ""}</div>`;
  if (collectable.length) $("#clGo").addEventListener("click", async () => {
    try {
      const r = await api("/api/collect", "POST", { binId: $("#clBin").value, driver: SESSION.username });
      const c = r.complete;
      $("#clOut").innerHTML = `<h3>Collection Complete</h3>
        <div class="grid cols-3">
          <div class="card stat green"><span class="k">Bin</span><span class="v" style="font-size:22px">${esc(c.binId)}</span><span class="d">${esc(c.location)}</span></div>
          <div class="card stat amber"><span class="k">Previous</span><span class="v" style="font-size:22px">${esc(c.previousFill)}%</span><span class="d">now 0%</span></div>
          <div class="card stat blue"><span class="k">Request</span><span class="v" style="font-size:22px">${esc(c.requestId)}</span><span class="d">${esc(c.status)}</span></div>
        </div>`;
      toast("Collected " + c.binId + ".");
    } catch (e) { toast(e.message, "error"); }
  });
};

/* ---------------------- DRIVER: History ---------------------- */
VIEWS.driverhistory = async () => {
  const { history } = await api("/api/history");
  $("#view").innerHTML = `<div class="card"><h3>Collection History <span class="sub">${history.length} records</span></h3>${histTable(history)}</div>`;
};

/* ---------------------- DRIVER: Location ---------------------- */
VIEWS.location = async () => {
  const s = await api("/api/state");
  $("#view").innerHTML = `<div class="card"><h3>Current Location</h3>
    <div class="stat green"><span class="k">Truck Area</span><span class="v">${esc(s.driverLocation)}</span><span class="d">Updated after every collection</span></div>
  </div>`;
};