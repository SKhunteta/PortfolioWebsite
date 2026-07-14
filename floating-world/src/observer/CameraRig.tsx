// Three camera moods:
//   drift — the default aquarium motion: a slow orbit around the network's
//           heart with a simplex micro-sway, radius breathing on the clock.
//   orbit — the user has the wheel; drift resumes after 30s of quiet.
//   chase — double-tap/double-click near a train OR one of the airborne
//           jets: the camera slides into its travel frame and rides along,
//           FOV tightening slightly. A jet ride climbs, banks and flares
//           with the flight path. Exit: Escape, drag, or double-tap empty map.

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import { pointAt, tangentAt } from "../map/network";
import { FLIGHTS, airlinerPoseAt, type FlightPose, type Flight } from "../map/Airliners";
import {
  tourFraming,
  tourEnabled,
  tourForced,
  observeShot,
  reelStopKind,
  type TourFraming,
  type ReelShot,
} from "./tour";
import { orcaPodCenterNow } from "../map/Orcas";
import { TRAINS, useUi, type TrainState } from "../trains/store";
import { CONFIG } from "../world/config";
import { CLOCK } from "../world/clock";
import { PROFILE, fovForAspect } from "../world/device";

const noise2D = createNoise2D(() => 0.427); // fixed seed: same sway every visit
const scratch = { x: 0, z: 0 };
const trainPos = new THREE.Vector3();
const desiredCam = new THREE.Vector3();
const ndc = new THREE.Vector3();
// Reused across frames so the chase never allocates: a plane's live pose and
// its forward (nose) direction recovered from yaw + pitch.
const planePose: FlightPose = { x: 0, z: 0, y: 0, yaw: 0, pitch: 0, roll: 0 };
const planePos = new THREE.Vector3();
const planeFwd = new THREE.Vector3();
// The tour's live framing, reused each frame so the idle circuit never allocates.
const tourScratch: TourFraming = { x: 0, z: 0, radiusKm: 0, elevation: 0 };
// The Observe reel's live shot, reused each frame likewise.
const reelScratch: ReelShot = { x: 0, z: 0, radiusKm: 0, elevation: 0, kind: "orbit", seg: -1, label: "", detail: false };
// Scratch for picking the nearest train to a reel stop (never allocates).
const pick = { x: 0, z: 0 };
// Scratch for the orca reel stop's live, time-of-day-driven centre.
const orcaCenter = { x: 0, z: 0 };

// Settle the camera behind and above a train, along its travel tangent — the
// chase frame, shared by the manual double-tap follow and the Observe reel's
// "riding the light rail" stop.
function frameTrain(
  controls: OrbitControlsImpl,
  camera: THREE.PerspectiveCamera,
  train: TrainState,
  k: number
) {
  pointAt(train.dir, train.sRendered, scratch);
  trainPos.set(scratch.x, train.y, scratch.z);
  tangentAt(train.dir, train.sRendered, scratch);
  const back = CONFIG.camera.chaseOffsetKm.back + train.vEst * 8;
  desiredCam.set(
    trainPos.x - scratch.x * back,
    CONFIG.camera.chaseOffsetKm.up,
    trainPos.z - scratch.z * back
  );
  controls.target.lerp(trainPos, k);
  camera.position.lerp(desiredCam, k);
}

// Sit in a jet's wake, offset back along its nose direction so the camera
// climbs, banks and flares with the flight path — shared by the manual plane
// chase and the reel's "riding the jet" stop.
function framePlane(
  controls: OrbitControlsImpl,
  camera: THREE.PerspectiveCamera,
  flight: Flight,
  k: number
) {
  const pose = airlinerPoseAt(flight, CLOCK.t, planePose);
  planePos.set(pose.x, pose.y, pose.z);
  const cp = Math.cos(pose.pitch);
  planeFwd
    .set(cp * Math.cos(pose.yaw), Math.sin(pose.pitch), -cp * Math.sin(pose.yaw))
    .normalize();
  const off = CONFIG.camera.planeChaseOffsetKm;
  desiredCam.set(
    planePos.x - planeFwd.x * off.back,
    planePos.y - planeFwd.y * off.back + off.up,
    planePos.z - planeFwd.z * off.back
  );
  controls.target.lerp(planePos, k);
  camera.position.lerp(desiredCam, k);
}

// The reel's train DETAIL close-up: instead of the wake chase, slide in tight
// and onto the flank — a slow front-three-quarter broadside where the toy S700
// overfills the frame and the wave livery, ink seams and lit windows read. The
// camera sits a hair AHEAD (`fwd`, along the travel tangent) to catch the nose
// cap + headlights, `side` off the perpendicular to swing onto the flank, and
// `up` above the roofline looking gently down. The train stays centred because
// the offset is rebuilt from its live tangent each frame.
function frameTrainDetail(
  controls: OrbitControlsImpl,
  camera: THREE.PerspectiveCamera,
  train: TrainState,
  k: number
) {
  pointAt(train.dir, train.sRendered, scratch);
  trainPos.set(scratch.x, train.y, scratch.z);
  tangentAt(train.dir, train.sRendered, scratch); // unit travel tangent (x,z)
  const o = CONFIG.camera.trainDetailOffsetKm;
  const px = -scratch.z; // left-hand perpendicular in the xz plane
  const pz = scratch.x;
  desiredCam.set(
    trainPos.x + scratch.x * o.fwd + px * o.side,
    train.y + o.up,
    trainPos.z + scratch.z * o.fwd + pz * o.side
  );
  controls.target.lerp(trainPos, k);
  camera.position.lerp(desiredCam, k);
}

// The reel's plane DETAIL close-up: slide onto the jet's flank for a slow
// rear-three-quarter where the tail device and the fuselage wordmark read. The
// camera sits a hair BEHIND the nose (`back`, so the swept fin faces us), `side`
// off the horizontal perpendicular onto the flank, and `up` above the wing.
function framePlaneDetail(
  controls: OrbitControlsImpl,
  camera: THREE.PerspectiveCamera,
  flight: Flight,
  k: number
) {
  const pose = airlinerPoseAt(flight, CLOCK.t, planePose);
  planePos.set(pose.x, pose.y, pose.z);
  const cp = Math.cos(pose.pitch);
  planeFwd
    .set(cp * Math.cos(pose.yaw), Math.sin(pose.pitch), -cp * Math.sin(pose.yaw))
    .normalize();
  const o = CONFIG.camera.planeDetailOffsetKm;
  // Perpendicular to the nose heading in the xz plane (ignore pitch for the
  // side swing so the camera stays level with the flank, not tilted under it).
  let sx = -planeFwd.z;
  let sz = planeFwd.x;
  const sl = Math.hypot(sx, sz) || 1;
  sx /= sl;
  sz /= sl;
  desiredCam.set(
    planePos.x - planeFwd.x * o.back + sx * o.side,
    planePos.y - planeFwd.y * o.back + o.up,
    planePos.z - planeFwd.z * o.back + sz * o.side
  );
  controls.target.lerp(planePos, k);
  camera.position.lerp(desiredCam, k);
}

// Nearest live train to a world point (a reel ride stop's anchor) within maxKm,
// or undefined when none is close enough — night, the feed asleep, or simply no
// train on that stretch of track just now — in which case the reel falls back
// to an orbit at the anchor. The distance gate keeps a ride HONEST: we only
// "ride the Lake Washington crossing" when a train is actually on it.
function nearestTrainTo(x: number, z: number, maxKm: number): TrainState | undefined {
  let best: TrainState | undefined;
  let bestD = Infinity;
  for (const t of TRAINS.values()) {
    pointAt(t.dir, t.sRendered, pick);
    const d = Math.hypot(pick.x - x, pick.z - z);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return bestD <= maxKm ? best : undefined;
}

// Index of the airborne jet currently nearest a world point — the reel latches
// onto it for the "riding the jet" stop. FLIGHTS is always populated, so this
// never fails.
function nearestFlightTo(x: number, z: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < FLIGHTS.length; i++) {
    const p = airlinerPoseAt(FLIGHTS[i], CLOCK.t, planePose);
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

// The drift's home: downtown, where the tunnel, both waters, and the busiest
// stretch of track all sit (see CONFIG.camera.heart* for why not CENTROID).
const HEART = { x: CONFIG.camera.heartX, z: CONFIG.camera.heartZ };

/** Portrait blend 0..1 — squares (and wider) drift like landscape; a phone
 *  held upright eases toward the top-down framing so the line spine runs up
 *  the screen instead of piling into a horizon band. */
function portraitBlend(aspect: number): number {
  return THREE.MathUtils.clamp((1 - aspect) / 0.35, 0, 1);
}

function driftFraming(aspect: number): { radius: number; elevation: number } {
  const pb = portraitBlend(aspect);
  return {
    radius: THREE.MathUtils.lerp(CONFIG.camera.driftRadiusKm, CONFIG.camera.portrait.radiusKm, pb),
    elevation: THREE.MathUtils.lerp(
      CONFIG.camera.driftElevation,
      CONFIG.camera.portrait.elevation,
      pb
    ),
  };
}

export function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const followId = useUi((s) => s.followTrainId);
  const followPlane = useUi((s) => s.followPlaneIndex);
  const observing = useUi((s) => s.observing);
  const lastInteraction = useRef(-Infinity);
  // The Observe reel's own timeline + latched ride target, so the cinematic
  // flight keeps its place across a user's brief grab of the wheel and never
  // switches trains/jets mid-stop.
  const observeClock = useRef(0);
  const wasObserving = useRef(false);
  const reelSeg = useRef(-1);
  const reelTrainId = useRef<string | null>(null);
  const reelPlaneIdx = useRef<number | null>(null);
  const reelLabel = useRef<string | null>(null);
  // True on frames the reel is riding a train or jet — the FOV loop reads it to
  // narrow the lens just as a manual chase does.
  const observeRiding = useRef(false);
  // True on frames the reel is holding a DETAIL close-up — the FOV loop narrows
  // harder still for the intimate zoom, and the reel drops OrbitControls'
  // min-distance floor so the tight framing isn't clamped back out.
  const observeDetail = useRef(false);
  // Start south of the network looking north — the city reads map-like
  // before the drift carries you elsewhere.
  const driftTheta = useRef(1.35);
  const initialized = useRef(false);
  // Mirrors the store's `touring` flag so we only push a zustand update on the
  // frame the tour starts or stops, never every frame.
  const touringRef = useRef(false);

  // Aspect-compensated FOV; chase narrows it a touch.
  useFrame(() => {
    const baseFov = fovForAspect(PROFILE.baseFov, size.width / size.height);
    const chasing = followId !== null || followPlane !== null || observeRiding.current;
    // Detail close-ups narrow the lens harder than an ordinary chase — the
    // intimate zoom that lets the woodblock detail fill the frame.
    const targetFov = observeDetail.current ? baseFov - 12 : chasing ? baseFov - 6 : baseFov;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, CLOCK.dt * 2);
      camera.updateProjectionMatrix();
    }
  });

  // Dev handle for the smoke harness (meow-9's __meowCamera pattern).
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__linkMapCamera = camera;
  }, [camera]);
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__linkMapControls = controlsRef.current;
  });

  // Pointer bookkeeping: any grab pauses drift and breaks a chase.
  useEffect(() => {
    const el = gl.domElement;
    let lastTap = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    // Screen-space distance from (clientX, clientY) to a world point, or
    // Infinity if the point is behind the camera.
    const pxDistTo = (
      wx: number,
      wy: number,
      wz: number,
      clientX: number,
      clientY: number,
      rect: DOMRect
    ): number => {
      ndc.set(wx, wy, wz).project(camera);
      if (ndc.z > 1) return Infinity;
      const px = (ndc.x * 0.5 + 0.5) * rect.width + rect.left;
      const py = (-ndc.y * 0.5 + 0.5) * rect.height + rect.top;
      return Math.hypot(px - clientX, py - clientY);
    };

    const pickTrain = (clientX: number, clientY: number, rect: DOMRect) => {
      let bestId: string | null = null;
      let bestPx = Infinity;
      for (const train of TRAINS.values()) {
        pointAt(train.dir, train.sRendered, scratch);
        const d = pxDistTo(scratch.x, train.y, scratch.z, clientX, clientY, rect);
        if (d < bestPx) {
          bestPx = d;
          bestId = train.id;
        }
      }
      return { id: bestId, px: bestPx };
    };

    // The airborne jets are chaseable exactly like trains: project each flight's
    // live pose and take the nearest to the tap. (The parked pair sit outside
    // FLIGHTS, so a gate plane never grabs the camera.)
    const pickPlane = (clientX: number, clientY: number, rect: DOMRect) => {
      let bestIndex: number | null = null;
      let bestPx = Infinity;
      for (let i = 0; i < FLIGHTS.length; i++) {
        const p = airlinerPoseAt(FLIGHTS[i], CLOCK.t, planePose);
        const d = pxDistTo(p.x, p.y, p.z, clientX, clientY, rect);
        if (d < bestPx) {
          bestPx = d;
          bestIndex = i;
        }
      }
      return { index: bestIndex, px: bestPx };
    };

    const onDoubleActivate = (x: number, y: number) => {
      const rect = el.getBoundingClientRect();
      const train = pickTrain(x, y, rect);
      const plane = pickPlane(x, y, rect);
      // Whichever glowing thing is nearer to the tap wins, provided it's within
      // the pick radius; a double-tap on empty map picks neither and exits.
      const best = plane.px < train.px ? plane : train;
      if (best.px > CONFIG.camera.doubleTapPx) {
        useUi.getState().setFollowTrain(null); // empty map = let go of whatever we rode
      } else if (plane.px < train.px) {
        useUi.getState().setFollowPlane(plane.index);
      } else {
        useUi.getState().setFollowTrain(train.id);
      }
    };

    const onPointerDown = () => {
      lastInteraction.current = CLOCK.t;
    };
    const onPointerMoveWhileDown = (e: PointerEvent) => {
      if (e.buttons) {
        lastInteraction.current = CLOCK.t;
        const ui = useUi.getState();
        // setFollowTrain(null) releases both riders (the setters are exclusive).
        if (ui.followTrainId !== null || ui.followPlaneIndex !== null) ui.setFollowTrain(null);
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      lastInteraction.current = CLOCK.t;
      // Manual double-tap detection for touch (dblclick is mouse-only-ish).
      const now = performance.now();
      if (
        e.pointerType === "touch" &&
        now - lastTap < 350 &&
        Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < 30
      ) {
        onDoubleActivate(e.clientX, e.clientY);
        lastTap = 0;
      } else {
        lastTap = now;
        lastTapX = e.clientX;
        lastTapY = e.clientY;
      }
    };
    const onDblClick = (e: MouseEvent) => onDoubleActivate(e.clientX, e.clientY);
    const onWheel = () => {
      lastInteraction.current = CLOCK.t;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useUi.getState().setFollowTrain(null);
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMoveWhileDown);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("dblclick", onDblClick);
    el.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMoveWhileDown);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("dblclick", onDblClick);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [gl, camera]);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Reconciled against touringRef at the end of the frame so any exit path
    // (a chase, a grab, drift-before-the-tour) clears the flag uniformly.
    let touringThisFrame = false;

    if (!initialized.current) {
      initialized.current = true;
      controls.target.set(HEART.x, 0, HEART.z);
      const f = driftFraming(size.width / size.height);
      camera.position.set(
        HEART.x + f.radius * Math.cos(driftTheta.current),
        f.radius * Math.sin(f.elevation),
        HEART.z + f.radius * Math.sin(driftTheta.current) * 0.6
      );
    }

    const train = followId ? TRAINS.get(followId) : undefined;
    if (followId && !train) useUi.getState().setFollowTrain(null);
    const plane = followPlane !== null ? FLIGHTS[followPlane] : undefined;
    if (followPlane !== null && !plane) useUi.getState().setFollowTrain(null);

    // Observe bookkeeping: reset the reel's timeline the frame Observe turns on
    // (and open it immediately by treating the page as long-idle); clear its
    // HUD label the frame it turns off.
    if (observing && !wasObserving.current) {
      observeClock.current = 0;
      reelSeg.current = -1;
      lastInteraction.current = -Infinity;
    }
    if (!observing && wasObserving.current) {
      reelSeg.current = -1;
      reelTrainId.current = null;
      reelPlaneIdx.current = null;
      if (reelLabel.current !== null) {
        reelLabel.current = null;
        useUi.getState().setObserveShot(null);
      }
    }
    wasObserving.current = observing;
    if (observing) observeClock.current += CLOCK.dt;

    const chaseK = 1 - Math.exp(-CONFIG.camera.chaseLerp * CLOCK.dt);
    let ridingThisFrame = false;
    let detailThisFrame = false;

    // A slow framed orbit around a centre — the shared motion under the idle
    // drift/tour AND the Observe reel's orbit stops. Advances driftTheta so the
    // circle keeps turning; eases centre + position so every handoff is smooth.
    const applyOrbit = (cx: number, cz: number, radiusBase: number, elevation: number) => {
      driftTheta.current += CONFIG.camera.driftRadSec * CLOCK.dt;
      const sway = noise2D(CLOCK.t * 0.02, 7.3) * 1.6;
      const radius = radiusBase + CONFIG.camera.driftBreathKm * (CLOCK.breath - 0.5);
      desiredCam.set(
        cx + radius * Math.cos(driftTheta.current + sway * 0.05),
        radius * Math.sin(elevation),
        cz + radius * Math.sin(driftTheta.current + sway * 0.05) * 0.62
      );
      const k = 1 - Math.exp(-0.35 * CLOCK.dt);
      camera.position.lerp(desiredCam, k);
      controls.target.x += (cx + sway * 0.4 - controls.target.x) * k;
      controls.target.z += (cz - controls.target.z) * k;
      controls.target.y += (0 - controls.target.y) * k;
    };

    if (train) {
      // Manual chase: settle behind and above the train, along its tangent.
      frameTrain(controls, camera, train, chaseK);
    } else if (plane) {
      // Manual ride: sit in the jet's wake as it climbs, banks and flares.
      framePlane(controls, camera, plane, chaseK);
    } else {
      const idleFor = CLOCK.t - lastInteraction.current;
      const observeActive = observing && idleFor > CONFIG.camera.observeGraceS;
      if (observeActive) {
        // The Observe reel: a slow flight around the most gorgeous parts of the
        // city — low over the underground tunnel, riding the rail and the jets,
        // skimming the cyclists and the lake crossing. Yields to a recent touch
        // (idleFor <= grace) so the visitor can still grab the wheel.
        const shot = observeShot(observeClock.current, reelScratch);
        // Latch the ride target once per stop, so we never switch trains or
        // jets mid-shot, and push the stop's label to the HUD.
        if (shot.seg !== reelSeg.current) {
          reelSeg.current = shot.seg;
          reelTrainId.current =
            shot.kind === "train"
              ? nearestTrainTo(shot.x, shot.z, CONFIG.camera.observeRideMaxKm)?.id ?? null
              : null;
          reelPlaneIdx.current = shot.kind === "plane" ? nearestFlightTo(shot.x, shot.z) : null;
        }
        if (shot.label !== reelLabel.current) {
          reelLabel.current = shot.label;
          useUi.getState().setObserveShot(shot.label);
        }

        const rideTrain =
          shot.kind === "train" ? TRAINS.get(reelTrainId.current ?? "") : undefined;
        if (rideTrain) {
          // Wake chase, or the tight three-quarter broadside on a detail stop.
          if (shot.detail) frameTrainDetail(controls, camera, rideTrain, chaseK);
          else frameTrain(controls, camera, rideTrain, chaseK); // perspective of light rail
          ridingThisFrame = true;
          detailThisFrame = shot.detail;
        } else if (shot.kind === "plane" && reelPlaneIdx.current !== null) {
          const jet = FLIGHTS[reelPlaneIdx.current];
          if (shot.detail) framePlaneDetail(controls, camera, jet, chaseK);
          else framePlane(controls, camera, jet, chaseK); // perspective of plane
          ridingThisFrame = true;
          detailThisFrame = shot.detail;
        } else if (reelStopKind(shot.seg) === "orca") {
          // The orca close-up: chase the pod's own live, time-of-day-driven
          // centre (it migrates around the Sound) rather than a fixed anchor,
          // throughout both the glide in and the hold.
          orcaPodCenterNow(CLOCK.t, orcaCenter);
          applyOrbit(orcaCenter.x, orcaCenter.z, shot.radiusKm, shot.elevation);
          detailThisFrame = shot.detail;
        } else {
          // An orbit stop — or a rail stop with no train nearby (night, feed
          // asleep): fall back to a slow orbit at the anchor.
          applyOrbit(shot.x, shot.z, shot.radiusKm, shot.elevation);
        }
      } else if (idleFor > CONFIG.camera.idleResumeS || tourForced()) {
        // Idle drift, and the cinematic tour once the idle stretch is long
        // enough. idleFor is Infinity on an untouched page (drift opens at
        // once); the tour TIMER wants a finite "seconds idle" instead.
        const f = driftFraming(size.width / size.height);
        let centerX: number = HEART.x;
        let centerZ: number = HEART.z;
        let radiusBase = f.radius;
        let elevation = f.elevation;
        const idleClock = Number.isFinite(idleFor) ? idleFor : CLOCK.t;
        touringThisFrame =
          tourEnabled() && (tourForced() || idleClock > CONFIG.camera.tourAfterS);
        if (touringThisFrame) {
          const w = tourFraming(
            tourForced() ? CLOCK.t : idleClock - CONFIG.camera.tourAfterS,
            tourScratch
          );
          centerX = w.x;
          centerZ = w.z;
          radiusBase = w.radiusKm;
          elevation = w.elevation;
        }
        applyOrbit(centerX, centerZ, radiusBase, elevation);
      }
    }

    observeRiding.current = ridingThisFrame;
    observeDetail.current = detailThisFrame;
    // Drop OrbitControls' min-distance floor while a detail close-up holds so
    // its tight framing isn't clamped back out to the ordinary 0.8 km; restore
    // it otherwise. controls.update() below reads the live value.
    controls.minDistance = detailThisFrame
      ? CONFIG.camera.detailMinDistance
      : CONFIG.camera.minDistance;

    // One zustand write per transition, from any branch above.
    if (touringThisFrame !== touringRef.current) {
      touringRef.current = touringThisFrame;
      useUi.getState().setTouring(touringThisFrame);
    }
    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={CONFIG.camera.minDistance}
      maxDistance={CONFIG.camera.maxDistance}
      maxPolarAngle={1.38}
      screenSpacePanning={false}
    />
  );
}
