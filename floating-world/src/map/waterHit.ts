// Cheap world-space "is this on the Sound / a lake?" queries, shared by the
// watercolor reflections (map/Reflections.tsx) so a reflection can never spill
// onto the paper. Built from the SAME water geometry Water.tsx paints — the
// baked OSM basemap when it's real, the hand-authored waterData.ts rings when
// it's still the placeholder — so the mask always agrees with the blue.
//
// Everything is precomputed once into flat XZ polygons with bounding boxes;
// the per-frame query is a bbox reject (kills all but a polygon or two) then an
// even-odd ray cast, so gating every train each frame stays effectively free.

import { WATER } from "./waterData";
import { projectLatLng } from "./network";
import { HAS_BASEMAP, BASEMAP_WATER, BasemapPolygon } from "./basemap";

interface HitPolygon {
  ring: [number, number][];
  holes: [number, number][][];
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function bbox(ring: [number, number][]): { minX: number; maxX: number; minZ: number; maxZ: number } {
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const [x, z] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}

function projectedPolygons(): BasemapPolygon[] {
  if (HAS_BASEMAP) return BASEMAP_WATER;
  // Honest fallback: the same hand-authored rings Water.tsx draws, projected.
  return WATER.map((body) => ({
    ring: body.ring.map(([lat, lng]) => {
      const { x, z } = projectLatLng(lat, lng);
      return [x, z] as [number, number];
    }),
    holes: (body.holes ?? []).map((hole) =>
      hole.map(([lat, lng]) => {
        const { x, z } = projectLatLng(lat, lng);
        return [x, z] as [number, number];
      })
    ),
  }));
}

const POLYS: HitPolygon[] = projectedPolygons().map((p) => ({
  ring: p.ring,
  holes: p.holes,
  ...bbox(p.ring),
}));

/** Even-odd ray cast: is (x, z) inside this closed ring? */
function inRing(x: number, z: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** True when the world-space point sits on painted water (inside an outer ring
 *  and outside every island hole). Bbox-prefiltered, so most calls are one
 *  comparison. */
export function isOverWater(x: number, z: number): boolean {
  for (const poly of POLYS) {
    if (x < poly.minX || x > poly.maxX || z < poly.minZ || z > poly.maxZ) continue;
    if (!inRing(x, z, poly.ring)) continue;
    let inHole = false;
    for (const hole of poly.holes) {
      if (inRing(x, z, hole)) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

function nearestOnSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): { x: number; z: number; d2: number } {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz;
  let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const x = ax + t * dx;
  const z = az + t * dz;
  return { x, z, d2: (px - x) ** 2 + (pz - z) ** 2 };
}

/** For a land-bound source (the Needle spire, a stadium bowl), the point ON the
 *  nearest shoreline where its glow would pool — stepped a little past the
 *  waterline into open water so the reflection reads as blue, not edge. Returns
 *  null when no water lies within `maxKm` (don't fake a reflection with nothing
 *  to reflect into). Computed once at mount; the sources never move. */
export function nearestWaterAnchor(
  x: number,
  z: number,
  maxKm: number
): { x: number; z: number } | null {
  let best = { x: 0, z: 0, d2: Infinity };
  const max2 = maxKm * maxKm;
  for (const poly of POLYS) {
    if (
      x < poly.minX - maxKm ||
      x > poly.maxX + maxKm ||
      z < poly.minZ - maxKm ||
      z > poly.maxZ + maxKm
    )
      continue;
    const rings = [poly.ring, ...poly.holes];
    for (const ring of rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const n = nearestOnSegment(x, z, ring[j][0], ring[j][1], ring[i][0], ring[i][1]);
        if (n.d2 < best.d2) best = n;
      }
    }
  }
  if (best.d2 > max2) return null;
  // Step from the source past the waterline into the water body (the source is
  // on land, so heading further along source→shore crosses into open water).
  // Narrow channels can miss on a single step, so walk a few distances and take
  // the first that truly lands on water; if none do, don't fake a reflection
  // with nowhere honest to fall.
  const d = Math.sqrt(best.d2) || 1;
  const ux = (best.x - x) / d;
  const uz = (best.z - z) / d;
  for (const step of [0.15, 0.25, 0.4, 0.6]) {
    const p = { x: best.x + ux * step, z: best.z + uz * step };
    if (isOverWater(p.x, p.z)) return p;
  }
  return null;
}
