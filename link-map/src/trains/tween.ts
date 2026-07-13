// The glide. Trains move along ARC LENGTH, never straight lines between
// updates — position is s on the real shape, and the rate chases the poll
// target so velocity stays continuous across poll boundaries. A train never
// teleports; a monstrous gap (tab resume) fast-forwards instead.

import type { TrainState } from "./store";
import { CONFIG } from "../world/config";
import { railHeightAt } from "../map/grade";

const Y_LERP_PER_S = 2.0;

export function advanceTrain(t: TrainState, dt: number, nowT: number) {
  const remaining = t.sTarget - t.sRendered;

  if (remaining > CONFIG.tween.teleportKm) {
    // Way behind (hidden tab, first fix): land just short and glide in.
    t.sRendered = t.sTarget - 0.2;
    t.trailCount = 0; // no screen-crossing streak
  } else if (remaining < -CONFIG.tween.jitterIgnoreKm) {
    // Target moved backwards more than GPS noise — accept it slowly rather
    // than yanking the train into reverse.
    t.sRendered += Math.max(remaining * 0.5 * dt, -CONFIG.tween.vNominalKmS * dt);
  }

  const ahead = Math.max(0, t.sTarget - t.sRendered);
  const timeLeft = Math.max(1.5, t.pollGapS - (nowT - t.lastPollT));
  const rate = Math.min(ahead / timeLeft, CONFIG.tween.vMaxKmS);
  t.sRendered += rate * dt;

  // Smoothed speed estimate — the honest input for trail length and chase
  // framing (feed speed fields are unreliable; this is what's on screen).
  const blend = Math.min(1, dt * 1.2);
  t.vEst += (rate - t.vEst) * blend;

  // Vertical: ride the SAME eased rail-height profile the ribbon is built
  // from (railHeightAt), lifted a touch so the toy sits on top of the line.
  // The temporal lerp just smooths poll-to-poll jitter now — the ramp itself
  // is spatial, so the train follows the track up a portal instead of
  // popping to the next discrete grade height.
  const targetY = railHeightAt(t.dir, t.sRendered) + 0.06;
  t.y += (targetY - t.y) * Math.min(1, dt * Y_LERP_PER_S);
}

/** Record a trail sample if the cadence says so. */
export function sampleTrail(t: TrainState, x: number, y: number, z: number, nowT: number, everyS: number) {
  if (t.lastSampleT >= 0 && nowT - t.lastSampleT < everyS) return;
  t.lastSampleT = nowT;
  const cap = t.trail.length / 3;
  t.trailHead = (t.trailHead + 1) % cap;
  const base = t.trailHead * 3;
  t.trail[base] = x;
  t.trail[base + 1] = y;
  t.trail[base + 2] = z;
  if (t.trailCount < cap) t.trailCount++;
}
