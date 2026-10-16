# KUET campus map data (OpenStreetMap)

Everything in this folder comes from OpenStreetMap. No coordinates, roads or
buildings in this project were invented by hand — anything OSM does not know
about is recorded as *missing* instead (see `campus_nodes.json`).

## Provenance

| | |
|---|---|
| Source | OpenStreetMap via the Overpass API |
| Mirror used | `https://maps.mail.ru/osm/tools/overpass/api/interpreter` (the main `overpass-api.de` endpoint returned 502/406 at build time) |
| Area | KUET (Khulna University of Engineering & Technology) campus, Khulna, Bangladesh |
| Nominatim match | way `376069528`, centre `22.9009132, 89.5024705` |
| Extract bbox | `22.8968, 89.4950` – `22.9052, 89.5075` (south, west – north, east) |
| Licence | © OpenStreetMap contributors, ODbL 1.0 |

Attribution is shown on the map itself (Leaflet control) and returned by
`GET /api/map/metadata`. **Keep it** in any derivative work.

## Files

| File | Contents |
|---|---|
| `kuet_buildings.geojson` | 1711 building polygons (`osm_id`, `name`, `building`, `levels`, `amenity`, `operator`) |
| `kuet_roads.geojson` | 77 road LineStrings (`osm_id`, `highway`, `name`, `surface`) |
| `campus_nodes.json` | The 15 logical locations the C++ graph uses, with `lat`/`lng` where OSM has a matching named object (5 of 15: Administration, Cafeteria, A.E.H, K.A.H, R.H) and `null` + an explanatory `note` where it does not |
| `manual_coords.json` | Coordinates an admin types into the live map. Starts empty `{}` |
| `driver_position.json` | Truck position posted to `POST /api/driver/position`. Absent = the logical node from `wastex_data.txt` |
| `metadata.json` | Area, bbox, centre, licence, attribution, feature counts |

## Endpoints

| Endpoint | Notes |
|---|---|
| `GET /api/map/metadata` | bbox / centre / attribution / counts |
| `GET /api/map/buildings` | GeoJSON FeatureCollection |
| `GET /api/map/roads` | GeoJSON FeatureCollection |
| `GET /api/map/nodes` | the 15 locations, merged with `manual_coords.json` |
| `POST /api/map/coords` | `{name, lat, lng}` — saves a manual coordinate (validated range) |
| `GET /api/route/road?fromLat&fromLng&toLat&toLng` | shortest path over the OSM road graph |
| `GET/POST /api/driver/position` | read / write the truck position |

## How a route is built

1. **Stop order** comes from the existing C++ logic mirrored in `data.js`
   (priority queue over fill/rate + Dijkstra on the campus graph), the same
   computation as `/api/route/plan`.
2. **Path geometry and distance** come from a second graph built from
   `kuet_roads.geojson`: every geometry point is a vertex, edges are weighted
   with the haversine distance, and the search is the same O(n²) Dijkstra as
   `Dijkstra.h`. Start and end points snap to the nearest road vertex, and the
   snap distance is reported back per leg.
3. If a location has no coordinates, that stop is **skipped and listed** with a
   reason rather than being guessed.

## Limitations (read before trusting the numbers)

- **There is no GPS feed.** Truck movement on the map is a **simulation** driven
  by a constant speed along the drawn route. The UI labels the position source
  as `Simulated · logical node` or `Simulated · placed on map`. The badge only
  says `GPS position` when a real device has posted coordinates with
  `source: "gps"` — no such device is wired up yet. `POST /api/driver/position`
  is the integration point.
- **10 of 15 locations are not in OpenStreetMap** (Main Gate, Janata Bank,
  Pocket Gate, Post Office, Central Field, Academic Area, S.S.H, F.A.H, Guest
  House, IT Park). They are listed under "Not yet mapped" with the OSM lookup
  note, and an admin can click **Set** and click the map to record a coordinate
  manually. Manual coordinates are marked with a different colour and a
  `source: "manual"` label.
- **Distances are road-network distances** from OSM geometry, not straight-line
  distances and not necessarily the exact path a vehicle would take. Campus
  footpaths are only partly mapped.
- **Tiles and Leaflet need internet.** Without a connection the map area shows an
  explicit "Interactive map unavailable" message with a retry button; the bin,
  route and location data still work. Nothing is drawn from an offline cache.
- **Road distances are only as good as the snap.** If you place a location far
  from any mapped road, the route starts at the nearest road vertex and the
  offset is returned in the API response (`from.offMeters`, `to.offMeters`).
- The abstract 15-node campus graph in the C++ app is what drives stop ordering.
  Its **Campus Road Network** view draws that graph over the real OpenStreetMap
  base layer (nodes where coordinates exist, a segment only when both of its
  endpoints are placed, `On real map` column in the segment table), with the
  hand-drawn schematic kept as a toggle and as the offline fallback.

## Files created or changed for the map feature

**Created**

- `webui/mapdata/` (all six files above)
- `webui/public/kuet-logo.png`, `webui/public/kuetcampus.jpg` (branding/background)

**Modified**

- `webui/data.js` — map data loaders, road-graph build, `haversine`,
  `nearestVertex`, `dijkstraRoad`, `routeOnRoads`, `saveManualCoord`
- `webui/server.js` — the endpoints above, driver-position store, PNG/JPG MIME
  types
- `webui/public/index.html` — Leaflet 1.9.4 CDN (CSS + JS), favicon
- `webui/public/styles.css` — Leaflet dark theme, map markers, legend, placement
  banner, responsive sizing
- `webui/public/app.js` — live map view rewritten around Leaflet/OSM
  (`VIEWS.livemap`, `destroyLiveMap`, road styles, marker icons), manual
  placement flow, simulation controls; shared `createBaseMap` / `manualPlacer`
  helpers; **Campus Road Network** view redrawn on the real map
  (`VIEWS.graph` — OSM base layer, graph edges/nodes, BFS/DFS/Dijkstra
  highlighting, schematic toggle, `Not yet mapped` placement list)
- `Graph.h` — restored the `void addEdge(...)` declaration that had lost its
  name (the C++ build was failing)

**Not changed:** `wastex_data.txt` format — it is still byte-compatible with the
C++ app; student profile fields live in `webui/user_profiles.json`.
