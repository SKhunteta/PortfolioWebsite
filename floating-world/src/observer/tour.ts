// The cinematic idle tour: when the print is left alone long enough, the
// camera stops circling its downtown home and takes a slow, curated circuit of
// the whole line — the heart of downtown, out over Lake Washington on the 2
// Line, across to the Eastside, up the north spine, then the long southern run
// to the airport — pausing to breathe at each before moving on, and looping.
//
// It is a thin timeline, not a new camera: it only supplies a moving LOOK-AT
// CENTRE and framing (radius, elevation). CameraRig keeps its own orbit theta
// turning and its own exponential smoothing, so each stop still rotates gently
// and the transitions never snap — the tour just walks the home of the drift
// from landmark to landmark. Any input in CameraRig resets the idle clock and
// drops straight back to the ordinary drift.
//
// Stops anchor to real stations by id (resolved from the network) so the
// framing tracks the true geography; an explicit fallback keeps it robust if a
// station id ever changes. ?tour=off disables it (the classic downtown drift
// stays forever); ?tour=on starts it immediately, for demos, tests and
// screenshots — the same override vocabulary as ?phase= / ?weather=.

import { STATION_BY_ID } from "../map/network";
import { CONFIG } from "../world/config";

interface TourStop {
  /** Station id whose position anchors this stop's look-at centre. */
  anchor: string;
  /** Used if the station id isn't in the network (defensive). */
  fallback: { x: number; z: number };
  radiusKm: number;
  elevation: number; // radians above the horizon (matches driftElevation)
  label: string;
}

// A gentle clockwise-ish circuit of the network. Framing is hand-tuned per
// stop: intimate and low over the dense downtown tunnel mouth, pulled back and
// skimming for the water crossing and the long airport run.
const STOPS: TourStop[] = [
  { anchor: "C03", fallback: { x: -0.35, z: -0.6 }, radiusKm: 9, elevation: 0.8, label: "downtown" },
  { anchor: "E07", fallback: { x: 7.42, z: 2.0 }, radiusKm: 10.5, elevation: 0.68, label: "Lake Washington" },
  { anchor: "E25", fallback: { x: 14.5, z: -3.35 }, radiusKm: 11, elevation: 0.86, label: "the Eastside" },
  { anchor: "N07", fallback: { x: 1.35, z: -6.02 }, radiusKm: 12, elevation: 0.9, label: "the north spine" },
  { anchor: "C37", fallback: { x: 2.64, z: 17.9 }, radiusKm: 11, elevation: 0.78, label: "the airport run" },
];

export interface TourFraming {
  x: number;
  z: number;
  radiusKm: number;
  elevation: number;
}

function centre(stop: { anchor: string; fallback: { x: number; z: number } }): {
  x: number;
  z: number;
} {
  const st = STATION_BY_ID.get(stop.anchor);
  return st ? { x: st.x, z: st.z } : stop.fallback;
}

const smoothstep = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Framing at a given number of seconds into the tour, written into `out`.
 *  Each stop holds for dwellS, then the camera travels to the next over
 *  travelS; the whole loop repeats. Continuous in centre, radius and
 *  elevation, so CameraRig's smoothing never sees a jump. */
export function tourFraming(elapsedS: number, out: TourFraming): TourFraming {
  const { dwellS, travelS } = CONFIG.camera.tour;
  const segS = dwellS + travelS;
  const n = STOPS.length;
  const period = n * segS;
  // Guard a non-finite caller (an untouched page can hand us Infinity) so the
  // modulo below can never resolve to NaN and index STOPS out of bounds.
  const e = Number.isFinite(elapsedS) ? elapsedS : 0;
  const tt = ((e % period) + period) % period; // wrap, guard negatives
  const seg = Math.floor(tt / segS);
  const local = tt - seg * segS;

  const cur = STOPS[seg];
  const curC = centre(cur);

  if (local < travelS) {
    // Travelling in from the previous stop.
    const prev = STOPS[(seg - 1 + n) % n];
    const prevC = centre(prev);
    const u = smoothstep(local / travelS);
    out.x = lerp(prevC.x, curC.x, u);
    out.z = lerp(prevC.z, curC.z, u);
    out.radiusKm = lerp(prev.radiusKm, cur.radiusKm, u);
    out.elevation = lerp(prev.elevation, cur.elevation, u);
  } else {
    // Holding at the current stop.
    out.x = curC.x;
    out.z = curC.z;
    out.radiusKm = cur.radiusKm;
    out.elevation = cur.elevation;
  }
  return out;
}

// --- The Observe reel ------------------------------------------------------
// Observe mode isn't only a day-sweep: while the sun runs through a whole day
// the camera takes a slow, curated flight around the most gorgeous parts of the
// city. Each stop is either an ORBIT (a slow framed circle, dropped low and
// intimate) or a RIDE — the camera latches onto a nearby light-rail train, or a
// SeaTac jet, and travels in its wake. A ride can also be a DETAIL stop: the
// same latch, but the camera slides in tight and off to the side for a slow
// three-quarter close-up where the woodblock detail reads — the S700's wave
// livery, ink seams and lit windows; the jet's tail device and wordmark
// (CameraRig owns the framing; here it's just the `detail` flag). The reel
// LEANS INTO the rides: they're the piece at its most gorgeous (a low,
// zoomed-in chase through the print), so they carry a longer dwell (`dwellS`)
// than the orbit interludes and outnumber them. Between the rides it still
// drops the two things a static drift never shows: low over the downtown
// transit tunnel so the underground stations' light shafts read, and out along
// the Burke-Gilman where the cyclists cross the rail world. CameraRig executes
// it (finds the train, does the chase math); tour.ts just supplies the timeline.

export type ShotKind = "orbit" | "train" | "plane" | "orca";

interface ReelStop {
  kind: ShotKind;
  /** Station id: the orbit centre, or where to look for a train to ride. */
  anchor: string;
  fallback: { x: number; z: number };
  radiusKm: number;
  elevation: number;
  label: string;
  /** Hold time at this stop; falls back to `observeReel.dwellS`. Rides run
   *  longer than orbits so the reel spends most of its time riding; detail
   *  close-ups run longest so there's time to drink the woodblock in. */
  dwellS?: number;
  /** A RIDE stop (`kind` train|plane) rendered as a tight three-quarter
   *  broadside close-up instead of a wake chase — CameraRig reads this to
   *  swap the framing. Ignored on orbit stops. */
  detail?: boolean;
}

// Rides dwell this long; orbit interludes use the shorter observeReel.dwellS.
const RIDE_DWELL_S = 14;
// Detail close-ups hold longest — a slow drift down the flank of the toy.
const DETAIL_DWELL_S = 16;

const REEL: ReelStop[] = [
  // Ride the light rail out of downtown — the hero low chase through the print.
  { kind: "train", anchor: "C05", fallback: { x: -0.29, z: -0.18 }, radiusKm: 6, elevation: 0.5, label: "riding the light rail", dwellS: RIDE_DWELL_S },
  // Then slide in tight for the S700 itself: the wave livery, ink seams and lit
  // windows, read section by section. Same anchor, so the detail latches onto
  // the very train we've been riding.
  { kind: "train", anchor: "C05", fallback: { x: -0.29, z: -0.18 }, radiusKm: 6, elevation: 0.5, label: "up close: the light rail", dwellS: DETAIL_DWELL_S, detail: true },
  // Ride a train down into the downtown transit tunnel: the portal dip reads
  // as the train sinks below the translucent paper, then a low hold over the
  // underground stations (Westlake, Symphony, Pioneer Square, Chinatown) and
  // the light shafts that sink from their seals to the platforms below —
  // falls back to an orbit at the portal when no train is in the tunnel just
  // then (honesty rule: night, feed asleep).
  { kind: "train", anchor: "C03", fallback: { x: -0.35, z: -0.6 }, radiusKm: 5, elevation: 0.32, label: "diving into the underground", dwellS: RIDE_DWELL_S },
  // Ride the 2 Line out across Lake Washington — the water crossing, chased
  // low (an orbit over the lake when no train is on the bridge just then).
  { kind: "train", anchor: "E07", fallback: { x: 7.42, z: 2.0 }, radiusKm: 10.5, elevation: 0.5, label: "the Lake Washington crossing", dwellS: RIDE_DWELL_S },
  // The Burke-Gilman cyclists where the trail threads past the U-District.
  { kind: "orbit", anchor: "N07", fallback: { x: 1.35, z: -6.02 }, radiusKm: 7, elevation: 0.48, label: "the cyclists" },
  // Slide in tight on the orca pod porpoising through the Sound — a very
  // close, low hold so the sumi dorsal strokes and foam-white eyepatch fill
  // the frame. Anchor/fallback are unused: CameraRig chases the pod's live,
  // time-of-day-driven centre (`map/Orcas.tsx` `orcaPodCenterNow`) instead of
  // a fixed station, since the pod migrates around the Sound over the day.
  { kind: "orca", anchor: "__orcas__", fallback: { x: -3.4, z: -1.2 }, radiusKm: 0.34, elevation: 0.28, label: "up close: the orcas", dwellS: DETAIL_DWELL_S, detail: true },
  // Ride a jet through the SeaTac touch-and-go pattern, up over the valley.
  { kind: "plane", anchor: "C37", fallback: { x: 2.64, z: 17.9 }, radiusKm: 12, elevation: 0.62, label: "riding the jet", dwellS: RIDE_DWELL_S },
  // Then slide onto its flank: the Delta/Alaska tail device and the fuselage
  // wordmark, close enough to read the paint.
  { kind: "plane", anchor: "C37", fallback: { x: 2.64, z: 17.9 }, radiusKm: 12, elevation: 0.62, label: "up close: the jet", dwellS: DETAIL_DWELL_S, detail: true },
  // The long southern airport run under Rainier — pull back and breathe, then
  // the reel loops home to ride the rail again.
  { kind: "orbit", anchor: "C37", fallback: { x: 2.64, z: 17.9 }, radiusKm: 11, elevation: 0.74, label: "the airport run" },
];

// Per-stop segment durations (travel-in + dwell) and their cumulative starts,
// precomputed once so the variable dwell resolves without per-frame work.
const SEG_DUR = REEL.map((s) => CONFIG.camera.observeReel.travelS + (s.dwellS ?? CONFIG.camera.observeReel.dwellS));
const SEG_START = SEG_DUR.reduce<number[]>((acc, d, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + SEG_DUR[i - 1]);
  return acc;
}, []);
const REEL_PERIOD = SEG_DUR.reduce((a, d) => a + d, 0);

export interface ReelShot extends TourFraming {
  kind: ShotKind;
  seg: number; // which REEL stop we're resolving (for latching a ride target)
  label: string;
  detail: boolean; // true on a holding detail close-up (never while travelling)
}

/** The Observe reel's shot at a number of seconds in, written into `out`.
 *  While TRAVELLING between stops the shot is always an orbit that glides the
 *  centre and framing from the previous stop to the next; while HOLDING it
 *  becomes the stop's own kind (orbit, or a ride). Continuous in centre, radius
 *  and elevation so CameraRig's smoothing never sees a jump. */
export function observeShot(elapsedS: number, out: ReelShot): ReelShot {
  const { travelS } = CONFIG.camera.observeReel;
  const n = REEL.length;
  const e = Number.isFinite(elapsedS) ? elapsedS : 0;
  const tt = ((e % REEL_PERIOD) + REEL_PERIOD) % REEL_PERIOD;
  // Which stop are we in? SEG_START is monotonic, so the last one at or before
  // tt is the current segment.
  let seg = 0;
  for (let i = 0; i < n; i++) {
    if (tt >= SEG_START[i]) seg = i;
    else break;
  }
  const local = tt - SEG_START[seg];

  const cur = REEL[seg];
  const curC = centre(cur);
  out.seg = seg;
  out.label = cur.label;

  if (local < travelS) {
    // Travelling in from the previous stop — always an orbit, never a ride
    // (and never a detail close-up: the tight framing only holds once arrived).
    const prev = REEL[(seg - 1 + n) % n];
    const prevC = centre(prev);
    const u = smoothstep(local / travelS);
    out.kind = "orbit";
    out.detail = false;
    out.x = lerp(prevC.x, curC.x, u);
    out.z = lerp(prevC.z, curC.z, u);
    out.radiusKm = lerp(prev.radiusKm, cur.radiusKm, u);
    out.elevation = lerp(prev.elevation, cur.elevation, u);
  } else {
    // Holding at the stop — its own kind, and its detail framing if any.
    out.kind = cur.kind;
    out.detail = cur.detail ?? false;
    out.x = curC.x;
    out.z = curC.z;
    out.radiusKm = cur.radiusKm;
    out.elevation = cur.elevation;
  }
  return out;
}

function tourParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("tour");
}

/** False only when explicitly disabled with ?tour=off. */
export function tourEnabled(): boolean {
  return tourParam() !== "off";
}

/** True when ?tour=on pins the tour to start immediately (demos/tests). */
export function tourForced(): boolean {
  return tourParam() === "on";
}

/** The REEL stop's own kind at segment index `seg` — true throughout both the
 *  travel-in and the hold (unlike `ReelShot.kind`, which `observeShot` forces
 *  to "orbit" while travelling). CameraRig uses this to keep chasing the
 *  orca pod's live centre during the glide in, not just once arrived. */
export function reelStopKind(seg: number): ShotKind {
  return REEL[seg].kind;
}
