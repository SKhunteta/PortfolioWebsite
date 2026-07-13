#!/usr/bin/env node
// Build "The Link, Alive" datasets from Sound Transit's GTFS static feed.
//
// Downloads the rail GTFS zip, extracts Link light rail geometry + schedule,
// and bakes two JSONs:
//   - link-map/src/data/network.json          (projected rendering geometry)
//   - portfolio-backend/data/linkmap-schedule.json  (simulator schedule)
//
// Usage:
//   node scripts/build-link-network.mjs                  # fetch + build both
//   node scripts/build-link-network.mjs --gtfs-zip 40_gtfs.zip   # local zip
//   node scripts/build-link-network.mjs --include-tline  # keep Tacoma's T Line
//
// Re-run whenever the network changes (new stations/extensions); the feed is
// the source of truth. This sandbox-agnostic script also runs in CI via
// .github/workflows/refresh-link-data.yml (workflow_dispatch).
//
// GTFS has no tunnel/elevated data — that's joined from the hand-authored
// scripts/data/link-grade-annotations.json (artistic annotation, keyed by
// station-name pairs; unmatched pairs default to "at-grade" with a warning).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const DEFAULT_GTFS_URL = "https://www.soundtransit.org/GTFS-rail/40_gtfs.zip";
const OUT_NETWORK = "link-map/src/data/network.json";
const OUT_SCHEDULE = "portfolio-backend/data/linkmap-schedule.json";

// Local flat-earth projection shared by frontend and backend. y-up scene,
// map on XZ: x grows east, z grows SOUTH (so north points to -z on screen).
export const PROJECTION = {
  type: "local-equirect",
  originLat: 47.6062,
  originLng: -122.3321,
  kmPerDegLat: 111.32,
  kmPerDegLng: 111.32 * Math.cos((47.6062 * Math.PI) / 180),
};

export function projectPoint(lat, lng, proj = PROJECTION) {
  return {
    x: (lng - proj.originLng) * proj.kmPerDegLng,
    z: -(lat - proj.originLat) * proj.kmPerDegLat,
  };
}

export function parseGtfsCsv(text) {
  return parse(text, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
  });
}

// GTFS times exceed 24:00:00 for after-midnight trips on the same service day.
export function parseGtfsTime(hms) {
  const m = /^(\d+):(\d{2}):(\d{2})$/.exec(String(hms).trim());
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Consecutive duplicate shape points produce zero-length segments (NaN
// tangents downstream) — drop them before any arc-length math.
export function dedupePoints(points) {
  const out = [];
  for (const p of points) {
    const prev = out[out.length - 1];
    if (prev && prev[0] === p[0] && prev[1] === p[1]) continue;
    out.push(p);
  }
  return out;
}

// points: [[lat,lng], ...] -> cumulative km along the polyline.
export function cumulativeKm(points) {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(
      cum[i - 1] +
        haversineKm(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1])
    );
  }
  return cum;
}

// Douglas-Peucker on projected coordinates; toleranceKm is perpendicular
// distance. Returns the indices to keep (always includes endpoints).
export function douglasPeuckerIndices(xz, toleranceKm) {
  if (xz.length <= 2) return xz.map((_, i) => i);
  const keep = new Set([0, xz.length - 1]);
  const stack = [[0, xz.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, az] = xz[a];
    const [bx, bz] = xz[b];
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz;
    let worst = -1;
    let worstDist = toleranceKm;
    for (let i = a + 1; i < b; i++) {
      const [px, pz] = xz[i];
      let d;
      if (len2 === 0) {
        d = Math.hypot(px - ax, pz - az);
      } else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2));
        d = Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
      }
      if (d > worstDist) {
        worstDist = d;
        worst = i;
      }
    }
    if (worst >= 0) {
      keep.add(worst);
      stack.push([a, worst], [worst, b]);
    }
  }
  return [...keep].sort((m, n) => m - n);
}

// Nearest arc-length position of a point on a polyline (projected space).
export function snapToPolylineKm(xz, cumKm, px, pz) {
  let best = { sKm: 0, distKm: Infinity };
  for (let i = 0; i < xz.length - 1; i++) {
    const [ax, az] = xz[i];
    const [bx, bz] = xz[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2));
    const d = Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
    if (d < best.distKm) {
      best = { sKm: cumKm[i] + (cumKm[i + 1] - cumKm[i]) * t, distKm: d };
    }
  }
  return best;
}

// Station-name normalization for the grade-annotation join.
export function normalizeStationName(name) {
  return String(name)
    .toLowerCase()
    .replace(/\bstation\b/g, "")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function classifyServiceDayBucket(row) {
  const on = (k) => row[k] === "1";
  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const wk = weekdays.filter(on).length;
  if (wk >= 4 && !on("saturday") && !on("sunday")) return "weekday";
  if (on("saturday") && !on("sunday") && wk === 0) return "saturday";
  if (on("sunday") && !on("saturday") && wk === 0) return "sunday";
  if (wk >= 4 && on("saturday") && on("sunday")) return "daily";
  return null;
}

// Departure minute lists -> hour-bucketed headway bands, adjacent hours with
// equal headway merged. departuresMin are minutes into the service day (may
// exceed 1440 for GTFS >24:00 trips).
export function deriveHeadwayBands(departuresMin) {
  if (departuresMin.length === 0) return [];
  const sorted = [...departuresMin].sort((a, b) => a - b);
  const firstHour = Math.floor(sorted[0] / 60);
  const lastHour = Math.floor(sorted[sorted.length - 1] / 60);
  const bands = [];
  for (let h = firstHour; h <= lastHour; h++) {
    const inHour = sorted.filter((m) => m >= h * 60 && m < (h + 1) * 60).length;
    if (inHour === 0) continue;
    const headway = Math.max(1, Math.round(60 / inHour));
    const prev = bands[bands.length - 1];
    if (prev && prev.endMin === h * 60 && prev.headwayMin === headway) {
      prev.endMin = (h + 1) * 60;
    } else {
      bands.push({ startMin: h * 60, endMin: (h + 1) * 60, headwayMin: headway });
    }
  }
  // Clamp the first/last band edges to the actual first/last departures so
  // the simulator doesn't invent trains before the first run of the day.
  if (bands.length) {
    bands[0].startMin = Math.max(bands[0].startMin, Math.floor(sorted[0]));
    const last = bands[bands.length - 1];
    last.endMin = Math.min(last.endMin, Math.ceil(sorted[sorted.length - 1]) + 1);
  }
  return bands;
}

function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const T_LINE_PATTERN = /^t\b|tacoma/i;

// Core pipeline: GTFS file map (raw CSV strings) -> { network, schedule,
// warnings }. Pure; all I/O (zip download, fs writes) stays in main().
export function processGtfs(files, options = {}) {
  const {
    includeTLine = false,
    gradeAnnotations = [],
    networkToleranceKm = 0.01,
    scheduleToleranceKm = 0.025,
    defaultDwellSec = 25,
    source = DEFAULT_GTFS_URL,
    generatedAt = new Date().toISOString(),
  } = options;

  const warnings = [];
  const routes = parseGtfsCsv(files["routes.txt"]);
  const trips = parseGtfsCsv(files["trips.txt"]);
  const stops = parseGtfsCsv(files["stops.txt"]);
  const stopTimes = parseGtfsCsv(files["stop_times.txt"]);
  const shapes = parseGtfsCsv(files["shapes.txt"]);
  const calendar = files["calendar.txt"] ? parseGtfsCsv(files["calendar.txt"]) : [];

  // --- routes: light rail only (route_type 0), T Line filtered by default.
  const lightRail = routes.filter((r) => String(r.route_type) === "0");
  const keptRoutes = lightRail.filter((r) => {
    const label = `${r.route_short_name || ""} ${r.route_long_name || ""}`;
    return includeTLine || !T_LINE_PATTERN.test(label.trim());
  });
  if (!keptRoutes.length) throw new Error("no light-rail routes found in feed");

  // --- service-day buckets.
  const bucketByServiceId = new Map();
  for (const row of calendar) {
    const bucket = classifyServiceDayBucket(row);
    if (bucket) bucketByServiceId.set(row.service_id, bucket);
  }

  // --- stops: platforms roll up to parent stations.
  const stopById = new Map(stops.map((s) => [s.stop_id, s]));
  const stationOfStop = (stopId) => {
    const s = stopById.get(stopId);
    if (!s) return null;
    if (s.parent_station && stopById.get(s.parent_station)) {
      return stopById.get(s.parent_station);
    }
    return s;
  };

  // --- group shape points.
  const shapePointsById = new Map();
  for (const row of shapes) {
    let arr = shapePointsById.get(row.shape_id);
    if (!arr) shapePointsById.set(row.shape_id, (arr = []));
    arr.push({
      seq: Number(row.shape_pt_sequence),
      lat: Number(row.shape_pt_lat),
      lng: Number(row.shape_pt_lon),
    });
  }
  for (const arr of shapePointsById.values()) arr.sort((a, b) => a.seq - b.seq);

  // --- stop_times grouped by trip.
  const stopTimesByTrip = new Map();
  for (const st of stopTimes) {
    let arr = stopTimesByTrip.get(st.trip_id);
    if (!arr) stopTimesByTrip.set(st.trip_id, (arr = []));
    arr.push(st);
  }
  for (const arr of stopTimesByTrip.values()) {
    arr.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
  }

  const networkLines = [];
  const scheduleLines = [];
  const service = [];
  const stationRegistry = new Map(); // stationId -> {id,name,lat,lng,lines:Set}

  for (const route of keptRoutes) {
    const lineId = route.route_id;
    const lineName =
      route.route_short_name || route.route_long_name || route.route_id;
    const color = route.route_color ? `#${route.route_color}` : "#3DAE2B";
    const routeTrips = trips.filter((t) => t.route_id === route.route_id);
    if (!routeTrips.length) {
      warnings.push(`route ${lineId}: no trips, skipped`);
      continue;
    }

    const netDirections = [];
    const schedDirections = [];

    for (const directionId of ["0", "1"]) {
      const dirTrips = routeTrips.filter(
        (t) => String(t.direction_id || "0") === directionId
      );
      if (!dirTrips.length) continue;

      // Modal shape: the one most trips ride.
      const shapeCounts = new Map();
      for (const t of dirTrips) {
        if (!t.shape_id) continue;
        shapeCounts.set(t.shape_id, (shapeCounts.get(t.shape_id) || 0) + 1);
      }
      const modalShapeId = [...shapeCounts.entries()].sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0];
      const rawShape = shapePointsById.get(modalShapeId);
      if (!rawShape || rawShape.length < 2) {
        warnings.push(`route ${lineId} dir ${directionId}: no usable shape`);
        continue;
      }

      const latlng = dedupePoints(rawShape.map((p) => [p.lat, p.lng]));
      const fullCum = cumulativeKm(latlng);
      const fullXz = latlng.map(([lat, lng]) => {
        const { x, z } = projectPoint(lat, lng);
        return [x, z];
      });

      // Full-run stop pattern: the trip with the most stops on the modal shape.
      const modalTrips = dirTrips.filter((t) => t.shape_id === modalShapeId);
      const patternTrip = modalTrips
        .map((t) => ({ t, st: stopTimesByTrip.get(t.trip_id) || [] }))
        .sort((a, b) => b.st.length - a.st.length)[0];
      if (!patternTrip || patternTrip.st.length < 2) {
        warnings.push(`route ${lineId} dir ${directionId}: no stop pattern`);
        continue;
      }

      // Stations along the direction, snapped to shape arc-length.
      const dirStations = [];
      for (const st of patternTrip.st) {
        const station = stationOfStop(st.stop_id);
        if (!station) {
          warnings.push(`stop ${st.stop_id} missing from stops.txt`);
          continue;
        }
        const { x, z } = projectPoint(Number(station.stop_lat), Number(station.stop_lon));
        const snap = snapToPolylineKm(fullXz, fullCum, x, z);
        if (snap.distKm > 0.5) {
          warnings.push(
            `station ${station.stop_name} snaps ${snap.distKm.toFixed(2)}km off ${lineId}/${directionId}`
          );
        }
        dirStations.push({
          id: station.stop_id,
          name: station.stop_name,
          lat: Number(station.stop_lat),
          lng: Number(station.stop_lon),
          platformStopId: st.stop_id,
          sKm: Number(snap.sKm.toFixed(4)),
        });
        const reg = stationRegistry.get(station.stop_id) || {
          id: station.stop_id,
          name: station.stop_name,
          lat: Number(station.stop_lat),
          lng: Number(station.stop_lon),
          lines: new Set(),
        };
        reg.lines.add(lineId);
        stationRegistry.set(station.stop_id, reg);
      }
      dirStations.sort((a, b) => a.sKm - b.sKm);

      // Run/dwell medians per consecutive station pair (platform-id keyed).
      const runSamples = new Map();
      const dwellSamples = new Map();
      for (const t of modalTrips) {
        const sts = stopTimesByTrip.get(t.trip_id) || [];
        const byStop = new Map(sts.map((s) => [s.stop_id, s]));
        for (let i = 0; i < dirStations.length; i++) {
          const cur = byStop.get(dirStations[i].platformStopId);
          if (!cur) continue;
          const arr = parseGtfsTime(cur.arrival_time);
          const dep = parseGtfsTime(cur.departure_time);
          if (arr != null && dep != null && dep >= arr) {
            const key = dirStations[i].id;
            if (!dwellSamples.has(key)) dwellSamples.set(key, []);
            dwellSamples.get(key).push(dep - arr);
          }
          if (i < dirStations.length - 1) {
            const next = byStop.get(dirStations[i + 1].platformStopId);
            if (!next) continue;
            const nextArr = parseGtfsTime(next.arrival_time);
            if (dep != null && nextArr != null && nextArr > dep) {
              const key = dirStations[i].id;
              if (!runSamples.has(key)) runSamples.set(key, []);
              runSamples.get(key).push(nextArr - dep);
            }
          }
        }
      }

      const schedStations = dirStations.map((s, i) => {
        const dwell = median(dwellSamples.get(s.id) || []);
        const run = median(runSamples.get(s.id) || []);
        return {
          id: s.id,
          name: s.name,
          sKm: s.sKm,
          // GTFS dwell is often 0 — floor it so simulated trains visibly rest.
          dwellSec: Math.max(defaultDwellSec, dwell ?? 0),
          runSecToNext: i < dirStations.length - 1 ? run ?? null : null,
        };
      });
      const missingRun = schedStations.filter(
        (s, i) => i < schedStations.length - 1 && s.runSecToNext == null
      );
      for (const s of missingRun) {
        warnings.push(`no run time after ${s.name} on ${lineId}/${directionId}`);
        s.runSecToNext = 120;
      }

      // Grade annotation join (station-name pairs, order-insensitive).
      const gradeByPair = new Map();
      for (const g of gradeAnnotations) {
        const a = normalizeStationName(g.from);
        const b = normalizeStationName(g.to);
        gradeByPair.set(`${a}|${b}`, g.grade);
        gradeByPair.set(`${b}|${a}`, g.grade);
      }
      const grades = [];
      for (let i = 0; i < dirStations.length - 1; i++) {
        const a = normalizeStationName(dirStations[i].name);
        const b = normalizeStationName(dirStations[i + 1].name);
        let grade = gradeByPair.get(`${a}|${b}`);
        if (!grade) {
          grade = "at-grade";
          warnings.push(
            `no grade annotation for ${dirStations[i].name} -> ${dirStations[i + 1].name}, defaulting at-grade`
          );
        }
        const prev = grades[grades.length - 1];
        if (prev && prev.grade === grade) {
          prev.toKm = dirStations[i + 1].sKm;
        } else {
          grades.push({
            fromKm: dirStations[i].sKm,
            toKm: dirStations[i + 1].sKm,
            grade,
          });
        }
      }
      if (grades.length) {
        grades[0].fromKm = 0;
        grades[grades.length - 1].toKm = fullCum[fullCum.length - 1];
      }

      // Downsampled geometry (rendering finer than the simulator polyline).
      const netIdx = douglasPeuckerIndices(fullXz, networkToleranceKm);
      const schedIdx = douglasPeuckerIndices(fullXz, scheduleToleranceKm);
      const round = (v, d) => Number(v.toFixed(d));

      netDirections.push({
        directionId: Number(directionId),
        headsign: patternTrip.t.trip_headsign || "",
        points: netIdx.map((i) => [round(fullXz[i][0], 4), round(fullXz[i][1], 4)]),
        cumKm: netIdx.map((i) => round(fullCum[i], 4)),
        grades,
        stations: dirStations.map((s) => ({ id: s.id, sKm: s.sKm })),
      });
      schedDirections.push({
        directionId: Number(directionId),
        headsign: patternTrip.t.trip_headsign || "",
        polyline: schedIdx.map((i) => [round(latlng[i][0], 6), round(latlng[i][1], 6)]),
        cumKm: schedIdx.map((i) => round(fullCum[i], 4)),
        stations: schedStations,
      });

      // Headway bands per service-day bucket from first-stop departures.
      // Feeds carry several overlapping service_ids per bucket (week-specific
      // calendars); merging their departures would double-count trips and
      // halve the apparent headway. One service_id — the busiest — is the
      // canonical day.
      const byBucket = new Map(); // bucket -> service_id -> departures[]
      const addDeparture = (bucket, serviceId, minutes) => {
        if (!byBucket.has(bucket)) byBucket.set(bucket, new Map());
        const perService = byBucket.get(bucket);
        if (!perService.has(serviceId)) perService.set(serviceId, []);
        perService.get(serviceId).push(minutes);
      };
      for (const t of dirTrips) {
        const sts = stopTimesByTrip.get(t.trip_id);
        if (!sts?.length) continue;
        const dep = parseGtfsTime(sts[0].departure_time);
        if (dep == null) continue;
        const bucket = bucketByServiceId.get(t.service_id) || null;
        const buckets =
          bucket === "daily"
            ? ["weekday", "saturday", "sunday"]
            : bucket
              ? [bucket]
              : [];
        for (const bk of buckets) addDeparture(bk, t.service_id, dep / 60);
      }
      if (!byBucket.size) {
        warnings.push(
          `route ${lineId} dir ${directionId}: no classifiable service days; assuming weekday`
        );
        for (const t of dirTrips) {
          const st = stopTimesByTrip.get(t.trip_id)?.[0];
          const dep = st ? parseGtfsTime(st.departure_time) : null;
          if (dep != null) addDeparture("weekday", t.service_id, dep / 60);
        }
      }
      for (const [bucket, perService] of byBucket) {
        const canonical = [...perService.values()].sort((a, b) => b.length - a.length)[0];
        service.push({
          lineId,
          directionId: Number(directionId),
          dayBucket: bucket,
          bands: deriveHeadwayBands(canonical),
        });
      }
    }

    if (!netDirections.length) continue;
    networkLines.push({ id: lineId, name: lineName, color, directions: netDirections });
    scheduleLines.push({ id: lineId, name: lineName, directions: schedDirections });
  }

  const stations = [...stationRegistry.values()]
    .map((s) => {
      const { x, z } = projectPoint(s.lat, s.lng);
      return {
        id: s.id,
        name: s.name,
        x: Number(x.toFixed(4)),
        z: Number(z.toFixed(4)),
        lines: [...s.lines].sort(),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const meta = { generatedAt, source, projection: PROJECTION };
  return {
    network: { meta, lines: networkLines, stations },
    schedule: {
      meta: { generatedAt, source, timezone: "America/Los_Angeles" },
      lines: scheduleLines,
      service,
    },
    warnings,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function loadZip(args, repoRoot) {
  const AdmZip = (await import("adm-zip")).default;
  let zip;
  if (args["gtfs-zip"]) {
    zip = new AdmZip(path.resolve(args["gtfs-zip"]));
  } else {
    const url = args["gtfs-url"] || DEFAULT_GTFS_URL;
    console.log(`⬇  fetching ${url}`);
    const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`GTFS download failed: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const cachePath = path.join(repoRoot, "scripts", "gtfs-cache.zip");
    fs.writeFileSync(cachePath, buf); // gitignored; handy for reruns
    zip = new AdmZip(buf);
  }
  const files = {};
  for (const name of [
    "routes.txt",
    "trips.txt",
    "stops.txt",
    "stop_times.txt",
    "shapes.txt",
    "calendar.txt",
    "calendar_dates.txt",
  ]) {
    const entry = zip.getEntry(name);
    if (entry) files[name] = zip.readAsText(entry);
  }
  for (const required of ["routes.txt", "trips.txt", "stops.txt", "stop_times.txt", "shapes.txt"]) {
    if (!files[required]) throw new Error(`GTFS zip missing ${required}`);
  }
  return files;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    if (key === "include-tline") args[key] = true;
    else args[key] = argv[++i];
  }
  return args;
}

async function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const args = parseArgs(process.argv.slice(2));
  const gradeAnnotations = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "scripts/data/link-grade-annotations.json"), "utf8")
  );

  const files = await loadZip(args, repoRoot);
  const { network, schedule, warnings } = processGtfs(files, {
    includeTLine: Boolean(args["include-tline"]),
    gradeAnnotations,
    source: args["gtfs-url"] || (args["gtfs-zip"] ? path.basename(args["gtfs-zip"]) : DEFAULT_GTFS_URL),
  });

  for (const w of warnings) console.warn(`⚠  ${w}`);

  const outNetwork = path.resolve(repoRoot, args["out-network"] || OUT_NETWORK);
  const outSchedule = path.resolve(repoRoot, args["out-schedule"] || OUT_SCHEDULE);
  fs.mkdirSync(path.dirname(outNetwork), { recursive: true });
  fs.mkdirSync(path.dirname(outSchedule), { recursive: true });
  fs.writeFileSync(outNetwork, JSON.stringify(network, null, 2) + "\n");
  fs.writeFileSync(outSchedule, JSON.stringify(schedule, null, 2) + "\n");

  for (const line of network.lines) {
    const d0 = line.directions[0];
    const lengthKm = d0 ? d0.cumKm[d0.cumKm.length - 1].toFixed(1) : "?";
    console.log(`✓ ${line.name}: ${d0?.stations.length ?? 0} stations, ${lengthKm} km`);
  }
  console.log(`✓ wrote ${path.relative(repoRoot, outNetwork)} (${network.stations.length} stations)`);
  console.log(`✓ wrote ${path.relative(repoRoot, outSchedule)} (${schedule.service.length} service patterns)`);
  if (warnings.length) console.log(`  (${warnings.length} warnings above)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  });
}
