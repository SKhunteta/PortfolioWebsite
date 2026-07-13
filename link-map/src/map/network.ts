// Runtime model of the baked GTFS geometry (src/data/network.json, generated
// by scripts/build-link-network.mjs at the repo root — re-run it when the
// network changes). Everything downstream — ribbons, train tweens, station
// pulses — works in (direction, sKm) arc-length space and converts to XZ
// through these helpers.

import networkJson from "../data/network.json";

export interface GradeRange {
  fromKm: number;
  toKm: number;
  grade: "tunnel" | "elevated" | "at-grade";
}

export interface DirectionGeometry {
  lineId: string;
  directionId: number;
  headsign: string;
  points: Float32Array; // x0,z0,x1,z1,...
  cumKm: Float32Array;
  totalKm: number;
  grades: GradeRange[];
  stations: { id: string; sKm: number }[];
}

export interface LineGeometry {
  id: string;
  name: string;
  color: string;
  directions: DirectionGeometry[];
}

export interface Station {
  id: string;
  name: string;
  x: number;
  z: number;
  lines: string[];
}

interface RawNetwork {
  meta: { projection: { originLat: number; originLng: number; kmPerDegLat: number; kmPerDegLng: number } };
  lines: {
    id: string;
    name: string;
    color: string;
    directions: {
      directionId: number;
      headsign: string;
      points: [number, number][];
      cumKm: number[];
      grades: GradeRange[];
      stations: { id: string; sKm: number }[];
    }[];
  }[];
  stations: Station[];
}

const raw = networkJson as unknown as RawNetwork;

export const PROJECTION = raw.meta.projection;

export function projectLatLng(lat: number, lng: number): { x: number; z: number } {
  return {
    x: (lng - PROJECTION.originLng) * PROJECTION.kmPerDegLng,
    z: -(lat - PROJECTION.originLat) * PROJECTION.kmPerDegLat,
  };
}

export const LINES: LineGeometry[] = raw.lines.map((line) => ({
  id: line.id,
  name: line.name,
  color: line.color,
  directions: line.directions.map((dir) => {
    const points = new Float32Array(dir.points.length * 2);
    dir.points.forEach(([x, z], i) => {
      points[i * 2] = x;
      points[i * 2 + 1] = z;
    });
    const cumKm = Float32Array.from(dir.cumKm);
    return {
      lineId: line.id,
      directionId: dir.directionId,
      headsign: dir.headsign,
      points,
      cumKm,
      totalKm: dir.cumKm[dir.cumKm.length - 1],
      grades: dir.grades,
      stations: dir.stations,
    };
  }),
}));

export const LINE_BY_ID = new Map(LINES.map((l) => [l.id, l]));
export const STATIONS: Station[] = raw.stations;
export const STATION_BY_ID = new Map(STATIONS.map((s) => [s.id, s]));

// Scene centroid — the camera's home.
export const CENTROID = (() => {
  let x = 0;
  let z = 0;
  for (const s of STATIONS) {
    x += s.x;
    z += s.z;
  }
  const n = Math.max(1, STATIONS.length);
  return { x: x / n, z: z / n };
})();

function segmentIndexFor(dir: DirectionGeometry, sKm: number): number {
  const { cumKm } = dir;
  let lo = 0;
  let hi = cumKm.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cumKm[mid] <= sKm) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** XZ position at an arc length along a direction's polyline. */
export function pointAt(dir: DirectionGeometry, sKm: number, out: { x: number; z: number }) {
  const s = Math.max(0, Math.min(dir.totalKm, sKm));
  const i = segmentIndexFor(dir, s);
  const span = dir.cumKm[i + 1] - dir.cumKm[i];
  const t = span > 0 ? (s - dir.cumKm[i]) / span : 0;
  out.x = dir.points[i * 2] + (dir.points[(i + 1) * 2] - dir.points[i * 2]) * t;
  out.z = dir.points[i * 2 + 1] + (dir.points[(i + 1) * 2 + 1] - dir.points[i * 2 + 1]) * t;
  return out;
}

/** Unit tangent (direction of travel) at an arc length. */
export function tangentAt(dir: DirectionGeometry, sKm: number, out: { x: number; z: number }) {
  const s = Math.max(0, Math.min(dir.totalKm, sKm));
  const i = segmentIndexFor(dir, s);
  const dx = dir.points[(i + 1) * 2] - dir.points[i * 2];
  const dz = dir.points[(i + 1) * 2 + 1] - dir.points[i * 2 + 1];
  const len = Math.hypot(dx, dz) || 1;
  out.x = dx / len;
  out.z = dz / len;
  return out;
}

/** Grade class at an arc length (drives train y so it dips through tunnels). */
export function gradeAt(dir: DirectionGeometry, sKm: number): GradeRange["grade"] {
  for (const g of dir.grades) {
    if (sKm >= g.fromKm && sKm <= g.toKm) return g.grade;
  }
  return "at-grade";
}

/** Nearest arc length to an XZ point, optionally windowed around a hint —
 *  the poller uses the previous position so a train never snaps to the
 *  wrong fold of the line. Returns the perpendicular distance too, so
 *  callers can reject off-shape matches. */
export function nearestS(
  dir: DirectionGeometry,
  x: number,
  z: number,
  sHint?: number,
  windowKm = Infinity
): { sKm: number; distKm: number } {
  const { points, cumKm } = dir;
  let best = { sKm: 0, distKm: Infinity };
  for (let i = 0; i < cumKm.length - 1; i++) {
    if (sHint != null && Number.isFinite(windowKm)) {
      if (cumKm[i + 1] < sHint - windowKm || cumKm[i] > sHint + windowKm) continue;
    }
    const ax = points[i * 2];
    const az = points[i * 2 + 1];
    const bx = points[(i + 1) * 2];
    const bz = points[(i + 1) * 2 + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
    const px = ax + t * dx;
    const pz = az + t * dz;
    const d = Math.hypot(x - px, z - pz);
    if (d < best.distKm) {
      best = { sKm: cumKm[i] + (cumKm[i + 1] - cumKm[i]) * t, distKm: d };
    }
  }
  return best;
}
