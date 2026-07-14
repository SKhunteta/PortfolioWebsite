// The optional "observe" mode: run the print through a whole Seattle day.
//
// The piece normally keys to the real sun over Seattle, so at 2pm you get the
// bright washi, at 2am the lantern print — but only the hour you happen to
// visit. Observe lets you watch the sheet breathe through a full day-and-night
// on demand: it sweeps a synthetic clock from local midnight across 24 real
// hours (the ACTUAL sun altitude at each step, via sunPhaseAt — never a fake
// triangle wave), looping until you switch it off.
//
// It is a thin driver over the existing phase override: every frame while
// active it computes the day's phase and calls setPhaseOverride, so weather,
// water, kasumi, city lights — everything that reads sunPhase() — follows for
// free. Toggling off restores whatever override was in effect before (a
// ?phase= pin, or the live sun).
//
// The sweep does NOT run at a constant clock: it EXPANDS the golden hours —
// sunset most of all — and HURRIES through the flat midday. Real seconds across
// the day are spent in proportion to a dwell weight that peaks through the
// twilight bands and thins to a floor at noon (see buildWarp). The weight is
// built from the ACTUAL sun for the day being swept, so we only re-pace the
// same honest arc — never fake an altitude. CameraRig reads `isObserving()` to
// fly its curated reel of the city while this runs.

import { sunPhaseAt, setPhaseOverride, getPhaseOverride } from "./sun";
import { useUi } from "../trains/store";
import { REEL_PERIOD } from "../observer/tour";
import { startAmbientTrains, stopAmbientTrains, tickAmbientTrains } from "../trains/ambient";
import { CLOCK } from "./clock";

const DAY_MS = 24 * 60 * 60 * 1000;
// One full day-and-night sweeps by in this many real seconds. The sweep still
// LINGERS through sunset and hurries the flat midday (buildWarp), but its pacing
// is now the SKY's alone — the camera reel runs on its own even seconds clock
// (observer/tour.ts + CameraRig `observeClock`), no longer indexed by this
// fraction. We lock the day length to the reel's REEL_PERIOD so the two share a
// period: a given reel stop lands under roughly the same sky each loop (loose
// phase affinity), without the old phase-lock crushing the reel's pacing.
const CYCLE_S = REEL_PERIOD;

let active = false;
let elapsed = 0; // real seconds into the current sweep
let baseMidnight = 0; // ms timestamp of the day we sweep across
let savedOverride: number | null = null; // restored when observing stops
// When set (0..1 display day fraction), FREEZE the sweep at that fraction: both
// the sky and the camera reel hold there instead of running the day. For demos,
// tests and screenshots — jump straight to a stop (the dusk rail-to-Rainier
// vista is ~0.8) without waiting for the sweep to arrive. Set by ?reel= or the
// __linkMap.reelAt() handle; same override spirit as ?tour=on / ?phase=.
let reelPin: number | null = null;

function readReelParam(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("reel");
  if (raw === null) return null;
  const v = parseFloat(raw);
  return Number.isFinite(v) ? ((v % 1) + 1) % 1 : null;
}

/** Pin (or clear, with null) the reel/sweep to a fixed display day fraction. */
export function setObserveReelPin(frac: number | null) {
  reelPin = frac === null ? null : ((frac % 1) + 1) % 1;
}

// --- Day warp: dwell on sunset, hurry through the flat midday --------------
// A lookup that re-paces the sweep. warpClock[i] is the normalized clock
// fraction (0..1) at which the sweep reaches day fraction i / WARP_STEPS.
// Rebuilt per sweep from the day's real sun, so the golden hours land where
// they truly fall for the date.
const WARP_STEPS = 256;
const warpClock = new Float32Array(WARP_STEPS + 1); // 0..1, monotonic increasing

// How many real seconds the sweep should linger at a given day fraction: a
// thin floor everywhere, a strong peak through the twilight band, biased so a
// SUNSET dwells longer than the matching sunrise.
function dwellWeight(midnightMs: number, dayFrac: number): number {
  const p = sunPhaseAt(new Date(midnightMs + dayFrac * DAY_MS));
  // A hair later tells us which way the sun is moving: sinking = evening = the
  // sunset we most want to expand.
  const pNext = sunPhaseAt(new Date(midnightMs + (dayFrac + 1e-3) * DAY_MS));
  const sinking = pNext < p;
  // Twilight closeness: 1 at mid-transition (phase 0.5 — the golden moment),
  // 0 at flat night or flat day.
  const twilight = 1 - Math.abs(2 * p - 1);
  const goldenBias = sinking ? 1.6 : 1.0; // sunset lingers longer than sunrise
  // Floor keeps the sweep always moving; SMALLER in full day (p→1) than in
  // deep night (p→0), so the noon plateau is the fastest stretch — daytime
  // shrinks — while night keeps a gentle drift.
  const floor = 0.12 + 0.12 * (1 - p);
  return floor + 2.4 * twilight * twilight * goldenBias;
}

// Build warpClock as the normalized cumulative dwell weight across the day.
function buildWarp(midnightMs: number) {
  let cum = 0;
  warpClock[0] = 0;
  let prevW = dwellWeight(midnightMs, 0);
  for (let i = 1; i <= WARP_STEPS; i++) {
    const w = dwellWeight(midnightMs, i / WARP_STEPS);
    cum += 0.5 * (prevW + w); // trapezoid (constant dx folds into the normalize)
    prevW = w;
    warpClock[i] = cum;
  }
  const total = cum || 1;
  for (let i = 0; i <= WARP_STEPS; i++) warpClock[i] /= total;
}

// Invert the warp: a clock fraction (0..1) → the day fraction to show, so real
// time is spent in proportion to the dwell weight.
function warpedDayFrac(clockFrac: number): number {
  const c = ((clockFrac % 1) + 1) % 1;
  let lo = 0;
  let hi = WARP_STEPS;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (warpClock[mid] <= c) lo = mid;
    else hi = mid;
  }
  const span = warpClock[hi] - warpClock[lo] || 1;
  const t = (c - warpClock[lo]) / span;
  return (lo + t) / WARP_STEPS;
}

export function isObserving(): boolean {
  return active;
}

// The current position in the sweep, 0..1 across local midnight→midnight, or
// null when observe isn't running. Lets time-of-day consumers (the orca pod's
// foraging range) migrate through the day in step with the light during a
// sweep, instead of freezing at the real wall-clock hour.
export function observeDayFrac(): number | null {
  return active ? (elapsed / CYCLE_S) % 1 : null;
}

// The day fraction actually ON SCREEN right now (0/1 = local midnight, ~0.5 =
// solar noon) — the LINEAR sweep position run through the same warp the sun
// uses, so it tracks the visible sky rather than raw real-time. Null when
// observe isn't running. (This is the SKY's position; the camera reel runs on
// its own even seconds clock — see pinnedReelSeconds for the ?reel= pin.)
export function observeDisplayFrac(): number | null {
  if (!active) return null;
  return reelPin ?? warpedDayFrac((elapsed / CYCLE_S) % 1);
}

// The reel clock position, in SECONDS, when the sweep is frozen by ?reel= /
// reelAt() — the pin's 0..1 fraction mapped onto the reel's own loop length so a
// screenshot lands the matching stop. Null when unpinned (CameraRig then uses
// its live `observeClock`). The sky is pinned separately via observeDisplayFrac,
// so ?reel=0.8 freezes a ~dusk sky AND jumps the reel ~80% through its loop.
export function pinnedReelSeconds(): number | null {
  return reelPin === null ? null : reelPin * REEL_PERIOD;
}

export function startObserve() {
  if (active) return;
  savedOverride = getPhaseOverride();
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  baseMidnight = midnight.getTime();
  buildWarp(baseMidnight);
  elapsed = 0;
  reelPin = readReelParam();
  active = true;
  useUi.getState().setObserving(true);
  // Take over the train set with the deterministic ambient fleet (the poller is
  // gated off while we observe) so the reel always has trains to ride and frame.
  startAmbientTrains();
}

export function stopObserve() {
  if (!active) return;
  active = false;
  setPhaseOverride(savedOverride);
  useUi.getState().setObserving(false);
  // Hand the train set back to the live feed.
  stopAmbientTrains();
}

export function toggleObserve() {
  if (active) stopObserve();
  else startObserve();
}

// Called from the single frame driver (Trains.tsx) with the clamped dt, before
// sunPhase() is read AND before the trains advance for the frame.
export function tickObserve(dt: number) {
  if (!active) return;
  // Self-propel the ambient fleet before Trains.tsx advances the tween this frame.
  tickAmbientTrains(CLOCK.t);
  elapsed += dt;
  const clockFrac = (elapsed / CYCLE_S) % 1; // 0..1 of real time across a sweep
  // Warped so sunset dwells and noon flies — unless pinned to a fixed fraction
  // (?reel=), where sky and camera freeze together for a screenshot.
  const dayFrac = reelPin ?? warpedDayFrac(clockFrac);
  setPhaseOverride(sunPhaseAt(new Date(baseMidnight + dayFrac * DAY_MS)));
}
