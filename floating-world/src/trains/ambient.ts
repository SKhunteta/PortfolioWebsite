// Ambient trains for Observe mode.
//
// Observe is a curated, cinematic pass over the line — the sun swept through a
// whole day, the camera flying a highlight reel that RIDES the trains low
// through the print and drops to eye-line vistas that follow one down the
// glowing rail. That reel needs trains to follow whenever it runs, but the live
// feed is often asleep (night, the very hours the dusk vistas play) or simply
// has nothing on the stretch a vista wants. So while Observe runs we take over
// the train set with a DETERMINISTIC ambient fleet — the same honesty stance as
// the SeaTac jets (map/Airliners.tsx) and the orca pod (map/Orcas.tsx): computed
// from the clock, no Math.random, identical every visit, and surfaced honestly
// as "simulated" on the HUD badge. The live feed is set aside and restored the
// moment Observe ends.
//
// These are ordinary TrainState objects in the same TRAINS map, so every
// renderer (glow, model, trail, ink halo, station dwell) and the camera chase
// work on them unchanged. They self-propel: each frame we push `sTarget` a fixed
// lead ahead of `sRendered` so the shared tween (trains/tween.ts advanceTrain)
// glides them at a steady nominal speed, easing y through tunnels and vEst for
// the trail exactly as it does a live train. At a terminus a train turns around
// onto the line's opposite direction (whose start point coincides), so the run
// loops without a map-crossing jump.

import { TRAINS, makeTrain, useUi, type TrainState, type Mode } from "./store";
import { LINES, LINE_BY_ID } from "../map/network";
import { PROFILE } from "../world/device";
import { CONFIG } from "../world/config";

// Ambient train ids carry this prefix so we can tell them from live trains and
// sweep exactly them out when Observe ends.
const AMBIENT_PREFIX = "obs-";
// Steady cruising speed (km/s) — the feed's nominal, ~72 km/h.
const AMBIENT_V = CONFIG.tween.vNominalKmS;
// The lead we keep `sTarget` ahead of `sRendered`, expressed as a poll gap so
// advanceTrain resolves a rate of exactly AMBIENT_V (rate = ahead / timeLeft).
const AMBIENT_POLL_GAP = 4;
// Trains per direction, per line. 2 lines × 2 directions × this — kept well
// under MAX_TRAINS (48) — spaced tightly enough that both the 1 Line and 2 Line
// always have a train near any reel anchor to ride or frame.
const PER_DIRECTION = 6;

/** True on the ambient fleet's own ids. */
export function isAmbientTrainId(id: string): boolean {
  return id.startsWith(AMBIENT_PREFIX);
}

// The live trains set aside while Observe runs, restored on stop, plus the
// honest mode to put back (Observe flips the badge to "simulated").
let stashed: TrainState[] = [];
let savedMode: Mode | null = null;
let savedFetchedAt: string | null = null;

/** Take over the train set with the deterministic ambient fleet. Called from
 *  world/observe.ts `startObserve`. The poller is gated off while Observe runs
 *  (trains/poller.ts), so nothing else touches TRAINS until we hand it back. */
export function startAmbientTrains() {
  const ui = useUi.getState();
  stashed = [...TRAINS.values()];
  savedMode = ui.mode;
  savedFetchedAt = ui.fetchedAt;
  TRAINS.clear();

  for (const line of LINES) {
    line.directions.forEach((dir, di) => {
      for (let k = 0; k < PER_DIRECTION; k++) {
        // Even spacing along the line, offset a half-slot per direction so the
        // two ways don't stack — deterministic, no Math.random (the map's rule).
        const frac = (k + 0.5 * di) / PER_DIRECTION;
        const s = frac * dir.totalKm;
        const id = `${AMBIENT_PREFIX}${line.id}-${di}-${k}`;
        const train = makeTrain(id, line.id, dir, s, PROFILE.trailSegments);
        train.vEst = AMBIENT_V; // already moving, so the trail seeds at speed
        TRAINS.set(id, train);
      }
    });
  }

  // Honest badge: the trains (like the swept sun) are simulated while Observe runs.
  useUi.getState().setMode("simulated", null);
}

/** Sweep the ambient fleet out and restore the live trains + mode. Called from
 *  world/observe.ts `stopObserve`. The poller resumes and refreshes the restored
 *  trains on its next tick. */
export function stopAmbientTrains() {
  for (const id of [...TRAINS.keys()]) {
    if (isAmbientTrainId(id)) TRAINS.delete(id);
  }
  for (const t of stashed) TRAINS.set(t.id, t);
  stashed = [];
  if (savedMode) useUi.getState().setMode(savedMode, savedFetchedAt);
  savedMode = null;
  savedFetchedAt = null;
}

/** Self-propel the ambient fleet: push each train's `sTarget` a fixed lead ahead
 *  so the shared tween glides it at AMBIENT_V, and turn it around at a terminus.
 *  Called every frame from world/observe.ts `tickObserve`, BEFORE Trains.tsx
 *  advances the tween. A no-op when the fleet isn't running. */
export function tickAmbientTrains(nowT: number) {
  for (const t of TRAINS.values()) {
    if (!isAmbientTrainId(t.id)) continue;
    if (t.sRendered >= t.dir.totalKm - 0.01) {
      // Reached the terminus: turn around onto the line's opposite direction,
      // whose start point coincides, so the loop has no map-crossing jump.
      const other = LINE_BY_ID.get(t.lineId)?.directions.find((d) => d !== t.dir);
      if (other) {
        t.dir = other;
        t.sRendered = 0;
        t.trailCount = 0; // no streak drawn across the turnaround
      }
    }
    t.lastPollT = nowT; // pretend we just polled, so timeLeft == pollGapS
    t.pollGapS = AMBIENT_POLL_GAP;
    t.sTarget = t.sRendered + AMBIENT_V * AMBIENT_POLL_GAP;
  }
}
