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
import { pointAt, tangentAt, STATION_BY_ID, LINE_BY_ID } from "../map/network";
import { railHeightAt } from "../map/grade";
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
import { observeDisplayFrac } from "../world/observe";
import { TRAINS, useUi, type TrainState } from "../trains/store";
import {
  UNDERGROUND_SITES,
  undergroundSiteById,
  type UndergroundSite,
} from "../stations/platformPulse";
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
const reelScratch: ReelShot = { x: 0, z: 0, radiusKm: 0, elevation: 0, kind: "orbit", seg: -1, label: "", anchor: "", detail: false, random: false, dive: false, vista: false, lookSign: 1 };
// Scratch for picking the nearest train to a reel stop (never allocates).
const pick = { x: 0, z: 0 };
// Scratch for the orca reel stop's live, time-of-day-driven centre.
const orcaCenter = { x: 0, z: 0 };
// Scratch for a low trackside vista: the rail world point, unit travel tangent,
// and rail height — filled from a ridden train or a still station anchor.
const railSample = { x: 0, z: 0, tx: 0, tz: 0, y: 0 };
const desiredTarget = new THREE.Vector3();

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

// Fill `railSample` from a station anchor's rail — the fixed low vantage a vista
// looks along, so the shot stays glued to a coherent AT-GRADE stretch (a train
// that happens to be on it rides through frame on its own; the camera doesn't
// chase one up onto elevated track or down a portal). Resolves the station's
// first line and its arc length on that line's outbound direction, and reads the
// eased rail height there. Returns false if the anchor isn't on a rail (e.g. the
// __orcas__ pseudo-anchor), so the caller can fall back to an orbit.
function railFromAnchor(anchorId: string): boolean {
  const st = STATION_BY_ID.get(anchorId);
  if (!st) return false;
  for (const lineId of st.lines) {
    const dir = LINE_BY_ID.get(lineId)?.directions[0];
    if (!dir) continue;
    const entry = dir.stations.find((s) => s.id === anchorId);
    if (!entry) continue;
    pointAt(dir, entry.sKm, scratch);
    railSample.x = scratch.x;
    railSample.z = scratch.z;
    tangentAt(dir, entry.sKm, scratch);
    railSample.tx = scratch.x;
    railSample.tz = scratch.z;
    railSample.y = railHeightAt(dir, entry.sKm);
    return true;
  }
  return false;
}

// The Observe reel's at-grade VISTA (the reference-photo shot): seat the camera
// at an eye-line beside the rail and look ALONG the glowing ribbon toward the
// horizon, so it recedes to a vanishing point — under Rainier on the southern
// run, over the seigaiha water on the lake crossing. Reads `railSample` (from a
// ridden train or a still anchor). `lookSign` flips which way down the rail we
// look so the shot faces the scenic horizon rather than wherever arc-length
// happens to increase; `sideKm` swings the camera off the rail so the ribbon
// reads as a diagonal leading line (the three-quarter of the photo). Needs the
// relaxed polar / min-distance clamps CameraRig applies while a vista holds —
// this is the one shot that deliberately looks at (and a hair above) the horizon.
function frameTrackside(
  controls: OrbitControlsImpl,
  camera: THREE.PerspectiveCamera,
  lookSign: number,
  k: number
) {
  const o = CONFIG.camera.trackside;
  const tx = railSample.tx * lookSign;
  const tz = railSample.tz * lookSign;
  const px = -tz; // left-hand perpendicular in the xz plane
  const pz = tx;
  desiredCam.set(
    railSample.x - tx * o.backKm + px * o.sideKm,
    railSample.y + o.camHeightKm,
    railSample.z - tz * o.backKm + pz * o.sideKm
  );
  desiredTarget.set(
    railSample.x + tx * o.lookAheadKm,
    railSample.y + o.lookHeightKm,
    railSample.z + tz * o.lookAheadKm
  );
  camera.position.lerp(desiredCam, k);
  controls.target.lerp(desiredTarget, k);
}

// The Observe reel's "diving into the underground" stop. Same tail chase as
// frameTrain while the train runs at grade, but as it sinks toward tunnel depth
// the camera RISES and pulls nearly overhead — a look-down that watches the
// train slip under the translucent paper (past the underground light shafts),
// instead of tilting low along its heading and sweeping Elliott Bay onto the
// horizon (the read that made this look like plunging below water). Camera
// height only grows, so it stays well clear of the −0.06 water plane; the
// target still follows the train down so it stays framed as it goes under.
function frameTunnelDive(
  controls: OrbitControlsImpl,
  camera: THREE.PerspectiveCamera,
  train: TrainState,
  k: number
) {
  pointAt(train.dir, train.sRendered, scratch);
  trainPos.set(scratch.x, train.y, scratch.z);
  tangentAt(train.dir, train.sRendered, scratch);
  // Descent 0..1 from at-grade to full tunnel depth, from the train's own
  // smoothed height (grade.ts eases it down at the portal).
  const atGradeY = CONFIG.ribbon.y["at-grade"];
  const tunnelY = CONFIG.ribbon.y.tunnel;
  const d = THREE.MathUtils.clamp((atGradeY - train.y) / (atGradeY - tunnelY), 0, 1);
  const s = d * d * (3 - 2 * d); // smoothstep
  const dive = CONFIG.camera.tunnelDive;
  const back = THREE.MathUtils.lerp(
    CONFIG.camera.chaseOffsetKm.back + train.vEst * 8,
    dive.backKm,
    s
  );
  const up = THREE.MathUtils.lerp(CONFIG.camera.chaseOffsetKm.up, dive.upKm, s);
  desiredCam.set(trainPos.x - scratch.x * back, up, trainPos.z - scratch.z * back);
  controls.target.lerp(trainPos, k);
  camera.position.lerp(desiredCam, k);
}

// Click-to-descend into a fixed underground hall. Unlike frameTunnelDive (which
// rides a moving train down a portal), this HOLDS a near-overhead, slightly
// angled look-down over the hall's platform floor, so its art fresco reads up
// through the translucent paper. The target eases onto the floor (rail depth);
// the camera eases to a point set back (south) and up, a gentle downward tilt
// rather than a dead-overhead orthographic stare. Fixed station coords → no
// train latch, no allocation.
function frameStationDive(
  controls: OrbitControlsImpl,
  camera: THREE.PerspectiveCamera,
  site: UndergroundSite,
  k: number
) {
  const dive = CONFIG.camera.stationDive;
  trainPos.set(site.x, site.y, site.z); // the platform floor (tunnel depth)
  desiredCam.set(site.x, dive.upKm, site.z + dive.backKm);
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

// Any one live train, picked uniformly at random — the reel's "surprise" stop,
// so the cut sometimes lands on whatever happens to be running rather than the
// same curated crossing every loop. Undefined only when the feed is asleep and
// no train exists at all, in which case the reel falls back to an orbit.
function randomLiveTrain(): TrainState | undefined {
  const n = TRAINS.size;
  if (n === 0) return undefined;
  let i = Math.floor(Math.random() * n);
  for (const t of TRAINS.values()) {
    if (i-- <= 0) return t;
  }
  return undefined;
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
  const diveId = useUi((s) => s.diveStationId);
  const observing = useUi((s) => s.observing);
  const lastInteraction = useRef(-Infinity);
  // The Observe reel's latched ride target, so the cinematic flight never
  // switches trains/jets mid-stop even across a user's brief grab of the wheel.
  // Its timeline is the day itself (observeDisplayFrac), not a private clock.
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
  // True on frames the reel is holding an at-grade VISTA — the FOV loop WIDENS
  // the lens (exaggerating the receding leading line) and CameraRig relaxes the
  // polar clamp past vertical + drops the distance floor so the eye-level look
  // down the rail survives OrbitControls' update.
  const observeVista = useRef(false);
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
    // A vista WIDENS the lens (the receding leading line reads bigger); detail
    // close-ups narrow harder than a chase (the intimate woodblock zoom).
    const targetFov = observeVista.current
      ? baseFov + CONFIG.camera.trackside.fovBoost
      : observeDetail.current
        ? baseFov - 12
        : chasing
          ? baseFov - 6
          : baseFov;
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

    // Underground halls are diveable exactly like trains/jets are chaseable:
    // project each hall's surface seal position and take the nearest to the tap.
    // (Surface/elevated stations aren't in UNDERGROUND_SITES, so they never dive.)
    const pickStation = (clientX: number, clientY: number, rect: DOMRect) => {
      let bestId: string | null = null;
      let bestPx = Infinity;
      for (const site of UNDERGROUND_SITES) {
        const d = pxDistTo(site.x, 0.045, site.z, clientX, clientY, rect);
        if (d < bestPx) {
          bestPx = d;
          bestId = site.id;
        }
      }
      return { id: bestId, px: bestPx };
    };

    const onDoubleActivate = (x: number, y: number) => {
      const rect = el.getBoundingClientRect();
      const train = pickTrain(x, y, rect);
      const plane = pickPlane(x, y, rect);
      const station = pickStation(x, y, rect);
      // Whichever glowing thing is nearest to the tap wins, provided it's within
      // the pick radius: an underground hall dives, a train/jet rides, and a
      // double-tap on empty map picks none and lets go of whatever we held.
      const nearestPx = Math.min(train.px, plane.px, station.px);
      if (nearestPx > CONFIG.camera.doubleTapPx) {
        useUi.getState().setFollowTrain(null); // empty map = release (also rises out of a dive)
      } else if (station.id && station.px === nearestPx) {
        useUi.getState().setDiveStation(station.id);
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
        // setFollowTrain(null) releases all three riders (train/plane/dive — the
        // setters are exclusive), so a drag rises out of a dive too.
        if (ui.followTrainId !== null || ui.followPlaneIndex !== null || ui.diveStationId !== null)
          ui.setFollowTrain(null);
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
    const diveSite = diveId ? undergroundSiteById(diveId) : undefined;
    if (diveId && !diveSite) useUi.getState().setDiveStation(null);

    // Observe bookkeeping: reset the latch + open the reel immediately (treat the
    // page as long-idle) the frame Observe turns on; clear its HUD label the
    // frame it turns off. The reel's timeline is the day-sweep itself, so there's
    // no private clock to advance here.
    if (observing && !wasObserving.current) {
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

    const chaseK = 1 - Math.exp(-CONFIG.camera.chaseLerp * CLOCK.dt);
    let ridingThisFrame = false;
    let detailThisFrame = false;
    let vistaThisFrame = false;

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
    } else if (diveSite) {
      // Manual descent: hold over an underground hall's platform floor in a
      // near-overhead look-down, so its art fresco reads up through the paper.
      // detailThisFrame narrows the FOV and drops the min-distance floor below so
      // the camera can sit close over the disc.
      frameStationDive(controls, camera, diveSite, chaseK);
      detailThisFrame = true;
    } else {
      const idleFor = CLOCK.t - lastInteraction.current;
      const observeActive = observing && idleFor > CONFIG.camera.observeGraceS;
      if (observeActive) {
        // The Observe reel: a highlight reel of the most scenic parts of the
        // line, phase-locked to the day — low at-grade vistas down the glowing
        // rail to Rainier and over the lake, riding the rail and the jets, the
        // tunnel dive, the orcas. Sampled by the DISPLAYED day fraction so each
        // stop plays under the sky it was authored for. Yields to a recent touch
        // (idleFor <= grace) so the visitor can still grab the wheel.
        const shot = observeShot(observeDisplayFrac() ?? 0, reelScratch);
        // Latch the ride target once per stop, so we never switch trains or
        // jets mid-shot, and push the stop's label to the HUD.
        if (shot.seg !== reelSeg.current) {
          reelSeg.current = shot.seg;
          reelTrainId.current =
            shot.kind === "train"
              ? (shot.random
                  ? randomLiveTrain()
                  : nearestTrainTo(shot.x, shot.z, CONFIG.camera.observeRideMaxKm)
                )?.id ?? null
              : null;
          reelPlaneIdx.current = shot.kind === "plane" ? nearestFlightTo(shot.x, shot.z) : null;
        }
        if (shot.label !== reelLabel.current) {
          reelLabel.current = shot.label;
          useUi.getState().setObserveShot(shot.label);
        }

        const rideTrain =
          shot.kind === "train" ? TRAINS.get(reelTrainId.current ?? "") : undefined;
        if (shot.vista) {
          // The at-grade vista: drop to an eye-line beside the rail and look
          // along the glowing ribbon to the horizon (the ribbon is the subject;
          // any train on the stretch rides through frame on its own). Held at a
          // fixed at-grade anchor so it never chases a train up a grade; only a
          // truly unresolvable anchor falls back to a low orbit.
          if (railFromAnchor(shot.anchor)) {
            frameTrackside(controls, camera, shot.lookSign, chaseK);
            vistaThisFrame = true;
          } else {
            applyOrbit(shot.x, shot.z, shot.radiusKm, shot.elevation);
          }
        } else if (rideTrain) {
          // Wake chase; the tight three-quarter broadside on a detail stop; or
          // the grade-aware lift that rides it down into the tunnel on a dive.
          if (shot.detail) frameTrainDetail(controls, camera, rideTrain, chaseK);
          else if (shot.dive) frameTunnelDive(controls, camera, rideTrain, chaseK); // into the underground
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
    observeVista.current = vistaThisFrame;
    // Relax OrbitControls' clamps per-frame so the tight/low framings survive
    // controls.update(): a detail close-up drops the min-distance floor below
    // 0.8 km; an at-grade vista drops it further AND relaxes the polar clamp
    // past vertical so the eye-level look down the rail isn't lifted back up.
    // Everything else (drift, orbits, a user at the wheel) keeps the ordinary
    // floors, so manual control never flips under the map.
    controls.minDistance = detailThisFrame
      ? CONFIG.camera.detailMinDistance
      : vistaThisFrame
        ? CONFIG.camera.tracksideMinDistance
        : CONFIG.camera.minDistance;
    controls.maxPolarAngle = vistaThisFrame
      ? CONFIG.camera.atGradeMaxPolar
      : CONFIG.camera.maxPolarAngle;

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
      maxPolarAngle={CONFIG.camera.maxPolarAngle}
      screenSpacePanning={false}
    />
  );
}
