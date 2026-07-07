import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { create } from "zustand";
import { sampleHeight } from "../terrain/heightfield";
import { POI } from "../world/locations";
import { useWorldClock } from "../world/WorldClock";
import {
  directionFlags,
  getTrackPoint,
  getTrackYaw,
  useDirection,
  type PerformanceCue,
} from "../life/direction";
import { dofChannel } from "../fx/PostFX";

// Observer Mode — press the button, sit back, and the world reveals itself.
// A cinematic director walks a loop of authored shots. Beyond the original
// dolly + caption + season grammar, shots can now:
//   • zoom      — fovFrom/fovTo lerped across the shot (restored on exit)
//   • anchor    — from/to/look become OFFSETS from a damped live track point,
//                 so a shot can ride a moving creature wherever it happens to be
//   • cue       — fire a performance (bear roar, leviathan breach) at an exact
//                 offset into the shot; timelines in direction.ts make the
//                 choreography frame-accurate
//   • cutIn/Out — suppress the fade at a boundary for a hard cut mid-action
//   • shake     — two-frequency handheld sway for close-ups
//   • dof       — drive the PostFX depth-of-field focus at a track point
// The season is still driven ONLY through the ONE WorldClock via setPhase().
// Exiting restores camera position, orientation, FOV, and clock exactly.

interface Shot {
  caption: string;
  sub: string;
  from: Vector3;
  to: Vector3;
  look: Vector3;
  lookDrift: Vector3; // the look target slides too, for parallax
  duration: number; // seconds
  phase: number; // target season phase for this shot
  /** How fast the season glides toward `phase` (default snappy). A small rate
   *  turns the shot into a visible timelapse — used for the Dark-falls finale. */
  phaseRate?: number;
  /** Cinematic zoom: FOV lerps across the shot (default 55 → 55). */
  fovFrom?: number;
  fovTo?: number;
  /** Track-point key; from/to become offsets from the (damped) live anchor. */
  anchor?: string;
  /** Rotate the offsets by the anchor's (damped) heading — offsets become
   *  creature-local (+Z ahead of its face, +X to its right), so a close-up
   *  frames the face no matter where on its loop the creature stopped. */
  yawFollow?: boolean;
  /** Separate live aim point (damped faster — a camera operator chasing). */
  lookAnchor?: string;
  /** Handheld micro-shake amplitude in meters. */
  shake?: number;
  /** Depth-of-field hint for the PostFX composer. */
  dof?: { key: string; range?: number; bokeh?: number };
  /** Fire a performance cue once, `at` seconds into the shot. */
  cue?: { at: number; cue: PerformanceCue };
  /** Hard cut (no fade) into / out of this shot. */
  cutIn?: boolean;
  cutOut?: boolean;
}

interface ObserverState {
  active: boolean;
  caption: string;
  sub: string;
  fade: number; // 0 = clear, 1 = black — rendered by a DOM overlay
  /** One-frame request consumed by the director: jump straight to a shot. */
  requestShot: number | null;
  start: () => void;
  stop: () => void;
  jumpTo: (index: number) => void;
}

export const useObserver = create<ObserverState>((set) => ({
  active: false,
  caption: "",
  sub: "",
  fade: 0,
  requestShot: null,
  start: () => set({ active: true, fade: 1 }),
  stop: () => set({ active: false, fade: 0, caption: "", sub: "" }),
  jumpTo: (index) => set({ active: true, requestShot: index }),
}));

// Dev affordance, same pattern as __ketuClock: jump the tour from the console,
// e.g. __ketuObserver.getState().jumpTo(3).
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__ketuObserver = useObserver;
}

const FADE_TIME = 1.1;
const BASE_FOV = 55;
const UP = new Vector3(0, 1, 0);

/** Shortest signed distance between two phases on the [0,1) ring. */
function phaseDelta(from: number, to: number): number {
  let d = (to - from) % 1;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return d;
}

function buildShots(): Shot[] {
  // Fall B drops into a broad open channel — the one you can shoot from the sea.
  const fall = POI.waterfalls[1];
  const fallTop = sampleHeight(fall.x, fall.z);
  const sideX = -fall.dirZ; // perpendicular to the fall direction
  const sideZ = fall.dirX;
  const fallPt = (out: number, side: number, y: number) =>
    new Vector3(fall.x + fall.dirX * out + sideX * side, y, fall.z + fall.dirZ * out + sideZ * side);

  const peak = POI.eaglePeak;

  return [
    {
      caption: "KETU-9",
      sub: "The Splinterlands, late in the Bright",
      from: new Vector3(-2800, 950, 3600),
      to: new Vector3(-900, 620, 2300),
      look: new Vector3(0, 120, 0),
      lookDrift: new Vector3(200, -40, -300),
      duration: 16,
      phase: 0.04,
    },
    {
      // Aerial three-quarter view: the channel is studded with islets (max
      // ~250 m), so the camera stays high and looks down the full ribbon.
      caption: "Meltwater",
      sub: `A ${Math.round(fallTop)}-meter fall off the fjord wall`,
      from: fallPt(560, -150, 300),
      to: fallPt(320, -50, 210),
      look: new Vector3(fall.x, fallTop * 0.48, fall.z),
      lookDrift: new Vector3(0, -30, 0),
      duration: 16,
      phase: 0.08,
    },
    {
      // The camera settles toward the water, staring down at a shadow that has
      // begun to climb. Cue timing: the breach is commanded at 3.6 s, the
      // surface break lands at 3.6 + BREACH.BREAK_AT = 8.2 s — 0.2 s after the
      // hard cut below, so the sea erupts as the next shot opens.
      caption: "The Pod",
      sub: "Something is rising",
      anchor: "lev0Surface",
      yawFollow: true,
      lookAnchor: "lev0",
      from: new Vector3(120, 26, 30),
      to: new Vector3(62, 13, 15),
      look: new Vector3(0, 4, 0),
      lookDrift: new Vector3(0, 0, 0),
      fovFrom: BASE_FOV,
      fovTo: 46,
      duration: 8,
      phase: 0.15,
      cutOut: true,
      cue: { at: 3.6, cue: { kind: "leviathanBreach", index: 0 } },
    },
    {
      // Low over the water as ninety meters of leviathan goes airborne: the
      // apex roll ~2 s in, the re-entry plume at ~3.3 s, the shadow diving
      // away through the long tail of the shot.
      caption: "The Pod",
      sub: "Ninety meters of it, airborne",
      anchor: "lev0Surface",
      yawFollow: true,
      lookAnchor: "lev0",
      from: new Vector3(170, 6, -20),
      to: new Vector3(115, 18, -45),
      look: new Vector3(0, 8, 0),
      lookDrift: new Vector3(0, 4, 0),
      fovFrom: 46,
      fovTo: 36,
      shake: 0.06,
      dof: { key: "lev0", range: 60, bokeh: 2.5 },
      duration: 9,
      phase: 0.15,
      cutIn: true,
    },
    {
      caption: "Stormwings",
      sub: "Four-winged riders on the summit thermal",
      from: new Vector3(peak.x + 420, peak.summit + 330, peak.z + 200),
      to: new Vector3(peak.x + 140, peak.summit + 230, peak.z - 190),
      look: new Vector3(peak.x, peak.summit + 200, peak.z),
      lookDrift: new Vector3(0, 25, 0),
      duration: 16,
      phase: 0.1,
    },
    {
      // Drift in on the hero bear. Cue timing: roar commanded at 6.6 s — the
      // amble drains out, it rears at ~8 s, the jaw snaps open at 9.3 s, and
      // the hard cut at 10 s lands mid-roar.
      caption: "Glassbears",
      sub: "Seen only by the way they bend the ice",
      anchor: "bear0",
      yawFollow: true,
      from: new Vector3(-18, 9, 24),
      to: new Vector3(-8, 5.5, 11),
      look: new Vector3(0, 3.2, 0),
      lookDrift: new Vector3(2, -0.5, 0),
      fovFrom: BASE_FOV,
      fovTo: 47,
      duration: 10,
      phase: 0.06,
      cutOut: true,
      cue: { at: 6.6, cue: { kind: "bearRoar", index: 0 } },
    },
    {
      // Low angle under the thrown-back head, pushing into the open jaw while
      // the breath-vapor pulses backlight against the golden-hour sun. The
      // roar ends ~1.8 s in; the bear settles and ambles off through the
      // lens-warp of the ridge — that's the exit image.
      caption: "Glassbears",
      sub: "The ridge answers",
      anchor: "bear0Head",
      yawFollow: true,
      from: new Vector3(3.2, 0.2, 5.8),
      to: new Vector3(1.9, 0.7, 3.4),
      look: new Vector3(0, 0.4, 0),
      lookDrift: new Vector3(0, 0.2, 0),
      fovFrom: 46,
      fovTo: 34,
      shake: 0.05,
      dof: { key: "bear0Head", range: 8, bokeh: 4.5 },
      duration: 9,
      phase: 0.06,
      cutIn: true,
    },
    {
      // Finale: a slow timelapse — the whole shot is the sun leaving. Rate is
      // tuned so sunset lands mid-shot and a twilight band survives to the
      // cut; the loop then fades from that indigo back into peak Bright.
      caption: "The Long Cold",
      sub: "The sun will not rise again for a long time",
      from: new Vector3(-2600, 280, 1500),
      to: new Vector3(-3450, 720, 2150),
      look: new Vector3(0, 280, -400),
      lookDrift: new Vector3(0, 90, 0),
      duration: 22,
      phase: 0.26,
      phaseRate: 0.125,
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
    savedPhase: 0,
    savedRunning: true,
    tourPhase: 0,
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
    const dt = Math.min(rawDt, 0.1);
    const s = state.current;
    const sc = scratch.current;
    const active = useObserver.getState().active;
    const clock = useWorldClock.getState();
    const cam = camera as PerspectiveCamera;

    // --- Enter: save the player's camera + clock so exit is seamless. -------
    if (active && !s.wasActive) {
      s.wasActive = true;
      s.shotIndex = 0;
      s.shotTime = 0;
      s.cueFired = false;
      s.savedPos.copy(cam.position);
      s.savedQuat.copy(cam.quaternion);
      s.savedFov = cam.fov;
      s.savedPhase = clock.phase;
      s.savedRunning = clock.running;
      s.tourPhase = clock.phase;
      clock.setRunning(false);
      directionFlags.observing = true;
      seedAnchors(shots[0]);
    }
    if (!active && s.wasActive) {
      s.wasActive = false;
      cam.position.copy(s.savedPos);
      cam.quaternion.copy(s.savedQuat);
      cam.fov = s.savedFov;
      cam.updateProjectionMatrix();
      clock.setPhase(s.savedPhase);
      clock.setRunning(s.savedRunning);
      directionFlags.observing = false;
      dofChannel.enabled = false;
      return;
    }
    if (!active) return;

    // Honor a jump request (dev console / future deep links): hard-cut to the
    // shot, season snapped so there's no cross-world phase glide.
    const requested = useObserver.getState().requestShot;
    if (requested !== null) {
      s.shotIndex = ((requested % shots.length) + shots.length) % shots.length;
      s.shotTime = 0.01;
      s.cueFired = false;
      s.tourPhase = shots[s.shotIndex].phase;
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
          // Shortest-arc damping so the heading never unwinds the long way.
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
    // the creature's frame when yawFollow) with a drifting look target.
    const e = easeInOut(t);
    const yawRot = current.anchor && current.yawFollow ? s.anchorYaw : 0;
    sc.pos.lerpVectors(current.from, current.to, e);
    if (yawRot) sc.pos.applyAxisAngle(UP, yawRot);
    if (current.anchor) sc.pos.add(s.anchorPos);
    sc.look
      .copy(current.look)
      .addScaledVector(current.lookDrift, e);
    if (yawRot) sc.look.applyAxisAngle(UP, yawRot);
    if (current.lookAnchor) sc.look.add(s.lookAnchorPos);
    else if (current.anchor) sc.look.add(s.anchorPos);

    // Handheld micro-shake: two incommensurate frequencies per axis, applied
    // to the camera and (fainter) to the aim so it reads as breathing, not
    // an earthquake. Ramped in over the first second so cuts don't pop.
    if (current.shake) {
      const st = s.shotTime;
      const amp = current.shake * Math.min(1, st);
      const n1 = Math.sin(st * 1.7) + 0.5 * Math.sin(st * 3.9);
      const n2 = Math.cos(st * 2.3) + 0.5 * Math.sin(st * 5.1);
      sc.right.setFromMatrixColumn(cam.matrix, 0);
      sc.up.setFromMatrixColumn(cam.matrix, 1);
      sc.shake.copy(sc.right).multiplyScalar(n1 * amp).addScaledVector(sc.up, n2 * amp);
      sc.pos.add(sc.shake);
      sc.look.addScaledVector(sc.shake, 0.4);
    }

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
      dofChannel.range = current.dof.range ?? 18;
      dofChannel.bokeh = current.dof.bokeh ?? 3.5;
      dofChannel.enabled = true;
    } else {
      dofChannel.enabled = false;
    }

    // Season: glide the ONE WorldClock toward the shot's phase (same public
    // API as the scrub slider). Reads as a gentle timelapse between shots.
    const d = phaseDelta(s.tourPhase, current.phase);
    s.tourPhase += d * Math.min(1, dt * (current.phaseRate ?? 1.4));
    clock.setPhase(s.tourPhase);

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
