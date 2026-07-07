import { Vector3 } from "three";
import { create } from "zustand";

// The direction bus — how the Observer director *commands* a performance
// (a glassbear roar, a leviathan breach) at an exact moment, so close-up
// shots can be choreographed to the frame. Creatures watch `seq` from their
// useFrame loops; a monotonically increasing counter means the same cue can
// fire twice in a row and still re-trigger.
//
// The same file hosts the track-point registry: creatures publish live
// world-space positions (mutated in place, never through React) that
// anchored Observer shots follow.

export type PerformanceCue =
  | { kind: "bearRoar"; index: number }
  | { kind: "leviathanBreach"; index: number }
  | { kind: "mooseDrink"; index: number }
  | { kind: "wolfHowl"; index: number };

// Performance timelines (seconds from cue). These live here — not in the
// creature files — because they are the CONTRACT between a creature and the
// Observer director: shots do timing math against them (e.g. "cue the breach
// at 3.6 s so the surface break lands exactly on the cut").
export const ROAR = {
  settle: 0.9, // walk drains out
  rearEnd: 2.1, // fully reared on hind legs
  inhaleEnd: 2.6, // head thrown back, peak inhale
  jawOpen: 2.7, // jaw snaps open
  roarEnd: 5.2, // jaw eases shut, body starts down
  total: 6.5, // back on all fours, ambling again
} as const;

export const DRINK = {
  settle: 0.8, // wading drains out
  dipEnd: 1.9, // muzzle underwater
  LIFT_AT: 4.6, // head comes up — the cascade pours off the antlers
  liftEnd: 5.6, // head held high, dripping
  total: 8.0, // back to wading
} as const;

export const HOWL = {
  settle: 0.7, // trot drains out
  muzzleUp: 1.9, // head tips back
  HOWL_AT: 2.1, // the cry starts (throat lantern flares, breath climbs)
  howlEnd: 5.2, // tapers off
  total: 6.4, // back on the move; packmates chorus in ~0.9 s apart
} as const;

export const BREACH = {
  windup: 1.7, // a real dive: tail-up sink to the windup depth, gathering speed
  BREAK_AT: 4.6, // surface up-crossing (windup + rise)
  APEX_AT: 5.75, // top of the parabola (midpoint of the two crossings), mid-roll
  REENTRY_AT: 6.9, // surface down-crossing
  TOTAL: 9.9, // back to deep cruise
} as const;

/** Set by ObserverMode so ambient (self-directed) performances never collide
 *  with a choreographed tour. Plain mutable flag — read every frame. */
export const directionFlags = { observing: false };

interface DirectionState {
  seq: number;
  cue: PerformanceCue | null;
  direct: (cue: PerformanceCue) => void;
}

export const useDirection = create<DirectionState>((set) => ({
  seq: 0,
  cue: null,
  direct: (cue) => set((s) => ({ seq: s.seq + 1, cue })),
}));

// Live world-space track points, keyed by creature (e.g. "bear0Head", "lev0").
const trackPoints = new Map<string, Vector3>();

/** Publish a live position. Copies into a stable Vector3 — no allocation churn. */
export function setTrackPoint(key: string, p: Vector3): void {
  const existing = trackPoints.get(key);
  if (existing) existing.copy(p);
  else trackPoints.set(key, p.clone());
}

export function getTrackPoint(key: string): Vector3 | undefined {
  return trackPoints.get(key);
}

// Live headings (radians about +Y), keyed like the track points. Shots with
// `yawFollow` rotate their offsets by this so a close-up frames the creature's
// FACE no matter where on its wander loop it stopped to perform.
const trackYaws = new Map<string, number>();

export function setTrackYaw(key: string, yaw: number): void {
  trackYaws.set(key, yaw);
}

export function getTrackYaw(key: string): number | undefined {
  return trackYaws.get(key);
}

// Dev affordance, same pattern as __ketuClock / __ketuObserver:
// __ketuDirector.getState().direct({ kind: "bearRoar", index: 0 })
// __ketuTracks.get("wolf0") — inspect a live track point from the console.
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__ketuDirector = useDirection;
  (window as unknown as Record<string, unknown>).__ketuTracks = {
    get: getTrackPoint,
    yaw: getTrackYaw,
  };
}
