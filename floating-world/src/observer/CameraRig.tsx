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
import { FLIGHTS, airlinerPoseAt, type FlightPose } from "../map/Airliners";
import { TRAINS, useUi } from "../trains/store";
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
  const lastInteraction = useRef(-Infinity);
  // Start south of the network looking north — the city reads map-like
  // before the drift carries you elsewhere.
  const driftTheta = useRef(1.35);
  const initialized = useRef(false);

  // Aspect-compensated FOV; chase narrows it a touch.
  useFrame(() => {
    const baseFov = fovForAspect(PROFILE.baseFov, size.width / size.height);
    const chasing = followId !== null || followPlane !== null;
    const targetFov = chasing ? baseFov - 6 : baseFov;
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

    if (train) {
      // Chase: settle behind and above the train, along its travel tangent.
      pointAt(train.dir, train.sRendered, scratch);
      trainPos.set(scratch.x, train.y, scratch.z);
      tangentAt(train.dir, train.sRendered, scratch);
      const back = CONFIG.camera.chaseOffsetKm.back + train.vEst * 8;
      desiredCam.set(
        trainPos.x - scratch.x * back,
        CONFIG.camera.chaseOffsetKm.up,
        trainPos.z - scratch.z * back
      );
      const k = 1 - Math.exp(-CONFIG.camera.chaseLerp * CLOCK.dt);
      controls.target.lerp(trainPos, k);
      camera.position.lerp(desiredCam, k);
    } else if (plane) {
      // Ride the jet: sit in its wake, offset back along the nose direction
      // (recovered from yaw + pitch) so the camera climbs, banks and flares
      // with it. The forward vector matches Airliners' geometry orientation:
      // +X nose, pitched about Z, then yawed about Y.
      const pose = airlinerPoseAt(plane, CLOCK.t, planePose);
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
      const k = 1 - Math.exp(-CONFIG.camera.chaseLerp * CLOCK.dt);
      controls.target.lerp(planePos, k);
      camera.position.lerp(desiredCam, k);
    } else {
      const idle = CLOCK.t - lastInteraction.current > CONFIG.camera.idleResumeS;
      if (idle) {
        // Drift: slow theta, micro-sway, radius breathing. All eased so the
        // handoff from user orbit is seamless.
        driftTheta.current += CONFIG.camera.driftRadSec * CLOCK.dt;
        const sway = noise2D(CLOCK.t * 0.02, 7.3) * 1.6;
        const f = driftFraming(size.width / size.height);
        const radius = f.radius + CONFIG.camera.driftBreathKm * (CLOCK.breath - 0.5);
        desiredCam.set(
          HEART.x + radius * Math.cos(driftTheta.current + sway * 0.05),
          radius * Math.sin(f.elevation),
          HEART.z + radius * Math.sin(driftTheta.current + sway * 0.05) * 0.62
        );
        const k = 1 - Math.exp(-0.35 * CLOCK.dt);
        camera.position.lerp(desiredCam, k);
        controls.target.x += (HEART.x + sway * 0.4 - controls.target.x) * k;
        controls.target.z += (HEART.z - controls.target.z) * k;
        controls.target.y += (0 - controls.target.y) * k;
      }
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
