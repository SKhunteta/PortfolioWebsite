// Where the rails cross open water — computed, not hand-annotated: each
// direction's polyline is sampled against the real water polygons (baked
// OSM basemap, or the hand-authored fallback rings) and merged into
// arc-length spans. The star is the 2 Line's I-90 crossing of Lake
// Washington — the only light rail on a floating bridge on Earth — but any
// honest over-water span qualifies. Tunnel grades never count: a train
// under the Montlake Cut casts no light on the water above it.
//
// Spans are lazy per direction and cached: a one-time ~1300-sample sweep
// per direction, bbox-filtered point-in-polygon, then O(#spans) lookups
// per frame.

import { HAS_BASEMAP, BASEMAP_WATER, BasemapPolygon } from "./basemap";
import { WATER } from "./waterData";
import { projectLatLng, pointAt, gradeAt, DirectionGeometry } from "./network";

export interface WaterSpan {
  fromKm: number;
  toKm: number;
}

const SAMPLE_KM = 0.05;
const MIN_SPAN_KM = 0.35; // culverts and slivers don't get reflections
const EDGE_FADE_KM = 0.3; // reflections bloom in as the train rolls out over water

interface IndexedPolygon {
  poly: BasemapPolygon;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function fallbackPolygons(): BasemapPolygon[] {
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

let indexed: IndexedPolygon[] | null = null;

function waterIndex(): IndexedPolygon[] {
  if (indexed) return indexed;
  const polys = HAS_BASEMAP ? BASEMAP_WATER : fallbackPolygons();
  indexed = polys.map((poly) => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const [x, z] of poly.ring) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    return { poly, minX, maxX, minZ, maxZ };
  });
  return indexed;
}

function inRing(ring: [number, number][], x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function overWaterXZ(x: number, z: number): boolean {
  for (const p of waterIndex()) {
    if (x < p.minX || x > p.maxX || z < p.minZ || z > p.maxZ) continue;
    if (!inRing(p.poly.ring, x, z)) continue;
    let inHole = false;
    for (const hole of p.poly.holes) {
      if (inRing(hole, x, z)) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true; // Mercer Island is a hole, not water
  }
  return false;
}

const SPAN_CACHE = new WeakMap<DirectionGeometry, WaterSpan[]>();
const scratch = { x: 0, z: 0 };

export function overWaterSpans(dir: DirectionGeometry): WaterSpan[] {
  const cached = SPAN_CACHE.get(dir);
  if (cached) return cached;

  const spans: WaterSpan[] = [];
  let open: WaterSpan | null = null;
  for (let s = 0; s <= dir.totalKm; s += SAMPLE_KM) {
    pointAt(dir, s, scratch);
    const over = gradeAt(dir, s) !== "tunnel" && overWaterXZ(scratch.x, scratch.z);
    if (over) {
      if (!open) open = { fromKm: s, toKm: s };
      else open.toKm = s;
    } else if (open) {
      if (open.toKm - open.fromKm >= MIN_SPAN_KM) spans.push(open);
      open = null;
    }
  }
  if (open && open.toKm - open.fromKm >= MIN_SPAN_KM) spans.push(open);

  SPAN_CACHE.set(dir, spans);
  return spans;
}

/** 0 on land, easing to 1 once the train is EDGE_FADE_KM out over water. */
export function overWaterAt(dir: DirectionGeometry, sKm: number): number {
  for (const span of overWaterSpans(dir)) {
    if (sKm < span.fromKm) return 0; // spans are ordered by fromKm
    if (sKm <= span.toKm) {
      const depth = Math.min(sKm - span.fromKm, span.toKm - sKm);
      const t = Math.min(1, Math.max(0, depth / EDGE_FADE_KM));
      return t * t * (3 - 2 * t);
    }
  }
  return 0;
}
