import { Vector3 } from "three";
import { create } from "zustand";

// The direction bus — how the Observer director *commands* a performance
// (a pounce, a grooming session) at an exact moment, so close-up shots can be
// choreographed to the frame. Cats watch `seq` from their useFrame loops; a
// monotonically increasing counter means the same cue can fire twice in a row
// and still re-trigger.
//
// The same file hosts the track-point registry: cats publish live world-space
// positions (mutated in place, never through React) that anchored Observer
// shots follow. The pose timelines the director does timing math against live
// in fsm.ts (the choreography contract).

export type PerformanceCue =
  | { kind: "pounce"; index: number }
  | { kind: "groom"; index: number }
  | { kind: "scratch"; index: number }; // beeline to the nearest post, claws in

/** Set by ObserverMode so ambient (self-directed) antics never collide with a
 *  choreographed tour. Plain mutable flag — read every frame. */
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

// Cat body registry — every cat publishes its root position each frame so
// cats can resolve against EACH OTHER (no more ghosting through a sleeping
// sister). Plain mutable slots, written in useFrame, never through React.
export interface CatBody {
  pos: Vector3;
  vel: Vector3;
  r: number; // body circle radius (already includes the cat's size)
  airborne: boolean;
}
export const catBodies: (CatBody | undefined)[] = [];

// Live world-space track points, keyed by cat (e.g. "cat0", "cat0Head").
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
// `yawFollow` rotate their offsets by this so a close-up frames the cat's
// FACE no matter where on its wander it stopped to perform.
const trackYaws = new Map<string, number>();

export function setTrackYaw(key: string, yaw: number): void {
  trackYaws.set(key, yaw);
}

export function getTrackYaw(key: string): number | undefined {
  return trackYaws.get(key);
}

// "driftCat" — a computed track point: whichever cat is tumbling fastest this
// frame. Cats report from their useFrame; a tracker component mounted after
// them publishes the winner once per frame. The position persists between
// drifty moments so the shot never snaps to the origin.
const driftBest = { speed: 0, pos: new Vector3(0, 1.6, 0) };

export function reportDrift(pos: Vector3, speed: number): void {
  if (speed > driftBest.speed) {
    driftBest.speed = speed;
    driftBest.pos.copy(pos);
  }
}

export function publishDriftCat(): void {
  setTrackPoint("driftCat", driftBest.pos);
  setTrackYaw("driftCat", 0);
  driftBest.speed = 0;
}

// Dev affordance, same pattern as __meowGravity / __meowObserver:
// __meowDirector.getState().direct({ kind: "pounce", index: 0 })
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__meowDirector = useDirection;
  (window as unknown as Record<string, unknown>).__meowTrack = {
    point: getTrackPoint,
    yaw: getTrackYaw,
    bodies: catBodies,
  };
}
