// Deterministic scatter helpers for the two landscape layers the poster lives
// on: the forest that carpets the land (Forest.tsx) and the woodblock town
// that lines the streets (Buildings.tsx). A seeded RNG (the same forest and
// the same town every visit), land/water testing against the baked OSM water
// polygons, park testing for a density boost, and point sampling along the
// road network. Everything works in projected km [x, z], the same space the
// rest of map/ uses. One-time cost at layer init — never per frame.

import { BASEMAP_WATER, BASEMAP_PARKS, BASEMAP_ROADS } from "./basemap";

/** mulberry32 — a tiny fast seeded PRNG. Same seed → same sequence, so the
 *  scatter is stable across reloads (no Math.random anywhere on the map). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- value-noise fbm (JS twin of the shader's) for forest clumping ---------
function vhash(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = vhash(xi, zi);
  const b = vhash(xi + 1, zi);
  const c = vhash(xi, zi + 1);
  const d = vhash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x: number, z: number): number {
  let f = 0;
  let amp = 0.5;
  let fr = 1;
  for (let i = 0; i < 4; i++) {
    f += amp * vnoise(x * fr, z * fr);
    fr *= 2.03;
    amp *= 0.5;
  }
  return f;
}

// --- polygon tests ----------------------------------------------------------
interface BBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
function ringBBox(ring: [number, number][]): BBox {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}

function pointInRing(x: number, z: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const zi = ring[i][1];
    const xj = ring[j][0];
    const zj = ring[j][1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

const WATER_BB = BASEMAP_WATER.map((p) => ({ poly: p, bb: ringBBox(p.ring) }));
const PARK_BB = BASEMAP_PARKS.map((p) => ({ poly: p, bb: ringBBox(p.ring) }));

/** True when (x, z) falls on open water — inside a water ring but not inside
 *  one of its holes (islands like Mercer and Vashon read as land). */
export function isWater(x: number, z: number): boolean {
  for (const { poly, bb } of WATER_BB) {
    if (x < bb.minX || x > bb.maxX || z < bb.minZ || z > bb.maxZ) continue;
    if (!pointInRing(x, z, poly.ring)) continue;
    let inHole = false;
    for (const h of poly.holes) {
      if (pointInRing(x, z, h)) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

/** True when (x, z) falls inside a park polygon (forest-density boost). */
export function isPark(x: number, z: number): boolean {
  for (const { poly, bb } of PARK_BB) {
    if (x < bb.minX || x > bb.maxX || z < bb.minZ || z > bb.maxZ) continue;
    if (pointInRing(x, z, poly.ring)) return true;
  }
  return false;
}

/** The geography's bounding box (water + parks), the scatter's outer bound. */
export const GEO_BBOX: BBox = (() => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const bb of [...WATER_BB, ...PARK_BB].map((e) => e.bb)) {
    if (bb.minX < minX) minX = bb.minX;
    if (bb.maxX > maxX) maxX = bb.maxX;
    if (bb.minZ < minZ) minZ = bb.minZ;
    if (bb.maxZ > maxZ) maxZ = bb.maxZ;
  }
  return { minX, maxX, minZ, maxZ };
})();

// --- road sampling (for the building fabric) -------------------------------
export interface RoadPoint {
  x: number;
  z: number;
  nx: number; // unit normal to the road (which way the frontage faces)
  nz: number;
}

/** Walk every road polyline at ~spacingKm and emit a point on each side,
 *  offset off the centerline — the frontages that the town lines up along. */
export function sampleRoadFrontages(spacingKm: number, offsetKm: number): RoadPoint[] {
  const out: RoadPoint[] = [];
  const roads = [...BASEMAP_ROADS.major, ...BASEMAP_ROADS.arterial];
  for (const line of roads) {
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, az] = line[i];
      const [bx, bz] = line[i + 1];
      const dx = bx - ax;
      const dz = bz - az;
      const len = Math.hypot(dx, dz);
      if (len < 1e-4) continue;
      const ux = dx / len;
      const uz = dz / len;
      const nx = -uz; // left normal
      const nz = ux;
      const steps = Math.max(1, Math.floor(len / spacingKm));
      for (let s = 0; s < steps; s++) {
        const t = (s + 0.5) / steps;
        const px = ax + dx * t;
        const pz = az + dz * t;
        out.push({ x: px + nx * offsetKm, z: pz + nz * offsetKm, nx, nz });
        out.push({ x: px - nx * offsetKm, z: pz - nz * offsetKm, nx: -nx, nz: -nz });
      }
    }
  }
  return out;
}
