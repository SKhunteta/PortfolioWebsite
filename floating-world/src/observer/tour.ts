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
// Observe mode isn't only a day-sweep: it's a highlight reel of the most epic,
// scenic parts of Sound & Rail, choreographed to the day the sweep is running.
// The reel is PHASE-LOCKED to the sun: `observeShot` is sampled by the DISPLAYED
// day fraction (`world/observe.ts` `observeDisplayFrac`), not a free clock, so a
// stop authored in the dusk band ALWAYS plays under a dusk sky — and because the
// sweep lingers through twilight, the dusk stops automatically get a long,
// glowing hold. Stops walk the day in order (`atFrac`, ascending, wrapping past
// midnight); within each stop's slice the first `TRAVEL_FRAC` glides in from the
// previous framing, the rest holds.
//
// Each stop is an ORBIT (a slow framed circle), a RIDE (latch a nearby train or
// SeaTac jet and travel in its wake — optionally a tight DETAIL broadside, or
// the grade-aware tunnel DIVE), or the reel's signature move, a VISTA: the
// camera drops to an eye-line beside the rail and looks ALONG the glowing ribbon
// so it recedes to a vanishing point under the horizon — the reference-photo
// shot. A vista rides a latched train down the rail when one's near, or holds a
// still shot of the empty glowing rail at its anchor otherwise (the ribbon is
// the subject either way, so it never needs a fallback to an aerial orbit).
// CameraRig executes all of it (finds the train, does the trackside/chase math);
// tour.ts just supplies the timeline.

export type ShotKind = "orbit" | "train" | "plane" | "orca";

interface ReelStop {
  kind: ShotKind;
  /** Where on the day this stop sits: 0/1 = local midnight, ~0.5 = solar noon.
   *  Must be ascending across REEL (the sampler walks them in order, wrapping
   *  past midnight). This is what phase-locks a stop to its sky. */
  atFrac: number;
  /** Station id: the orbit centre, the rail to ride/frame, or where to look for
   *  a train. `__orcas__` is the live pod (CameraRig chases its own centre). */
  anchor: string;
  fallback: { x: number; z: number };
  /** Framing for ORBIT stops, and for a vista's travel-in glide + no-rail
   *  fallback: keep these low so the glide down to an eye-line vista is gentle. */
  radiusKm: number;
  elevation: number;
  label: string;
  /** A RIDE stop (`kind` train|plane) rendered as a tight three-quarter
   *  broadside close-up instead of a wake chase. Ignored on orbit stops. */
  detail?: boolean;
  /** A train RIDE stop that latches a genuinely random live train instead of
   *  the nearest to `anchor`. Ignored on plane/orbit stops. */
  random?: boolean;
  /** A train RIDE stop into the downtown transit tunnel: CameraRig swaps the
   *  wake chase for the grade-aware lift (`frameTunnelDive`). */
  dive?: boolean;
  /** A train stop rendered as a low, at-grade VISTA (`frameTrackside`): the
   *  camera sits at an eye-line beside the rail and looks along the glowing
   *  ribbon toward the horizon. Rides a latched train down the rail if one's
   *  near, else a still shot of the empty rail at the anchor. */
  vista?: boolean;
  /** Which way down the rail a vista looks: +1 = travel direction, -1 = back
   *  down the line. Lets a vista face the scenic horizon (e.g. Rainier) rather
   *  than wherever the rail's arc-length happens to increase. Default +1. */
  lookSign?: number;
}

// Fraction of each stop's day-slice spent gliding in from the previous framing
// before it holds. Measured in day-fraction, so the warp makes glides slow
// through dusk and quick through the flat midday — the same breathing the sky
// does. Kept modest so most of every slice is the shot itself.
const TRAVEL_FRAC = 0.32;

// A day in the life of the line, choreographed to the light. Stops ascend by
// `atFrac`; the last wraps back through midnight to the first. Scenic rides and
// close-ups sit in the slow dawn/dusk/night bands (where the warp hands them the
// most real seconds); brisk interludes fill the fast midday plateau. The two
// hero at-grade VISTAS land at dusk, when the rail glows like the photo.
const REEL: ReelStop[] = [
  // Midnight: a low turn over the lantern city — glowing rail filaments, the
  // Needle beacon, gold-thread water.
  { kind: "orbit", atFrac: 0.0, anchor: "C03", fallback: { x: -0.35, z: -0.6 }, radiusKm: 4.5, elevation: 0.34, label: "the lantern city" },
  // Dawn: ride the light rail out of downtown — the hero low chase.
  { kind: "train", atFrac: 0.24, anchor: "C05", fallback: { x: -0.29, z: -0.18 }, radiusKm: 6, elevation: 0.5, label: "riding the light rail" },
  // Then slide in tight on the S700 itself — wave livery, ink seams, lit
  // windows — latched onto the very train we've been riding.
  { kind: "train", atFrac: 0.31, anchor: "C05", fallback: { x: -0.29, z: -0.18 }, radiusKm: 6, elevation: 0.5, label: "up close: the light rail", detail: true },
  // Morning: ride a train down into the downtown transit tunnel — the portal
  // dip under the translucent paper, past the underground light shafts (falls
  // back to an orbit at the portal when no train's in the tunnel just then).
  { kind: "train", atFrac: 0.38, anchor: "C03", fallback: { x: -0.35, z: -0.6 }, radiusKm: 5, elevation: 0.32, label: "diving into the underground", dive: true },
  // Late morning: a low VISTA skimming the 2 Line's Lake Washington crossing —
  // the glowing ribbon receding across the seigaiha water on the I-90 span.
  { kind: "train", atFrac: 0.46, anchor: "E07", fallback: { x: 7.42, z: 2.0 }, radiusKm: 2.5, elevation: 0.18, label: "the Lake Washington crossing", vista: true },
  // Midday: the Burke-Gilman cyclists where the trail threads past the
  // U-District — Seattle wouldn't be Seattle without them. Dropped low from
  // the old aerial orbit into a near-grade pass.
  { kind: "orbit", atFrac: 0.56, anchor: "N07", fallback: { x: 1.35, z: -6.02 }, radiusKm: 2.2, elevation: 0.2, label: "the cyclists" },
  // A brief, brisk airport-run pull-back under Rainier through the fast midday.
  { kind: "orbit", atFrac: 0.63, anchor: "C37", fallback: { x: 2.64, z: 17.9 }, radiusKm: 11, elevation: 0.74, label: "the airport run" },
  // Afternoon: slide in tight on the orca pod porpoising through the Sound —
  // sumi dorsal strokes, foam-white eyepatch. Anchor is unused; CameraRig
  // chases the pod's live, time-of-day-driven centre.
  { kind: "orca", atFrac: 0.7, anchor: "__orcas__", fallback: { x: -3.4, z: -1.2 }, radiusKm: 0.34, elevation: 0.28, label: "up close: the orcas", detail: true },
  // ★ Dusk: the reference-photo shot — a low VISTA down the Rainier Valley
  // at-grade run, looking along the glowing rail toward the mountain on the
  // horizon. The sweep's longest, most golden hold.
  { kind: "train", atFrac: 0.8, anchor: "C27", fallback: { x: 1.86, z: 8.2 }, radiusKm: 2.5, elevation: 0.16, label: "the rail to Rainier", vista: true, lookSign: -1 },
  // Dusk into night: a second low VISTA out of the SODO stadium district
  // looking back at the downtown skyline over the glowing rail, then the reel
  // loops home to the lantern city.
  { kind: "train", atFrac: 0.9, anchor: "C13", fallback: { x: 1.1, z: 1.7 }, radiusKm: 2.5, elevation: 0.18, label: "downtown at dusk", vista: true },
];

// Slice starts around the day circle (== each stop's atFrac); the last slice
// wraps past midnight to the first. Precomputed so sampling does no allocation.
const SEG_START = REEL.map((s) => s.atFrac);

export interface ReelShot extends TourFraming {
  kind: ShotKind;
  seg: number; // which REEL stop we're resolving (for latching a ride target)
  label: string;
  anchor: string; // the stop's anchor station id (a vista resolves its rail from it)
  detail: boolean; // true on a holding detail close-up (never while travelling)
  random: boolean; // true on a holding train stop that should ride ANY live train
  dive: boolean; // true on the holding tunnel ride (never while travelling)
  vista: boolean; // true on a holding at-grade vista (never while travelling)
  lookSign: number; // which way a vista looks down the rail (+1 / -1)
}

/** The Observe reel's shot at a DAY FRACTION (0..1, 0 = local midnight), written
 *  into `out`. While TRAVELLING between stops the shot is always an orbit that
 *  glides the centre and framing from the previous stop to the next; while
 *  HOLDING it becomes the stop's own kind (orbit, ride, dive or vista).
 *  Continuous in centre, radius and elevation so CameraRig's smoothing never
 *  sees a jump. Phase-locked: pass `observeDisplayFrac()` so a stop's sky is
 *  always the one it was authored for. */
export function observeShot(dayFrac: number, out: ReelShot): ReelShot {
  const n = REEL.length;
  const f = Number.isFinite(dayFrac) ? ((dayFrac % 1) + 1) % 1 : 0;
  // Which slice are we in? SEG_START ascends; the last stop at or before f owns
  // it, or — if f is before the first stop — the last stop, whose slice wraps
  // through midnight.
  let seg = n - 1;
  for (let i = 0; i < n; i++) {
    if (f >= SEG_START[i]) seg = i;
    else break;
  }
  const start = SEG_START[seg];
  const nextStart = SEG_START[(seg + 1) % n];
  let span = nextStart - start;
  if (span <= 0) span += 1; // the wrap slice past midnight
  let local = f - start;
  if (local < 0) local += 1; // f is in the wrap slice, before the first stop
  const travel = span * TRAVEL_FRAC;

  const cur = REEL[seg];
  const curC = centre(cur);
  out.seg = seg;
  out.label = cur.label;
  out.anchor = cur.anchor;

  if (local < travel && travel > 0) {
    // Travelling in from the previous stop — always an orbit, never a ride,
    // detail, dive or vista (the tight/low framings only hold once arrived).
    const prev = REEL[(seg - 1 + n) % n];
    const prevC = centre(prev);
    const u = smoothstep(local / travel);
    out.kind = "orbit";
    out.detail = false;
    out.random = false;
    out.dive = false;
    out.vista = false;
    out.lookSign = 1;
    out.x = lerp(prevC.x, curC.x, u);
    out.z = lerp(prevC.z, curC.z, u);
    out.radiusKm = lerp(prev.radiusKm, cur.radiusKm, u);
    out.elevation = lerp(prev.elevation, cur.elevation, u);
  } else {
    // Holding at the stop — its own kind, and its detail/dive/vista framing.
    out.kind = cur.kind;
    out.detail = cur.detail ?? false;
    out.random = cur.random ?? false;
    out.dive = cur.dive ?? false;
    out.vista = cur.vista ?? false;
    out.lookSign = cur.lookSign ?? 1;
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
