"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const D = require("./data.js");

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const PROFILES_FILE = path.join(__dirname, "user_profiles.json");
const DRIVER_POS_FILE = path.join(__dirname, "mapdata", "driver_position.json");

/* Real GPS positions (if a device ever posts them) are kept separately from
   the C++ data file. Absent this file, the driver position is the logical
   campus node stored by the C++ app (simulation). */
function loadDriverPos() {
  try { return JSON.parse(fs.readFileSync(DRIVER_POS_FILE, "utf8")); }
  catch (e) { return null; }
}
function saveDriverPos(p) {
  try { fs.writeFileSync(DRIVER_POS_FILE, JSON.stringify(p, null, 2), "utf8"); } catch (e) { /* ignore */ }
}

/* Student profile store, kept separately so the C++ wastex_data.txt format
   (username|password|role|name) stays byte-compatible. */
function loadProfiles() {
  try { return JSON.parse(fs.readFileSync(PROFILES_FILE, "utf8")) || {}; }
  catch (e) { return {}; }
}
function saveProfiles(p) {
  try { fs.writeFileSync(PROFILES_FILE, JSON.stringify(p, null, 2), "utf8"); } catch (e) { /* ignore */ }
}
function withProfile(u, profiles) {
  const p = profiles[u.username] || {};
  return {
    username: u.username, role: u.role, name: u.name,
    studentId: p.studentId || "", department: p.department || "",
    batch: p.batch || "", year: p.year || "", semester: p.semester || "",
  };
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                      */
/* ------------------------------------------------------------------ */
function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}
function ok(res, obj) { json(res, 200, Object.assign({ ok: true }, obj || {})); }
function fail(res, message, code) { json(res, code || 400, { ok: false, error: message }); }

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on("end", () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { resolve({}); }
    });
  });
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function serveStatic(res, urlPath) {
  let rel = decodeURIComponent(urlPath.split("?")[0]);
  if (rel === "/" || rel === "") rel = "/index.html";
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^(\.\.[\\/])+/, ""));
  if (!filePath.startsWith(PUBLIC_DIR)) return fail(res, "Forbidden", 403);
  fs.readFile(filePath, (err, buf) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    res.end(buf);
  });
}

/* ------------------------------------------------------------------ */
/* Domain view helpers                                                */
/* ------------------------------------------------------------------ */
function binViewList(data) { return data.bins.map(D.decorateBin); }

function statePayload(data) {
  const profiles = loadProfiles();
  return {
    bins: binViewList(data),
    users: data.users.map((u) => withProfile(u, profiles)),
    requests: data.requests,
    history: data.history,
    roads: data.roads,
    queue: data.queue,
    driverLocation: data.driverLocation,
    locations: D.NODE_ORDER,
    nextRequestId: data.nextRequestId,
  };
}

/* ------------------------------------------------------------------ */
/* Router                                                             */
/* ------------------------------------------------------------------ */
async function route(req, res) {
  const u = new URL(req.url, "http://localhost");
  const p = u.pathname;
  const q = u.searchParams;
  const method = req.method.toUpperCase();

  if (!p.startsWith("/api/")) return serveStatic(res, req.url);

  try {
    /* ---------------- Auth ---------------- */
    if (p === "/api/login" && method === "POST") {
      const b = await readBody(req);
      const data = D.load();
      const user = data.users.find((x) => x.username === b.username);
      if (!user || !D.verifyPassword(b.password || "", user.password)) return fail(res, "Invalid username or password.");
      if (b.role && user.role !== b.role) return fail(res, "This account is not a " + b.role + " account.");
      return ok(res, { user: withProfile(user, loadProfiles()) });
    }
    if (p === "/api/signup" && method === "POST") {
      const b = await readBody(req);
      const data = D.load();
      if (!b.username || !b.password || !b.name) return fail(res, "Username, password and full name are required.");
      if (!b.studentId || !b.department || !b.batch || !b.year || !b.semester)
        return fail(res, "Student ID, department, batch, year and semester are required.");
      if (data.users.some((x) => x.username === b.username)) return fail(res, "Username already exists.");
      data.users.push({ username: b.username, password: D.hashPassword(b.password), role: "User", name: b.name });
      D.save(data);
      const profiles = loadProfiles();
      profiles[b.username] = {
        studentId: String(b.studentId).trim(), department: String(b.department).trim(),
        batch: String(b.batch).trim(), year: String(b.year).trim(), semester: String(b.semester).trim(),
      };
      saveProfiles(profiles);
      return ok(res, { message: "Account created. You can now sign in." });
    }

    /* ---------------- State ---------------- */
    if (p === "/api/state" && method === "GET") {
      return ok(res, statePayload(D.load()));
    }

    /* ---------------- Bins ---------------- */
    if (p === "/api/bins" && method === "GET") {
      return ok(res, { bins: binViewList(D.load()) });
    }
    if (p === "/api/bins" && method === "POST") {
      const b = await readBody(req);
      const data = D.load();
      if (!b.id) return fail(res, "Bin ID is required.");
      if (data.bins.some((x) => x.id === b.id)) return fail(res, "A bin with this ID already exists.");
      const known = D.NODE_ORDER.includes(b.location);
      data.bins.push({ id: b.id, location: b.location || "Unknown", fill: Number(b.fill) || 0, rate: Number(b.rate) || 0 });
      D.save(data);
      return ok(res, { bins: binViewList(data), warning: known ? null : "'" + b.location + "' is not a known campus location." });
    }
    if (p.startsWith("/api/bins/") && method === "PUT") {
      const id = decodeURIComponent(p.slice("/api/bins/".length));
      const b = await readBody(req);
      const data = D.load();
      const bin = data.bins.find((x) => x.id === id);
      if (!bin) return fail(res, "Bin not found.");
      if (b.fill !== undefined) bin.fill = Number(b.fill) || 0;
      if (b.rate !== undefined) bin.rate = Number(b.rate) || 0;
      D.updateStatus(bin); D.calcPriority(bin);
      D.save(data);
      return ok(res, { bins: binViewList(data) });
    }
    if (p.startsWith("/api/bins/") && method === "DELETE") {
      const id = decodeURIComponent(p.slice("/api/bins/".length));
      const data = D.load();
      const idx = data.bins.findIndex((x) => x.id === id);
      if (idx === -1) return fail(res, "Bin not found.");
      data.bins.splice(idx, 1);
      D.save(data);
      return ok(res, { bins: binViewList(data) });
    }
    if (p === "/api/bins/search" && method === "GET") {
      const data = D.load();
      const sorted = D.sortBins(binViewList(data), "id", false);
      const result = D.binarySearchById(sorted, q.get("id") || "");
      return ok(res, result);
    }
    if (p === "/api/bins/sort" && method === "GET") {
      const data = D.load();
      const key = q.get("key") || "fill";
      const desc = q.get("desc") !== "0";
      return ok(res, { key, descending: desc, bins: D.sortBins(binViewList(data), key, desc) });
    }
    if (p.startsWith("/api/bins/") && p.endsWith("/report-full") && method === "POST") {
      const id = decodeURIComponent(p.slice("/api/bins/".length, -"/report-full".length));
      const b = await readBody(req);
      const data = D.load();
      const bin = data.bins.find((x) => x.id === id);
      if (!bin) return fail(res, "Bin not found.");
      bin.fill = 100; D.updateStatus(bin); D.calcPriority(bin);
      let request = null;
      if (b.createRequest) request = makeRequest(data, id, b.username || "unknown");
      D.save(data);
      return ok(res, { message: "Bin " + id + " reported as FULL. Location: " + bin.location, request, bins: binViewList(data) });
    }

    /* ---------------- Users ---------------- */
    if (p === "/api/users" && method === "GET") {
      const data = D.load();
      const profiles = loadProfiles();
      return ok(res, { users: data.users.map((x) => withProfile(x, profiles)) });
    }
    if (p === "/api/users" && method === "POST") {
      const b = await readBody(req);
      const data = D.load();
      if (!b.username || !b.password || !b.name) return fail(res, "Username, password and full name are required.");
      if (data.users.some((x) => x.username === b.username)) return fail(res, "Username already exists.");
      const role = ["Admin", "Driver", "User"].includes(b.role) ? b.role : "User";
      data.users.push({ username: b.username, password: D.hashPassword(b.password), role, name: b.name });
      D.save(data);
      if (role === "User") {
        const profiles = loadProfiles();
        profiles[b.username] = {
          studentId: (b.studentId || "").trim(), department: (b.department || "").trim(),
          batch: (b.batch || "").trim(), year: (b.year || "").trim(), semester: (b.semester || "").trim(),
        };
        saveProfiles(profiles);
      }
      return ok(res, { message: role + " " + b.username + " added successfully." });
    }
    if (p.startsWith("/api/users/") && method === "DELETE") {
      const username = decodeURIComponent(p.slice("/api/users/".length));
      if (["Mahi", "Ayesha"].indexOf(username) !== -1)
        return fail(res, "Founder accounts cannot be deleted from the admin list.", 403);
      const data = D.load();
      const idx = data.users.findIndex((x) => x.username === username);
      if (idx === -1) return fail(res, "User not found.");
      data.users.splice(idx, 1);
      D.save(data);
      const profiles = loadProfiles();
      if (profiles[username]) { delete profiles[username]; saveProfiles(profiles); }
      return ok(res, { message: "User " + username + " deleted." });
    }

    /* ---------------- Requests ---------------- */
    if (p === "/api/requests" && method === "GET") {
      return ok(res, { requests: D.load().requests });
    }
    if (p === "/api/requests/active" && method === "GET") {
      const data = D.load();
      return ok(res, { requests: data.requests.filter((r) => r.status === "Pending" || r.status === "Assigned") });
    }
    if (p === "/api/requests" && method === "POST") {
      const b = await readBody(req);
      const data = D.load();
      if (!data.bins.some((x) => x.id === b.binId)) return fail(res, "Bin not found.");
      const request = makeRequest(data, b.binId, b.username || "unknown");
      D.save(data);
      return ok(res, { request, message: "Request " + request.requestId + " created successfully." });
    }
    if (p.startsWith("/api/requests/") && p.endsWith("/assign") && method === "POST") {
      const id = decodeURIComponent(p.slice("/api/requests/".length, -"/assign".length));
      const b = await readBody(req);
      const data = D.load();
      const existing = D.findRequest(data, id);
      if (!existing) return fail(res, "Request not found.");
      const driver = data.users.find((x) => x.username === b.driver && x.role === "Driver");
      if (!driver) return fail(res, "Invalid driver.");
      existing.assignedDriver = b.driver; existing.status = "Assigned";
      D.save(data);
      return ok(res, { message: "Driver " + b.driver + " assigned to request " + id + ".", requests: data.requests });
    }
    if (p.startsWith("/api/requests/") && p.endsWith("/cancel") && method === "POST") {
      const id = decodeURIComponent(p.slice("/api/requests/".length, -"/cancel".length));
      const data = D.load();
      const existing = D.findRequest(data, id);
      if (!existing) return fail(res, "Request not found.");
      existing.status = "Cancelled";
      D.save(data);
      return ok(res, { message: "Request " + id + " cancelled.", requests: data.requests });
    }
    if (p === "/api/requests/by-user" && method === "GET") {
      const data = D.load();
      const username = q.get("username");
      return ok(res, { requests: data.requests.filter((r) => r.requestedBy === username) });
    }
    if (p === "/api/requests/by-driver" && method === "GET") {
      const data = D.load();
      const username = q.get("username");
      return ok(res, { requests: data.requests.filter((r) => r.assignedDriver === username && (r.status === "Assigned" || r.status === "Pending")) });
    }
    if (p === "/api/requests/track" && method === "GET") {
      const data = D.load();
      const key = q.get("key");
      const username = q.get("username");
      let r = D.findRequest(data, key);
      if (!r || (r.requestedBy !== username && username !== "admin")) r = D.findRequestByBin(data, key);
      if (!r) return fail(res, "No request found for " + key + ".");
      return ok(res, { request: r });
    }

    /* ---------------- History ---------------- */
    if (p === "/api/history" && method === "GET") {
      return ok(res, { history: D.load().history });
    }
    if (p === "/api/history/search" && method === "GET") {
      const data = D.load();
      const binId = q.get("binId");
      const rec = data.history.find((h) => h.binId === binId);
      if (!rec) return fail(res, "No record found for bin " + binId);
      return ok(res, { record: rec });
    }
    if (p === "/api/history" && method === "DELETE") {
      const data = D.load();
      const binId = q.get("binId");
      const idx = data.history.findIndex((h) => h.binId === binId);
      if (idx === -1) return fail(res, "Record not found.");
      data.history.splice(idx, 1);
      D.save(data);
      return ok(res, { message: "Record deleted.", history: data.history });
    }

    /* ---------------- Graph ---------------- */
    if (p === "/api/graph" && method === "GET") {
      const data = D.load();
      const graph = D.buildGraph(data.roads);
      return ok(res, { nodes: graph.nodes, edges: D.graphEdges(graph) });
    }
    if (p === "/api/graph/road" && method === "POST") {
      const b = await readBody(req);
      const data = D.load();
      if (!D.NODE_ORDER.includes(b.from) || !D.NODE_ORDER.includes(b.to))
        return fail(res, "One or both locations do not exist in the campus network.");
      if (b.from === b.to) return fail(res, "A location cannot connect to itself.");
      const dup = data.roads.some((r) => (r.from === b.from && r.to === b.to) || (r.from === b.to && r.to === b.from));
      if (dup) return fail(res, "Road already exists between " + b.from + " and " + b.to + ".");
      data.roads.push({ from: b.from, to: b.to, weight: Number(b.weight) || 0 });
      D.save(data);
      return ok(res, { message: "Road added successfully.", roads: data.roads });
    }
    if (p === "/api/graph/bfs" && method === "GET") {
      const data = D.load();
      const order = D.bfs(D.buildGraph(data.roads), q.get("start") || "");
      if (!order) return fail(res, "Start location not found.");
      return ok(res, { order });
    }
    if (p === "/api/graph/dfs" && method === "GET") {
      const data = D.load();
      const order = D.dfs(D.buildGraph(data.roads), q.get("start") || "");
      if (!order) return fail(res, "Start location not found.");
      return ok(res, { order });
    }
    if (p === "/api/graph/dijkstra" && method === "GET") {
      const data = D.load();
      const graph = D.buildGraph(data.roads);
      const from = q.get("from") || "";
      const to = q.get("to") || "";
      if (!D.NODE_ORDER.includes(from) || !D.NODE_ORDER.includes(to)) return fail(res, "Invalid source or destination.");
      const dj = D.dijkstra(graph, from);
      const { path: route, distance } = dj.paths(to);
      if (!route.length) return fail(res, "No path found.");
      return ok(res, { from, to, path: route, distance });
    }
    if (p === "/api/graph/nearby" && method === "GET") {
      const data = D.load();
      const graph = D.buildGraph(data.roads);
      const from = q.get("from") || "";
      if (!D.NODE_ORDER.includes(from)) return fail(res, "Unknown location.");
      const dj = D.dijkstra(graph, from);
      const list = data.bins.map((b) => ({
        ...D.decorateBin(b),
        distance: dj.paths(b.location).distance,
      })).sort((a, b) => a.distance - b.distance);
      return ok(res, { from, bins: list });
    }

    /* ---------------- Priority ---------------- */
    if (p === "/api/priority" && method === "GET") {
      const data = D.load();
      return ok(res, { queue: D.priorityList(data.bins) });
    }

    /* ---------------- Live tracking route plan (read-only) ---------------- */
    if (p === "/api/route/plan" && method === "GET") {
      const data = D.load();
      const start = q.get("start") || data.driverLocation;
      const plan = D.routePlan(data, start);
      if (plan.error) return fail(res, plan.error);
      return ok(res, Object.assign({ driverLocation: data.driverLocation }, plan));
    }

    /* ---------------- OpenStreetMap data pipeline ---------------- */
    if (p === "/api/map/metadata" && method === "GET") return ok(res, { metadata: D.mapMetadata() });
    if (p === "/api/map/buildings" && method === "GET") return ok(res, D.mapBuildings());
    if (p === "/api/map/roads" && method === "GET") return ok(res, D.mapRoads());
    if (p === "/api/map/nodes" && method === "GET") return ok(res, { nodes: D.mapNodes() });

    /* Manually set coordinates for a campus node that OSM does not have. */
    if (p === "/api/map/coords" && method === "POST") {
      const b = await readBody(req);
      if (!b.name) return fail(res, "Node name is required.");
      const known = D.mapNodes();
      if (!Object.prototype.hasOwnProperty.call(known, b.name)) {
        return fail(res, "'" + b.name + "' is not one of the campus locations.");
      }
      if (typeof b.lat !== "number" || typeof b.lng !== "number") return fail(res, "lat and lng must be numbers.");
      if (b.lat < -90 || b.lat > 90 || b.lng < -180 || b.lng > 180) return fail(res, "Coordinates out of range.");
      const saved = D.saveManualCoord(b.name, b.lat, b.lng, "manual");
      return ok(res, { message: "Coordinates saved for " + b.name + ".", coord: saved, nodes: D.mapNodes() });
    }

    /* Road-network route following real OSM road geometry. */
    if (p === "/api/route/road" && method === "GET") {
      const nums = (k) => parseFloat(q.get(k));
      const fromLat = nums("fromLat"), fromLng = nums("fromLng"), toLat = nums("toLat"), toLng = nums("toLng");
      if ([fromLat, fromLng, toLat, toLng].some((v) => !isFinite(v))) return fail(res, "fromLat, fromLng, toLat, toLng are required.");
      const route = D.routeOnRoads(fromLat, fromLng, toLat, toLng);
      if (!route) return fail(res, "No road path found between the given points.", 404);
      /* Never silently invent a route for points nowhere near the campus roads. */
      const MAX_SNAP = 1500;
      const far = route.from.offMeters > route.to.offMeters ? route.from : route.to;
      if (far.offMeters > MAX_SNAP) {
        const km = Math.round((far.offMeters / 1000) * 10) / 10;
        return fail(res, "That point is " + km + " km away from the nearest mapped road, so no route was drawn.", 422);
      }
      return ok(res, { route, geometrySource: "OpenStreetMap road geometry" });
    }

    /* Driver position. The C++ app stores a logical node name; a real GPS
       feed can post coordinates here for future integration. */
    if (p === "/api/driver/position" && method === "GET") {
      const data = D.load();
      const nodes = D.mapNodes();
      const gps = loadDriverPos();
      if (gps && typeof gps.lat === "number") {
        return ok(res, { lat: gps.lat, lng: gps.lng, source: gps.source || "gps", simulation: gps.source !== "gps", location: data.driverLocation, updatedAt: gps.at || null });
      }
      const node = nodes[data.driverLocation];
      return ok(res, {
        lat: node && node.lat !== null ? node.lat : null,
        lng: node && node.lng !== null ? node.lng : null,
        source: "logical-node", simulation: true,
        location: data.driverLocation, updatedAt: null,
      });
    }
    if (p === "/api/driver/position" && method === "POST") {
      const b = await readBody(req);
      if (typeof b.lat !== "number" || typeof b.lng !== "number") return fail(res, "lat and lng must be numbers.");
      saveDriverPos({ lat: b.lat, lng: b.lng, source: b.source === "gps" ? "gps" : "simulation", at: new Date().toISOString() });
      return ok(res, { message: "Driver position updated.", source: b.source === "gps" ? "gps" : "simulation" });
    }

    /* ---------------- Collection ---------------- */
    if (p === "/api/collect" && method === "POST") {
      const b = await readBody(req);
      const data = D.load();
      const bin = data.bins.find((x) => x.id === b.binId);
      if (!bin) return fail(res, "Bin not found.");
      const previousFill = D.f0(bin.fill);
      const location = bin.location;
      const existing = D.findRequestByBin(data, bin.id);
      const requestId = existing ? existing.requestId : "--";
      const driverName = (data.users.find((u) => u.username === b.driver) || {}).name || b.driver || "driver";
      data.driverLocation = location;
      bin.fill = 0; D.updateStatus(bin); D.calcPriority(bin);
      data.history.unshift({ binId: bin.id, location, description: "Collected by driver " + driverName });
      D.completeByBin(data, bin.id);
      D.removeFromQueue(data, bin.id);
      D.save(data);
      return ok(res, {
        complete: { binId: bin.id, location, previousFill, current: "0", driver: driverName, requestId, status: "COMPLETED" },
        bins: binViewList(data),
      });
    }
    if (p === "/api/smart-collect" && method === "POST") {
      const b = await readBody(req);
      const data = D.load();
      const result = D.smartCollect(data, b.start, b.driver);
      if (result.error) return fail(res, result.error);
      return ok(res, { steps: result.steps, summary: result.summary, bins: binViewList(data), history: data.history });
    }

    /* ---------------- Statistics ---------------- */
    if (p === "/api/stats" && method === "GET") {
      const data = D.load();
      let critical = 0, high = 0, moderate = 0, normal = 0, totalFill = 0;
      for (const b of data.bins) {
        const v = D.decorateBin(b);
        if (v.status === "CRITICAL") critical++;
        else if (v.status === "HIGH") high++;
        else if (v.status === "MODERATE") moderate++;
        else normal++;
        totalFill += b.fill;
      }
      const average = data.bins.length ? totalFill / data.bins.length : 0;
      const countBy = (s) => data.requests.filter((r) => r.status === s).length;
      const graph = D.buildGraph(data.roads);
      return ok(res, {
        bin: { total: data.bins.length, critical, high, moderate, normal, average },
        collection: {
          pending: countBy("Pending"), assigned: countBy("Assigned"),
          completed: countBy("Completed"), cancelled: countBy("Cancelled"),
        },
        system: {
          locations: D.NODE_ORDER.length,
          roadSegments: D.graphEdges(graph).length,
          registeredUsers: data.users.length,
          collectionRecords: data.history.length,
        },
      });
    }

    /* ---------------- Overview extras ---------------- */
    if (p === "/api/overview/users" && method === "GET") {
      const data = D.load();
      const profiles = loadProfiles();
      return ok(res, { users: data.users.map((x) => withProfile(x, profiles)) });
    }

    return fail(res, "Unknown endpoint: " + p, 404);
  } catch (err) {
    console.error(err);
    return fail(res, "Server error: " + err.message, 500);
  }
}

function makeRequest(data, binId, username) {
  const bin = data.bins.find((x) => x.id === binId);
  D.updateStatus(bin);
  const request = {
    requestId: D.generateRequestId(data),
    binId,
    location: bin.location,
    priority: D.priorityFromStatus(bin.status),
    status: "Pending",
    requestedBy: username,
    assignedDriver: "",
  };
  data.requests.push(request);
  data.queue.push(binId);
  return request;
}

/* ------------------------------------------------------------------ */
const server = http.createServer(route);
server.listen(PORT, () => {
  console.log("");
  console.log("  KUET WasteX - Web Dashboard");
  console.log("  ----------------------------------------");
  console.log("  Data file : " + D.DATA_FILE);
  console.log("  Open      : http://localhost:" + PORT);
  console.log("");
  console.log("  Press Ctrl+C to stop.");
  console.log("");
});