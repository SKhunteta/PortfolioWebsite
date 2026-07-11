import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { create } from "zustand";
import { ROOM } from "../world/config";
import { REDUCED_MOTION } from "../world/device";
import { CREW_INDEX_BASE } from "../station/crew";
import { useGravity } from "../world/GravityDial";
import {
  directionFlags,
  getTrackPoint,
  getTrackYaw,
  useDirection,
  type PerformanceCue,
} from "../cats/direction";
import { dofChannel } from "../fx/PostFX";

// Observer Mode — press the button, sit back, and the sanctuary reveals
// itself. A cinematic director walks a loop of authored shots. Shots support:
//   • zoom      — fovFrom/fovTo lerped across the shot (restored on exit)
//   • anchor    — from/to/look become OFFSETS from a damped live track point,
//                 so a shot can ride a cat wherever it happens to be
//   • cue       — fire a performance (pounce, groom) at an exact offset into
//                 the shot; timelines in cats/fsm.ts make it frame-accurate
//   • cutIn/Out — suppress the fade at a boundary for a hard cut mid-action
//   • shake     — two-frequency handheld sway for close-ups
//   • dof       — drive the PostFX depth-of-field focus at a track point
// Gravity is driven ONLY through the ONE GravityDial via setG() — the same
// public API as the scrub slider. Exiting restores camera position,
// orientation, FOV, and dial exactly.

interface Shot {
  caption: string;
  sub: string;
  from: Vector3;
  to: Vector3;
  look: Vector3;
  lookDrift: Vector3; // the look target slides too, for parallax
  duration: number; // seconds
  gravity: number; // target dial value for this shot
  /** How fast the dial glides toward `gravity` (default snappy). A small rate
   *  turns the shot into a visible spin-down — the room letting go on camera. */
  gravityRate?: number;
  fovFrom?: number;
  fovTo?: number;
  /** Track-point key; from/to become offsets from the (damped) live anchor. */
  anchor?: string;
  /** Rotate the offsets by the anchor's (damped) heading — offsets become
   *  cat-local (+Z ahead of its face), so a close-up frames the face. */
  yawFollow?: boolean;
  /** Separate live aim point (damped faster — a camera operator chasing). */
  lookAnchor?: string;
  /** Handheld micro-shake amplitude in meters. */
  shake?: number;
  /** Depth-of-field hint for the PostFX composer. */
  dof?: { key: string; range?: number; bokeh?: number };
  /** Fire a performance cue once, `at` seconds into the shot. */
  cue?: { at: number; cue: PerformanceCue };
  cutIn?: boolean;
  cutOut?: boolean;
}

/** Playback rates the tour can run at — the speed button cycles through these. */
export const OBSERVER_SPEEDS = [1, 2, 4] as const;

interface ObserverState {
  active: boolean;
  caption: string;
  sub: string;
  fade: number; // 0 = clear, 1 = black — rendered by a DOM overlay
  speed: number;
  requestShot: number | null;
  start: () => void;
  stop: () => void;
  jumpTo: (index: number) => void;
  setSpeed: (speed: number) => void;
  cycleSpeed: () => void;
}

export const useObserver = create<ObserverState>((set, get) => ({
  active: false,
  caption: "",
  sub: "",
  fade: 0,
  speed: 1,
  requestShot: null,
  start: () => set({ active: true, fade: 1 }),
  stop: () => set({ active: false, fade: 0, caption: "", sub: "" }),
  jumpTo: (index) => set({ active: true, requestShot: index }),
  setSpeed: (speed) => set({ speed }),
  cycleSpeed: () => {
    const i = OBSERVER_SPEEDS.indexOf(get().speed as (typeof OBSERVER_SPEEDS)[number]);
    set({ speed: OBSERVER_SPEEDS[(i + 1) % OBSERVER_SPEEDS.length] });
  },
}));

// Dev affordance, same pattern as __meowGravity: jump the tour from the
// console, e.g. __meowObserver.getState().jumpTo(3).
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__meowObserver = useObserver;
}

const FADE_TIME = 1.1;
const BASE_FOV = 55;
const UP = new Vector3(0, 1, 0);

function buildShots(): Shot[] {
  return [
    {
      caption: "MEOW-9",
      sub: "Orbital sanctuary, spin at full",
      from: new Vector3(-5.6, 3.1, 4.1),
      to: new Vector3(-3.2, 2.2, 3.4),
      look: new Vector3(2.5, 0.7, -2),
      lookDrift: new Vector3(-1.5, 0, 0),
      duration: 14,
      gravity: 1,
    },
    {
      // Close on the hero cat; the groom is commanded at 5 s so the head-dip
      // lands while the push-in is tightest.
      caption: "The Residents",
      sub: "Perfectly at rest",
      anchor: "cat0",
      yawFollow: true,
      lookAnchor: "cat0Head",
      from: new Vector3(1.5, 0.9, 1.9),
      to: new Vector3(0.9, 0.5, 1.15),
      look: new Vector3(0, 0.05, 0),
      lookDrift: new Vector3(0, 0, 0),
      fovFrom: BASE_FOV,
      fovTo: 40,
      dof: { key: "cat0Head", range: 1.6, bokeh: 4 },
      duration: 12,
      gravity: 1,
      cue: { at: 5, cue: { kind: "groom", index: 0 } },
    },
    {
      // The hero girl trots to the sisal post, rises on her hind legs, and
      // gets her claws in — the camera rides her the whole way there.
      caption: "The Post",
      sub: "Claws in, worries out",
      anchor: "cat0",
      yawFollow: true,
      from: new Vector3(1.05, 0.95, 1.75),
      to: new Vector3(0.7, 0.5, 1.1),
      look: new Vector3(0, 0.25, 0),
      lookDrift: new Vector3(0, 0.05, 0.1),
      fovFrom: 50,
      fovTo: 42,
      dof: { key: "cat0Head", range: 1.8, bokeh: 3.5 },
      duration: 14,
      gravity: 1,
      cue: { at: 0.4, cue: { kind: "scratch", index: 0 } },
    },
    {
      // Commander Bast is cued to the conn; the camera trails her across the
      // deck OVER THE SHOULDER (offsets sit behind her in cat-local space —
      // a face-front offset would end inside the console when she arrives)
      // and settles looking past her at the teal command board.
      caption: "The Watch",
      sub: "Cmdr. Bast has the conn",
      anchor: "cmdCat",
      yawFollow: true,
      from: new Vector3(0.55, 0.95, -1.7),
      to: new Vector3(0.35, 0.6, -1.05),
      look: new Vector3(0, 0.15, 0.6),
      lookDrift: new Vector3(0, 0.05, 0),
      fovFrom: 50,
      fovTo: 42,
      dof: { key: "cmdCat", range: 1.8, bokeh: 3.5 },
      duration: 14,
      gravity: 1,
      cue: { at: 0.4, cue: { kind: "duty", index: CREW_INDEX_BASE } },
    },
    {
      // The whole shot is the room letting go: a slow glide to zero while the
      // camera holds the corner wide — and the aim stays on the hero cat, so
      // you watch HER lift away from the post as the deck gives up on her.
      caption: "Spin-down",
      sub: "The dial goes to zero",
      lookAnchor: "cat0",
      from: new Vector3(5.9, 1.5, 4.1),
      to: new Vector3(5.3, 2.5, 3.6),
      look: new Vector3(0, 0.3, 0),
      lookDrift: new Vector3(0, 0.45, 0),
      duration: 20,
      gravity: 0,
      gravityRate: 0.14,
    },
    {
      caption: "The Drift",
      sub: "Nine lives, zero g",
      anchor: "driftCat",
      from: new Vector3(2.1, 0.7, 2.5),
      to: new Vector3(1.3, 0.1, 1.5),
      look: new Vector3(0, 0, 0),
      lookDrift: new Vector3(0, 0.1, 0),
      fovFrom: BASE_FOV,
      fovTo: 44,
      shake: 0.035,
      dof: { key: "driftCat", range: 2.2, bokeh: 3.2 },
      duration: 12,
      gravity: 0,
    },
    {
      // Cue timing: the pounce is commanded at 2 s; the leap leaves the deck
      // at 2 + POUNCE.leap = 3.35 s, and the hard cut at 4 s lands mid-arc.
      caption: "Contact",
      sub: "Push off. Aim. Commit.",
      anchor: "cat0",
      yawFollow: true,
      from: new Vector3(1.7, 0.55, 2.1),
      to: new Vector3(1.1, 0.35, 1.3),
      look: new Vector3(0, 0.15, 0.3),
      lookDrift: new Vector3(0, 0.1, 0.3),
      fovFrom: 48,
      fovTo: 40,
      shake: 0.03,
      duration: 8,
      gravity: 0.15,
      cutOut: true,
      cue: { at: 2, cue: { kind: "pounce", index: 0 } },
    },
    {
      // Finale: a slow push toward the porthole and the nebula that doesn't
      // care; the loop then fades from free-fall back into full spin.
      caption: "The Window",
      sub: "The nebula doesn't care",
      from: new Vector3(0, 1.7, 3.9),
      to: new Vector3(0, 1.9, 0.4),
      look: new Vector3(0, 2.0, -6),
      lookDrift: new Vector3(0.6, 0.2, 0),
      // Wide enough that the drifting cats cross the frame on the push-in —
      // silhouettes against the nebula, not an empty room.
      fovFrom: 62,
      fovTo: 52,
      duration: 15,
      gravity: 0,
      cutIn: true,
    },
  ];
}

const easeInOut = (t: number) => t * t * (3 - 2 * t);

export function ObserverMode() {
  const { camera } = useThree();
  const shots = useMemo(buildShots, []);

  const state = useRef({
    wasActive: false,
    shotIndex: 0,
    shotTime: 0,
    cueFired: false,
    savedPos: new Vector3(),
    savedQuat: new Quaternion(),
    savedFov: BASE_FOV,
    savedG: 1,
    savedRunning: true,
    tourG: 1,
    anchorPos: new Vector3(),
    lookAnchorPos: new Vector3(),
    anchorYaw: 0,
  });

  const scratch = useRef({
    look: new Vector3(),
    pos: new Vector3(),
    right: new Vector3(),
    up: new Vector3(),
    shake: new Vector3(),
  });

  /** Seed the damped anchors exactly at shot start — no swoop-in. */
  const seedAnchors = (shot: Shot) => {
    const s = state.current;
    const a = shot.anchor ? getTrackPoint(shot.anchor) : undefined;
    if (a) s.anchorPos.copy(a);
    else s.anchorPos.set(0, 0, 0);
    const la = shot.lookAnchor ? getTrackPoint(shot.lookAnchor) : undefined;
    if (la) s.lookAnchorPos.copy(la);
    else s.lookAnchorPos.copy(s.anchorPos);
    s.anchorYaw = (shot.anchor && getTrackYaw(shot.anchor)) || 0;
  };

  useFrame((_, rawDt) => {
    // Clamp against frame hitches first, then scale by the tour's playback
    // rate so shots, cues, dial glide and fades fast-forward together.
    const dt = Math.min(rawDt, 0.1) * useObserver.getState().speed;
    const s = state.current;
    const sc = scratch.current;
    const active = useObserver.getState().active;
    const dial = useGravity.getState();
    const cam = camera as PerspectiveCamera;

    // --- Enter: save the player's camera + dial so exit is seamless. --------
    if (active && !s.wasActive) {
      s.wasActive = true;
      s.shotIndex = 0;
      s.shotTime = 0;
      s.cueFired = false;
      s.savedPos.copy(cam.position);
      s.savedQuat.copy(cam.quaternion);
      s.savedFov = cam.fov;
      s.savedG = dial.g;
      s.savedRunning = dial.running;
      s.tourG = dial.g;
      dial.setRunning(false);
      directionFlags.observing = true;
      seedAnchors(shots[0]);
    }
    if (!active && s.wasActive) {
      s.wasActive = false;
      cam.position.copy(s.savedPos);
      cam.quaternion.copy(s.savedQuat);
      cam.fov = s.savedFov;
      cam.updateProjectionMatrix();
      dial.setG(s.savedG);
      dial.setRunning(s.savedRunning);
      directionFlags.observing = false;
      dofChannel.enabled = false;
      return;
    }
    if (!active) return;

    // Honor a jump request (dev console / deep links): hard-cut to the shot,
    // gravity snapped so there's no cross-shot glide.
    const requested = useObserver.getState().requestShot;
    if (requested !== null) {
      s.shotIndex = ((requested % shots.length) + shots.length) % shots.length;
      s.shotTime = 0.01;
      s.cueFired = false;
      s.tourG = shots[s.shotIndex].gravity;
      seedAnchors(shots[s.shotIndex]);
      useObserver.setState({ requestShot: null });
    }

    const shot = shots[s.shotIndex];
    s.shotTime += dt;
    if (s.shotTime >= shot.duration) {
      s.shotIndex = (s.shotIndex + 1) % shots.length;
      s.shotTime = 0;
      s.cueFired = false;
      seedAnchors(shots[s.shotIndex]);
    }
    const current = shots[s.shotIndex];
    const t = s.shotTime / current.duration;

    // Performance cue: fired exactly once as shotTime crosses cue.at.
    if (current.cue && !s.cueFired && s.shotTime >= current.cue.at) {
      s.cueFired = true;
      useDirection.getState().direct(current.cue.cue);
    }

    // Damped live anchors (the aim chases faster than the ride, like an
    // operator tracking a subject).
    if (current.anchor) {
      const a = getTrackPoint(current.anchor);
      if (a) s.anchorPos.lerp(a, 1 - Math.exp(-2.5 * dt));
      if (current.yawFollow) {
        const yaw = getTrackYaw(current.anchor);
        if (yaw !== undefined) {
          const dy = Math.atan2(Math.sin(yaw - s.anchorYaw), Math.cos(yaw - s.anchorYaw));
          s.anchorYaw += dy * (1 - Math.exp(-2.5 * dt));
        }
      }
    }
    if (current.lookAnchor) {
      const la = getTrackPoint(current.lookAnchor);
      if (la) s.lookAnchorPos.lerp(la, 1 - Math.exp(-4 * dt));
    }

    // Camera: eased dolly (absolute, or offset from the anchor — rotated into
    // the cat's frame when yawFollow) with a drifting look target.
    const e = easeInOut(t);
    const yawRot = current.anchor && current.yawFollow ? s.anchorYaw : 0;
    sc.pos.lerpVectors(current.from, current.to, e);
    if (yawRot) sc.pos.applyAxisAngle(UP, yawRot);
    if (current.anchor) sc.pos.add(s.anchorPos);
    sc.look.copy(current.look).addScaledVector(current.lookDrift, e);
    if (yawRot) sc.look.applyAxisAngle(UP, yawRot);
    if (current.lookAnchor) sc.look.add(s.lookAnchorPos);
    else if (current.anchor) sc.look.add(s.anchorPos);

    // Handheld micro-shake: two incommensurate frequencies per axis, ramped
    // in over the first second so cuts don't pop. Stilled for visitors who
    // prefer reduced motion — the tour itself is user-initiated, the wobble
    // isn't.
    if (current.shake && !REDUCED_MOTION) {
      const stime = s.shotTime;
      const amp = current.shake * Math.min(1, stime);
      const n1 = Math.sin(stime * 1.7) + 0.5 * Math.sin(stime * 3.9);
      const n2 = Math.cos(stime * 2.3) + 0.5 * Math.sin(stime * 5.1);
      sc.right.setFromMatrixColumn(cam.matrix, 0);
      sc.up.setFromMatrixColumn(cam.matrix, 1);
      sc.shake.copy(sc.right).multiplyScalar(n1 * amp).addScaledVector(sc.up, n2 * amp);
      sc.pos.add(sc.shake);
      sc.look.addScaledVector(sc.shake, 0.4);
    }

    // The camera respects the hull too: anchored shots ride cats wherever
    // they wander, and a cat idling by a wall must not push the lens inside
    // the panels (which reads as a black frame).
    const CAM_M = 0.35;
    sc.pos.x = MathUtils.clamp(sc.pos.x, -(ROOM.w / 2 - CAM_M), ROOM.w / 2 - CAM_M);
    sc.pos.y = MathUtils.clamp(sc.pos.y, 0.12, ROOM.h - CAM_M);
    sc.pos.z = MathUtils.clamp(sc.pos.z, -(ROOM.d / 2 - CAM_M), ROOM.d / 2 - CAM_M);

    cam.position.copy(sc.pos);
    cam.lookAt(sc.look);

    // Cinematic zoom.
    const fov = MathUtils.lerp(current.fovFrom ?? BASE_FOV, current.fovTo ?? BASE_FOV, e);
    if (Math.abs(cam.fov - fov) > 1e-3) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    // Depth of field: focus rides a track point when the shot asks for it.
    if (current.dof) {
      const fp = getTrackPoint(current.dof.key);
      if (fp) dofChannel.point.copy(fp);
      dofChannel.range = current.dof.range ?? 4;
      dofChannel.bokeh = current.dof.bokeh ?? 3.5;
      dofChannel.enabled = true;
    } else {
      dofChannel.enabled = false;
    }

    // Gravity: glide the ONE dial toward the shot's target (same public API
    // as the scrub slider). Reads as the station spinning down on camera.
    s.tourG += (current.gravity - s.tourG) * Math.min(1, dt * (current.gravityRate ?? 1.4));
    dial.setG(s.tourG);

    // Fade to black at shot boundaries (suppressed across hard cuts);
    // caption follows the current shot.
    const untilEnd = current.duration - s.shotTime;
    const fadeIn = current.cutIn ? 0 : Math.max(0, 1 - s.shotTime / FADE_TIME);
    const fadeOut = current.cutOut ? 0 : Math.max(0, 1 - untilEnd / FADE_TIME);
    const fade = Math.max(fadeIn, fadeOut);
    const store = useObserver.getState();
    if (store.caption !== current.caption || store.sub !== current.sub || Math.abs(store.fade - fade) > 0.01) {
      useObserver.setState({ caption: current.caption, sub: current.sub, fade });
    }
  });

  return null;
}
