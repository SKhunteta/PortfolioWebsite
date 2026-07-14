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

import { sunPhaseAt, setPhaseOverride, getPhaseOverride } from "./sun";
import { useUi } from "../trains/store";

const DAY_MS = 24 * 60 * 60 * 1000;
// One full day-and-night sweeps by in this many real seconds — slow enough to
// read dawn and dusk, quick enough that a visitor sees the whole arc.
const CYCLE_S = 60;

let active = false;
let elapsed = 0; // real seconds into the current sweep
let baseMidnight = 0; // ms timestamp of the day we sweep across
let savedOverride: number | null = null; // restored when observing stops

export function isObserving(): boolean {
  return active;
}

export function startObserve() {
  if (active) return;
  savedOverride = getPhaseOverride();
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  baseMidnight = midnight.getTime();
  elapsed = 0;
  active = true;
  useUi.getState().setObserving(true);
}

export function stopObserve() {
  if (!active) return;
  active = false;
  setPhaseOverride(savedOverride);
  useUi.getState().setObserving(false);
}

export function toggleObserve() {
  if (active) stopObserve();
  else startObserve();
}

// Called from the single frame driver (Trains.tsx) with the clamped dt, before
// sunPhase() is read for the frame.
export function tickObserve(dt: number) {
  if (!active) return;
  elapsed += dt;
  const dayFrac = (elapsed / CYCLE_S) % 1; // 0..1 across midnight→midnight
  setPhaseOverride(sunPhaseAt(new Date(baseMidnight + dayFrac * DAY_MS)));
}
