// The live bus layer's pure half: wire-format types, the livery assignment,
// the painted-page clip, the nearest-to-the-heart cap, bearing→yaw, and the
// glide step a live bus takes toward its latest fix. All node-safe and
// vitest-covered (world/__tests__/metroBuses.test.ts); world/busFeed.ts owns
// the browser poller and map/Buses.tsx the rendering.
//
// Liveries are painted from reference photos of the real fleet (see
// map/Buses.tsx): most coaches wear Metro's deep green over the gold skirt,
// a share the battery-electric fleet's royal blue, and RapidRide coaches
// their red. RapidRide is REAL data (the feed's rr flag, keyed off the OBA
// route list); the green/blue split is a deterministic per-vehicle hash — an
// honest nod to the mixed fleet, never a claim about a specific coach.

export interface ApiBus {
  id: string;
  lat: number;
  lon: number;
  hdg?: number; // GTFS bearing, degrees clockwise from north; absent if unknown
  ts: number;
  rr?: number; // 1 = RapidRide coach
}

export interface MetroPayload {
  mode: "live" | "unavailable";
  vehicles: ApiBus[];
  fetchedAt: string;
}

// Livery indices — the shader's aLivery attribute reads these.
export const LIVERY_GREEN = 0; // standard Metro: deep green over the gold skirt
export const LIVERY_BLUE = 1; // battery-electric royal blue
export const LIVERY_RED = 2; // RapidRide red

// Deterministic 0..1 hash of a vehicle id — the scene's no-Math.random rule;
// the same coach keeps the same coat on every poll and every reload.
export function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs((Math.sin(h * 12.9898 + 78.233) * 43758.5453) % 1);
}

// Roughly one coach in six of the real fleet is a battery-electric bus.
const BLUE_SHARE = 0.17;

/** Livery for a live vehicle: RapidRide red is data; green/blue is hashed. */
export function liveryFor(id: string, rr: boolean): number {
  if (rr) return LIVERY_RED;
  return hashId(id) < BLUE_SHARE ? LIVERY_BLUE : LIVERY_GREEN;
}

// The painted page (basemap roads span ~x −21..27, z −29..30 km): Metro
// serves the whole county, so coaches beyond the sheet's edge are dropped
// rather than drawn onto blank void past the shorelines.
export const PAGE_BOUNDS = { x: 28, z: 31 };

export function onPage(x: number, z: number): boolean {
  return Math.abs(x) <= PAGE_BOUNDS.x && Math.abs(z) <= PAGE_BOUNDS.z;
}

/** When the fleet outnumbers the tier's instance budget, keep the coaches
 *  nearest the downtown heart — the drift camera's home — so the cap sheds
 *  the far suburban tail first. Stable and deterministic (distance, then id). */
export function capByHeart<T extends { x: number; z: number; id: string }>(
  buses: T[],
  cap: number,
  heartX: number,
  heartZ: number
): T[] {
  if (buses.length <= cap) return buses;
  return [...buses]
    .sort((a, b) => {
      const da = (a.x - heartX) ** 2 + (a.z - heartZ) ** 2;
      const db = (b.x - heartX) ** 2 + (b.z - heartZ) ** 2;
      return da - db || (a.id < b.id ? -1 : 1);
    })
    .slice(0, cap);
}

/** GTFS bearing (degrees clockwise from north) → scene yaw for the +X-nosed
 *  bus model. Scene axes: +x east, +z south (projectLatLng negates latitude),
 *  and yaw = atan2(-z, x) as everywhere else in the map layers. */
export function yawFromBearing(bearingDeg: number): number {
  const rad = (bearingDeg * Math.PI) / 180;
  // Bearing 0 = due north = direction (0, -1) in scene xz.
  const dirX = Math.sin(rad);
  const dirZ = -Math.cos(rad);
  return Math.atan2(-dirZ, dirX);
}

export interface GlideConfig {
  ratePerS: number; // exponential approach rate toward the fix
  snapKm: number; // beyond this gap, jump (tab resume / reassigned coach)
}

/** One frame's glide toward the latest fix: exponential ease, snapping when
 *  the gap says interpolation would be a lie. Returns the new position. */
export function stepGlide(
  x: number,
  z: number,
  targetX: number,
  targetZ: number,
  dtS: number,
  cfg: GlideConfig
): { x: number; z: number } {
  const dx = targetX - x;
  const dz = targetZ - z;
  const dist = Math.hypot(dx, dz);
  if (dist > cfg.snapKm) return { x: targetX, z: targetZ };
  const k = 1 - Math.exp(-cfg.ratePerS * dtS);
  return { x: x + dx * k, z: z + dz * k };
}
