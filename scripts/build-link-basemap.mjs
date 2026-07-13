#!/usr/bin/env node
// Bake the "Dreambeans" watercolor basemap for The Living Link from
// OpenStreetMap: Puget Sound coastline + lakes, parks, and major roads,
// projected into the same local plane as network.json and written to
//   link-map/src/data/basemap.json
//
// Usage:
//   node scripts/build-link-basemap.mjs                # fetch from Overpass
//   node scripts/build-link-basemap.mjs --from-cache   # replay cached responses
//   node scripts/build-link-basemap.mjs --placeholder  # write the empty stub
//
// Runs in CI via .github/workflows/refresh-link-data.yml (this sandbox can't
// reach Overpass). Raw responses are cached under scripts/overpass-cache/
// (gitignored) so reruns are polite. Data © OpenStreetMap contributors,
// ODbL — the app shows attribution whenever this data is on screen.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PROJECTION,
  projectPoint,
  dedupePoints,
  douglasPeuckerIndices,
} from "./build-link-network.mjs";

const OUT_PATH = "link-map/src/data/basemap.json";
export const BBOX = { latMin: 47.35, lngMin: -122.55, latMax: 47.85, lngMax: -122.0 };

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const USER_AGENT =
  "builtbyshrey.com link-map basemap bake (+https://github.com/SKhunteta/PortfolioWebsite)";

const BBOX_QL = `${BBOX.latMin},${BBOX.lngMin},${BBOX.latMax},${BBOX.lngMax}`;
const QUERIES = {
  water: `[out:json][timeout:180][bbox:${BBOX_QL}];
( way["natural"="water"]; relation["natural"="water"];
  way["waterway"="riverbank"]; relation["waterway"="riverbank"]; );
out geom;`,
  coastline: `[out:json][timeout:180][bbox:${BBOX_QL}];
way["natural"="coastline"];
out geom;`,
  parks: `[out:json][timeout:180][bbox:${BBOX_QL}];
( way["leisure"="park"]; relation["leisure"="park"];
  way["landuse"="forest"]; relation["landuse"="forest"];
  way["landuse"="recreation_ground"]; );
out geom;`,
  roads: `[out:json][timeout:180][bbox:${BBOX_QL}];
way["highway"~"^(motorway|trunk|primary|secondary)$"];
out geom;`,
};

// Layer processing knobs: Douglas-Peucker tolerance (projected km) and the
// smallest feature worth its bytes.
const TUNING = {
  water: { tolKm: 0.02, minAreaKm2: 0.02 },
  sound: { tolKm: 0.025, minIslandKm2: 0.5 },
  parks: { tolKm: 0.04, minAreaKm2: 0.05 },
  roads: {
    major: { tolKm: 0.03, minLenKm: 0.3 },
    arterial: { tolKm: 0.05, minLenKm: 0.3 },
  },
};

const WARN_BYTES = 1.5 * 1024 * 1024;
const FAIL_BYTES = 2.5 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Pure geometry helpers (exported for tests)
// ---------------------------------------------------------------------------

const keyOf = (p) => `${p[0].toFixed(7)},${p[1].toFixed(7)}`;

/** Join way fragments end-to-end (either orientation) into chains. Returns
 *  { rings, chains }: rings are closed (first==last point), chains open. */
export function stitchWays(ways) {
  const chains = ways
    .map((w) => w.map((p) => [p[0], p[1]]))
    .filter((w) => w.length >= 2);
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < chains.length; i++) {
      const a = chains[i];
      if (keyOf(a[0]) === keyOf(a[a.length - 1])) continue; // already closed
      for (let j = 0; j < chains.length; j++) {
        if (i === j) continue;
        const b = chains[j];
        if (keyOf(b[0]) === keyOf(b[b.length - 1])) continue;
        let joined = null;
        if (keyOf(a[a.length - 1]) === keyOf(b[0])) joined = a.concat(b.slice(1));
        else if (keyOf(a[a.length - 1]) === keyOf(b[b.length - 1]))
          joined = a.concat(b.slice(0, -1).reverse());
        else if (keyOf(a[0]) === keyOf(b[b.length - 1])) joined = b.concat(a.slice(1));
        else if (keyOf(a[0]) === keyOf(b[0]))
          joined = b.slice(1).reverse().concat(a);
        if (joined) {
          chains[i] = joined;
          chains.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
  }
  const rings = [];
  const open = [];
  for (const c of chains) {
    if (keyOf(c[0]) === keyOf(c[c.length - 1]) && c.length >= 4) rings.push(c);
    else open.push(c);
  }
  return { rings, chains: open };
}

/** Shoelace area of a [lat,lng] ring in km² (projected). Signed: CCW in
 *  x-east/y-north terms is positive. */
export function ringAreaKm2(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = projectPoint(ring[i][0], ring[i][1]);
    const b = projectPoint(ring[i + 1][0], ring[i + 1][1]);
    // Use (x, -z) = (east, north).
    sum += a.x * -b.z - b.x * -a.z;
  }
  return sum / 2;
}

export function pointInRing(lat, lng, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [lat1, lng1] = ring[i];
    const [lat2, lng2] = ring[j];
    if (
      lng1 > lng !== lng2 > lng &&
      lat < ((lat2 - lat1) * (lng - lng1)) / (lng2 - lng1) + lat1
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** Assemble an OSM multipolygon relation (members with inline geometry)
 *  into { ring, holes[] } polygons. Ways may be fragmented and unordered. */
export function assembleMultipolygon(relation) {
  const byRole = { outer: [], inner: [] };
  for (const m of relation.members || []) {
    if (m.type !== "way" || !m.geometry) continue;
    const pts = m.geometry.map((g) => [g.lat, g.lon]);
    (byRole[m.role === "inner" ? "inner" : "outer"] || byRole.outer).push(pts);
  }
  const outers = stitchWays(byRole.outer).rings;
  const inners = stitchWays(byRole.inner).rings;
  return outers.map((ring) => ({
    ring,
    holes: inners.filter((h) => pointInRing(h[0][0], h[0][1], ring)),
  }));
}

/** Clip a [lat,lng] chain to the bbox; returns interior sub-chains whose cut
 *  endpoints lie exactly on the bbox boundary. */
export function clipChainToBbox(chain, bbox = BBOX) {
  const inside = (p) =>
    p[0] >= bbox.latMin && p[0] <= bbox.latMax && p[1] >= bbox.lngMin && p[1] <= bbox.lngMax;

  // Intersect segment a->b with the bbox edges; returns entry/exit points in
  // order along the segment.
  const crossings = (a, b) => {
    const pts = [];
    const dLat = b[0] - a[0];
    const dLng = b[1] - a[1];
    const edges = [
      ["lat", bbox.latMin],
      ["lat", bbox.latMax],
      ["lng", bbox.lngMin],
      ["lng", bbox.lngMax],
    ];
    for (const [axis, value] of edges) {
      const d = axis === "lat" ? dLat : dLng;
      if (d === 0) continue;
      const t = ((axis === "lat" ? value - a[0] : value - a[1])) / d;
      if (t <= 0 || t >= 1) continue;
      const p = [a[0] + dLat * t, a[1] + dLng * t];
      const eps = 1e-9;
      if (
        p[0] >= bbox.latMin - eps &&
        p[0] <= bbox.latMax + eps &&
        p[1] >= bbox.lngMin - eps &&
        p[1] <= bbox.lngMax + eps
      ) {
        pts.push({ t, p });
      }
    }
    return pts.sort((m, n) => m.t - n.t).map((c) => c.p);
  };

  const out = [];
  let current = null;
  for (let i = 0; i < chain.length; i++) {
    const p = chain[i];
    if (inside(p)) {
      if (!current) {
        current = [];
        // Entering: add the boundary crossing from the previous point.
        if (i > 0) {
          const cross = crossings(chain[i - 1], p);
          if (cross.length) current.push(cross[cross.length - 1]);
        }
      }
      current.push([p[0], p[1]]);
    } else if (current) {
      // Exiting: close at the boundary.
      const cross = crossings(chain[i - 1], p);
      if (cross.length) current.push(cross[0]);
      if (current.length >= 2) out.push(current);
      current = null;
    } else if (i > 0) {
      // Both endpoints outside — the segment may still slice a corner.
      const cross = crossings(chain[i - 1], p);
      if (cross.length >= 2) out.push(cross);
    }
  }
  if (current && current.length >= 2) out.push(current);
  return out;
}

// Perimeter parameterization for the CLOCKWISE walk (x = lng/east, y =
// lat/north): NW -> NE (top) -> SE (right) -> SW (bottom) -> NW (left).
function perimeterT(p, bbox) {
  const [lat, lng] = p;
  const w = bbox.lngMax - bbox.lngMin;
  const h = bbox.latMax - bbox.latMin;
  const eps = 1e-7;
  if (Math.abs(lat - bbox.latMax) < eps) return (lng - bbox.lngMin) / w; // top: 0..1
  if (Math.abs(lng - bbox.lngMax) < eps) return 1 + (bbox.latMax - lat) / h; // right: 1..2
  if (Math.abs(lat - bbox.latMin) < eps) return 2 + (bbox.lngMax - lng) / w; // bottom: 2..3
  if (Math.abs(lng - bbox.lngMin) < eps) return 3 + (lat - bbox.latMin) / h; // left: 3..4
  return null;
}

function perimeterPoint(t, bbox) {
  const w = bbox.lngMax - bbox.lngMin;
  const h = bbox.latMax - bbox.latMin;
  const u = ((t % 4) + 4) % 4;
  if (u < 1) return [bbox.latMax, bbox.lngMin + u * w];
  if (u < 2) return [bbox.latMax - (u - 1) * h, bbox.lngMax];
  if (u < 3) return [bbox.latMin, bbox.lngMax - (u - 2) * w];
  return [bbox.latMin + (u - 3) * h, bbox.lngMin];
}

/** Close clipped coastline chains into water polygons. OSM coastline keeps
 *  water on the RIGHT of the way direction, so walking the bbox perimeter
 *  CLOCKWISE from each chain's end to the next chain's start encloses the
 *  water. Closed rings that survived clipping are islands -> holes. */
export function closeCoastline(chains, rings, bbox = BBOX) {
  const polygons = [];
  const remaining = chains
    .map((c) => ({
      pts: c,
      startT: perimeterT(c[0], bbox),
      endT: perimeterT(c[c.length - 1], bbox),
    }))
    .filter((c) => c.startT != null && c.endT != null);

  while (remaining.length) {
    const ring = [];
    let current = remaining.shift();
    ring.push(...current.pts);
    let guard = 0;
    while (guard++ < 100) {
      const fromT = current.endT;
      // Nearest chain start clockwise from here (including wrapping), or the
      // ring's own start to close.
      let best = null;
      for (const cand of remaining) {
        const dt = (cand.startT - fromT + 4) % 4;
        if (!best || dt < best.dt) best = { dt, cand };
      }
      const selfStart = remaining.length
        ? null
        : { dt: (perimeterT(ring[0], bbox) - fromT + 4) % 4 };
      const closingDt = (perimeterT(ring[0], bbox) - fromT + 4) % 4;
      if (!best || closingDt <= best.dt) {
        // Walk the perimeter home, inserting any corners passed.
        insertCorners(ring, fromT, closingDt, bbox);
        ring.push([...ring[0]]);
        break;
      }
      insertCorners(ring, fromT, best.dt, bbox);
      ring.push(...best.cand.pts);
      remaining.splice(remaining.indexOf(best.cand), 1);
      current = best.cand;
      void selfStart;
    }
    if (ring.length >= 4) polygons.push(ring);
  }

  // Islands: closed coastline rings (land inside) become holes of whichever
  // sound polygon contains them.
  const result = polygons.map((ring) => ({ ring, holes: [] }));
  for (const island of rings) {
    const host = result.find((p) => pointInRing(island[0][0], island[0][1], p.ring));
    if (host) host.holes.push(island);
  }
  return result;
}

function insertCorners(ring, fromT, dt, bbox) {
  // Corners live at integer t values; add each one passed while walking dt
  // clockwise from fromT.
  const firstCorner = Math.ceil(fromT + 1e-9);
  for (let k = firstCorner; k < fromT + dt; k++) {
    ring.push(perimeterPoint(k, bbox));
  }
}

/** DP-simplify a [lat,lng] ring in projected space. Returns null if it
 *  collapses below a fillable polygon. */
export function simplifyRing(ring, tolKm) {
  const open = dedupePoints(ring.slice(0, -1));
  if (open.length < 3) return null;
  const xz = open.map(([lat, lng]) => {
    const { x, z } = projectPoint(lat, lng);
    return [x, z];
  });
  const keep = douglasPeuckerIndices(xz, tolKm);
  if (keep.length < 3) return null;
  return keep.map((i) => xz[i]);
}

export function simplifyLine(points, tolKm) {
  const clean = dedupePoints(points);
  if (clean.length < 2) return null;
  const xz = clean.map(([lat, lng]) => {
    const { x, z } = projectPoint(lat, lng);
    return [x, z];
  });
  const keep = douglasPeuckerIndices(xz, tolKm);
  return keep.map((i) => xz[i]);
}

export function lineLengthKm(xz) {
  let len = 0;
  for (let i = 1; i < xz.length; i++) {
    len += Math.hypot(xz[i][0] - xz[i - 1][0], xz[i][1] - xz[i - 1][1]);
  }
  return len;
}

export function classifyRoad(tags = {}) {
  const h = tags.highway;
  if (h === "motorway" || h === "trunk") return "major";
  if (h === "primary" || h === "secondary") return "arterial";
  return null;
}

const round3 = (v) => Number(v.toFixed(3));
const roundRing = (xz) => xz.map(([x, z]) => [round3(x), round3(z)]);

/** Extract { ring, holes } polygons (lat/lng) from an Overpass response. */
export function extractPolygons(overpass) {
  const polys = [];
  for (const el of overpass.elements || []) {
    if (el.type === "way" && el.geometry) {
      const pts = el.geometry.map((g) => [g.lat, g.lon]);
      if (pts.length >= 4 && keyOf(pts[0]) === keyOf(pts[pts.length - 1])) {
        polys.push({ ring: pts, holes: [] });
      }
    } else if (el.type === "relation") {
      polys.push(...assembleMultipolygon(el));
    }
  }
  return polys;
}

/** Full pipeline: raw Overpass responses -> basemap JSON + warnings/stats. */
export function buildBasemap(raw, options = {}) {
  const { generatedAt = new Date().toISOString(), source = "overpass" } = options;
  const warnings = [];

  const finishPolygons = (polys, { tolKm, minAreaKm2 }) => {
    const out = [];
    for (const p of polys) {
      if (Math.abs(ringAreaKm2(p.ring)) < minAreaKm2) continue;
      const ring = simplifyRing(p.ring, tolKm);
      if (!ring) continue;
      const holes = (p.holes || [])
        .filter((h) => Math.abs(ringAreaKm2(h)) >= minAreaKm2)
        .map((h) => simplifyRing(h, tolKm))
        .filter(Boolean)
        .map(roundRing);
      out.push({ ring: roundRing(ring), holes });
    }
    return out;
  };

  // Lakes, rivers.
  const water = finishPolygons(extractPolygons(raw.water || { elements: [] }), TUNING.water);

  // Puget Sound from coastline ways.
  let soundCount = 0;
  if (raw.coastline?.elements?.length) {
    const ways = raw.coastline.elements
      .filter((el) => el.type === "way" && el.geometry)
      .map((el) => el.geometry.map((g) => [g.lat, g.lon]));
    const { rings, chains } = stitchWays(ways);
    const clippedChains = chains.flatMap((c) => clipChainToBbox(c));
    const clippedRings = [];
    for (const r of rings) {
      // A ring fully inside stays an island; one crossing the bbox becomes
      // open chains.
      const clipped = clipChainToBbox(r);
      if (clipped.length === 1 && keyOf(clipped[0][0]) === keyOf(clipped[0][clipped[0].length - 1])) {
        clippedRings.push(clipped[0]);
      } else {
        clippedChains.push(...clipped);
      }
    }
    const islands = clippedRings.filter(
      (r) => Math.abs(ringAreaKm2(r)) >= TUNING.sound.minIslandKm2
    );
    const soundPolys = closeCoastline(clippedChains, islands);
    if (!soundPolys.length) {
      warnings.push("coastline closure produced no sound polygon; lakes only");
    }
    for (const p of soundPolys) {
      const ring = simplifyRing([...p.ring, p.ring[0]], TUNING.sound.tolKm);
      if (!ring) continue;
      const holes = p.holes
        .map((h) => simplifyRing(h, TUNING.sound.tolKm))
        .filter(Boolean)
        .map(roundRing);
      water.push({ ring: roundRing(ring), holes });
      soundCount++;
    }
  } else {
    warnings.push("no coastline data; lakes only");
  }

  const parks = finishPolygons(extractPolygons(raw.parks || { elements: [] }), TUNING.parks);

  const roads = { major: [], arterial: [] };
  for (const el of (raw.roads || {}).elements || []) {
    if (el.type !== "way" || !el.geometry) continue;
    const cls = classifyRoad(el.tags);
    if (!cls) continue;
    const line = simplifyLine(
      el.geometry.map((g) => [g.lat, g.lon]),
      TUNING.roads[cls].tolKm
    );
    if (!line || lineLengthKm(line) < TUNING.roads[cls].minLenKm) continue;
    roads[cls].push(roundRing(line));
  }

  const basemap = {
    meta: {
      generatedAt,
      source,
      placeholder: false,
      attribution: "map data © OpenStreetMap contributors (ODbL)",
      projection: PROJECTION,
      bbox: [BBOX.latMin, BBOX.lngMin, BBOX.latMax, BBOX.lngMax],
    },
    water,
    parks,
    roads,
  };

  const stats = {
    water: JSON.stringify(water).length,
    parks: JSON.stringify(parks).length,
    roads: JSON.stringify(roads).length,
    soundPolygons: soundCount,
    counts: {
      water: water.length,
      parks: parks.length,
      roadsMajor: roads.major.length,
      roadsArterial: roads.arterial.length,
    },
  };
  return { basemap, warnings, stats };
}

export function placeholderBasemap() {
  return {
    meta: {
      generatedAt: null,
      source: "placeholder",
      placeholder: true,
      attribution: null,
      projection: null,
      bbox: null,
    },
    water: [],
    parks: [],
    roads: { major: [], arterial: [] },
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpassFetch(name, query, cacheDir, fromCache) {
  const cachePath = path.join(cacheDir, `${name}.json`);
  if (fromCache && fs.existsSync(cachePath)) {
    console.log(`⟳ ${name}: from cache`);
    return JSON.parse(fs.readFileSync(cachePath, "utf8"));
  }
  let lastErr = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`⬇  ${name}: ${endpoint} (attempt ${attempt + 1})`);
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": USER_AGENT,
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(240_000),
        });
        if (res.status === 429 || res.status === 504) throw new Error(`HTTP ${res.status}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(cachePath, JSON.stringify(json));
        return json;
      } catch (err) {
        lastErr = err;
        const backoff = [45_000, 90_000][attempt] ?? 0;
        console.warn(`  ⚠ ${name}: ${err.message}${backoff ? `, retrying in ${backoff / 1000}s` : ""}`);
        if (backoff) await sleep(backoff);
      }
    }
  }
  throw new Error(`${name}: all Overpass attempts failed (${lastErr?.message})`);
}

async function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const outPath = path.join(repoRoot, OUT_PATH);
  const args = new Set(process.argv.slice(2));

  if (args.has("--placeholder")) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(placeholderBasemap()) + "\n");
    console.log(`✓ wrote placeholder ${OUT_PATH}`);
    return;
  }

  const cacheDir = path.join(repoRoot, "scripts", "overpass-cache");
  const fromCache = args.has("--from-cache");
  const raw = {};
  for (const [name, query] of Object.entries(QUERIES)) {
    raw[name] = await overpassFetch(name, query, cacheDir, fromCache);
    if (!fromCache) await sleep(8000); // Overpass etiquette between queries
  }

  const { basemap, warnings, stats } = buildBasemap(raw);
  for (const w of warnings) console.warn(`⚠  ${w}`);

  const json = JSON.stringify(basemap);
  const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
  console.log(
    `✓ water ${stats.counts.water} polys (${kb(stats.water)}, sound×${stats.soundPolygons}) | parks ${stats.counts.parks} (${kb(stats.parks)}) | roads ${stats.counts.roadsMajor}+${stats.counts.roadsArterial} (${kb(stats.roads)})`
  );
  console.log(`✓ total ${kb(json.length)}`);
  if (json.length > FAIL_BYTES) {
    throw new Error(`basemap.json ${kb(json.length)} exceeds the ${kb(FAIL_BYTES)} budget — raise tolerances`);
  }
  if (json.length > WARN_BYTES) {
    console.warn(`⚠  basemap.json over the soft ${kb(WARN_BYTES)} budget`);
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, json + "\n");
  console.log(`✓ wrote ${OUT_PATH}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  });
}
