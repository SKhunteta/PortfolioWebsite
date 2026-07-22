// The bus fleet's pure half: Metro's SERVICE SPAN and the stop-and-go motion
// profile. The street cars key to traffic PRESSURE (world/traffic.ts — two
// commute humps over a faint floor), but a transit agency runs a different
// clock: an early ramp as the first runs pull out around 5am, both rush
// peaks, a STEADY midday base (service keeps rolling while car traffic
// slumps), a long evening tail past 11pm, and only the owl network's whisper
// at 3am. That span curve, and the distance-vs-time profile of a bus working
// its corridor stop to stop (drive a hop, dwell at the stop, pull out again),
// are plain math — node-safe, deterministic, vitest-covered
// (world/__tests__/buses.test.ts). map/Buses.tsx consumes both.
//
// Same honesty tier as the cars/cyclists/ferries: true to the real Seattle
// hour, deterministic from the scene clock, NEVER presented as live — there
// is no per-bus feed, and the fleet is clearly stylized toys.
//
// ?buses=off|0..1 pins the service level for demos, tests, and screenshots
// (matching ?traffic= / ?phase= / ?weather=).

import { localHour } from "./traffic";

/** Metro's service span 0..1 by fractional Seattle hour. Shape, not schedule:
 *  a 5am ramp, rush peaks near 8:00 and 17:30, a solid midday base, an
 *  evening tail, an owl-network floor overnight. */
export function busServiceAt(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  // The day plateau: service is UP from the ~5am pull-out to the ~7pm
  // shoulder, then tapers through the evening instead of cutting off.
  const up = smooth01((h - 4.7) / 1.9);
  const down = 1 - smooth01((h - 19.0) / 5.6); // ~1 at 19:00 → ~0 past midnight
  const plateau = 0.55 * up * down;
  // Rush peaks ride on top of the plateau — narrower than the car humps
  // (extra runs are scheduled tight around the commute).
  const am = 0.45 * Math.exp(-Math.pow((h - 8.0) / 1.3, 2));
  const pm = 0.45 * Math.exp(-Math.pow((h - 17.5) / 1.5, 2));
  // The owl floor: a handful of night routes never stop rolling.
  return Math.min(1, 0.04 + plateau + Math.max(am, pm));
}

function smooth01(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

export interface BusRun {
  lengthKm: number; // corridor length
  speedKmS: number; // cruising pace between stops
  stopSpacingKm: number; // target distance between stops
  dwellS: number; // held at each stop
  phase: number; // 0..1 fraction of the loop already run at t = 0
}

export interface BusCycle {
  hops: number; // stops per loop (>= 1)
  hopKm: number; // corridor length / hops
  hopTravelS: number; // seconds driving one hop
  hopS: number; // seconds per hop including the dwell
  periodS: number; // full loop time
}

/** The loop's fixed timing: the corridor divides into `hops` even hops (the
 *  nearest whole count to the target spacing), each driven then dwelt. */
export function busCycle(run: BusRun): BusCycle {
  const hops = Math.max(1, Math.round(run.lengthKm / run.stopSpacingKm));
  const hopKm = run.lengthKm / hops;
  const hopTravelS = hopKm / run.speedKmS;
  const hopS = hopTravelS + run.dwellS;
  return { hops, hopKm, hopTravelS, hopS, periodS: hops * hopS };
}

export interface BusMotion {
  s: number; // distance along the corridor, 0..lengthKm, loops
  moving: number; // 0 dwelling at a stop .. 1 under way (eased at both ends)
}

// Seconds a bus spends easing out of / into a stop — drives both the `moving`
// ease and the pull-to-the-curb slide in map/Buses.tsx.
export const BUS_EASE_S = 2.5;

const motion: BusMotion = { s: 0, moving: 0 };

/** Where along its corridor a bus is at clock time t: drive a hop, dwell at
 *  the stop, pull out again — monotonic within a loop, wrapping at the end.
 *  `moving` eases 0→1→0 across each hop so the frame code can slide the bus
 *  to the curb and still it while it dwells. */
export function busDistanceAt(tS: number, run: BusRun, out: BusMotion = motion): BusMotion {
  const cyc = busCycle(run);
  let p = (tS + run.phase * cyc.periodS) % cyc.periodS;
  if (p < 0) p += cyc.periodS;
  const hop = Math.floor(p / cyc.hopS);
  const within = p - hop * cyc.hopS;
  const travelT = Math.min(within, cyc.hopTravelS);
  out.s = hop * cyc.hopKm + travelT * run.speedKmS;
  out.moving =
    within >= cyc.hopTravelS
      ? 0
      : Math.min(1, travelT / BUS_EASE_S) *
        Math.min(1, (cyc.hopTravelS - travelT) / BUS_EASE_S);
  return out;
}

// --- the live service level (browser half; guarded like world/traffic.ts) ---

function parseOverride(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("buses");
  if (raw == null) return null;
  if (raw === "off") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null;
}

let override: number | null = parseOverride();

export function setBusOverride(value: number | null) {
  override = value == null ? null : Math.max(0, Math.min(1, value));
}

// The span only crawls; cache the Intl-formatted hour like trafficIntensity.
const cache = { at: -1e9, value: 0 };

/** Service level right now, 0..1. Cheap to call every frame. */
export function busService(): number {
  if (override != null) return override;
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  if (now - cache.at < 8000) return cache.value;
  cache.at = now;
  cache.value = busServiceAt(localHour(new Date()));
  return cache.value;
}
