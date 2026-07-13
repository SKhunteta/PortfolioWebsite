// Three camera moods:
//   drift — the default aquarium motion: a slow orbit around the network's
//           heart with a simplex micro-sway, radius breathing on the clock.
//   orbit — the user has the wheel; drift resumes after 30s of quiet.
//   chase — double-tap/double-click near a train: the camera slides into
//           its tangent frame and rides along, FOV tightening slightly.
//           Exit: Escape, drag, or double-tap on empty map.

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import { CENTROID, pointAt, tangentAt } from "../map/network";
import { TRAINS, useUi } from "../trains/store";
import { CONFIG } from "../world/config";
import { CLOCK } from "../world/clock";
import { PROFILE, fovForAspect } from "../world/device";

const noise2D = createNoise2D(() => 0.427); // fixed seed: same sway every visit
const scratch = { x: 0, z: 0 };
const trainPos = new THREE.Vector3();
const desiredCam = new THREE.Vector3();
const ndc = new THREE.Vector3();

export function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const followId = useUi((s) => s.followTrainId);
  const lastInteraction = useRef(-Infinity);
  // Start south of the network looking north — the city reads map-like
  // before the drift carries you elsewhere.
  const driftTheta = useRef(1.35);
  const initialized = useRef(false);

  // Aspect-compensated FOV; chase narrows it a touch.
  useFrame(() => {
    const baseFov = fovForAspect(PROFILE.baseFov, size.width / size.height);
    const targetFov = followId ? baseFov - 6 : baseFov;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, CLOCK.dt * 2);
      camera.updateProjectionMatrix();
    }
  });

  // Pointer bookkeeping: any grab pauses drift and breaks a chase.
  useEffect(() => {
    const el = gl.domElement;
    let lastTap = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    const pickTrain = (clientX: number, clientY: number): string | null => {
      const rect = el.getBoundingClientRect();
      let bestId: string | null = null;
      let bestPx: number = CONFIG.camera.doubleTapPx;
      for (const train of TRAINS.values()) {
        pointAt(train.dir, train.sRendered, scratch);
        ndc.set(scratch.x, train.y, scratch.z).project(camera);
        if (ndc.z > 1) continue;
        const px = (ndc.x * 0.5 + 0.5) * rect.width + rect.left;
        const py = (-ndc.y * 0.5 + 0.5) * rect.height + rect.top;
        const d = Math.hypot(px - clientX, py - clientY);
        if (d < bestPx) {
          bestPx = d;
          bestId = train.id;
        }
      }
      return bestId;
    };

    const onDoubleActivate = (x: number, y: number) => {
      const picked = pickTrain(x, y);
      useUi.getState().setFollowTrain(picked); // null on empty map = exit chase
    };

    const onPointerDown = () => {
      lastInteraction.current = CLOCK.t;
    };
    const onPointerMoveWhileDown = (e: PointerEvent) => {
      if (e.buttons) {
        lastInteraction.current = CLOCK.t;
        if (useUi.getState().followTrainId) useUi.getState().setFollowTrain(null);
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
      controls.target.set(CENTROID.x, 0, CENTROID.z);
      const r = CONFIG.camera.driftRadiusKm;
      camera.position.set(
        CENTROID.x + r * Math.cos(driftTheta.current),
        r * Math.sin(CONFIG.camera.driftElevation),
        CENTROID.z + r * Math.sin(driftTheta.current) * 0.6
      );
    }

    const train = followId ? TRAINS.get(followId) : undefined;
    if (followId && !train) useUi.getState().setFollowTrain(null);

    if (train) {
      // Chase: settle behind and above the train, along its travel tangent.
      pointAt(train.dir, train.sRendered, scratch);
      trainPos.set(scratch.x, train.y, scratch.z);
      tangentAt(train.dir, train.sRendered, scratch);
      const back = CONFIG.camera.chaseOffsetKm.back + train.vEst * 30;
      desiredCam.set(
        trainPos.x - scratch.x * back,
        CONFIG.camera.chaseOffsetKm.up,
        trainPos.z - scratch.z * back
      );
      const k = 1 - Math.exp(-CONFIG.camera.chaseLerp * CLOCK.dt);
      controls.target.lerp(trainPos, k);
      camera.position.lerp(desiredCam, k);
    } else {
      const idle = CLOCK.t - lastInteraction.current > CONFIG.camera.idleResumeS;
      if (idle) {
        // Drift: slow theta, micro-sway, radius breathing. All eased so the
        // handoff from user orbit is seamless.
        driftTheta.current += CONFIG.camera.driftRadSec * CLOCK.dt;
        const sway = noise2D(CLOCK.t * 0.02, 7.3) * 1.6;
        const radius =
          CONFIG.camera.driftRadiusKm + CONFIG.camera.driftBreathKm * (CLOCK.breath - 0.5);
        desiredCam.set(
          CENTROID.x + radius * Math.cos(driftTheta.current + sway * 0.05),
          radius * Math.sin(CONFIG.camera.driftElevation),
          CENTROID.z + radius * Math.sin(driftTheta.current + sway * 0.05) * 0.62
        );
        const k = 1 - Math.exp(-0.35 * CLOCK.dt);
        camera.position.lerp(desiredCam, k);
        controls.target.x += (CENTROID.x + sway * 0.4 - controls.target.x) * k;
        controls.target.z += (CENTROID.z - controls.target.z) * k;
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
