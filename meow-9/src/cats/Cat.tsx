import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, Group, MathUtils, Material, Mesh, Quaternion, Vector3 } from "three";
import { MEOW, ROOM } from "../world/config";
import { useGravity } from "../world/GravityDial";
import { IS_TOUCH } from "../world/device";
import { laserChannel } from "../interact/LaserPointer";
import { CAT_SPOTS } from "../station/Room";
import {
  GROOM_TOTAL,
  LAND_TOTAL,
  POUNCE,
  modeDuration,
  pickGroundedMode,
  type CatMode,
} from "./fsm";
import {
  directionFlags,
  reportDrift,
  setTrackPoint,
  setTrackYaw,
  useDirection,
} from "./direction";

// One adorable black cat: an articulated group of primitives (glossy-black
// body, glowing eyes, cone ears, a four-segment tail) driven by a tiny FSM.
// All behavior timing runs on an integrated clamped-dt clock — the SAME time
// base as the Observer's shot clock, so cued choreography can't desynchronize
// when a frame hitches. Poses are targets damped per joint, so every
// transition (loaf → walk → drift → landing) blends for free.

export interface CatSpec {
  x: number;
  z: number;
  size: number;
  lazy: number;
  playful: number;
  seed: number;
}

export interface CatGeoms {
  haunch: BufferGeometry;
  barrel: BufferGeometry;
  chest: BufferGeometry;
  skull: BufferGeometry;
  muzzle: BufferGeometry;
  nose: BufferGeometry;
  cheek: BufferGeometry;
  ear: BufferGeometry;
  earInner: BufferGeometry;
  eye: BufferGeometry;
  tailSeg: BufferGeometry;
  tailTuft: BufferGeometry;
  thigh: BufferGeometry;
  shin: BufferGeometry;
  paw: BufferGeometry;
}

export interface CatMats {
  body: Material;
  innerEar: Material;
  eye: Material;
  eyeAlt: Material;
  nose: Material;
}

const BODY_REST_Y = 0.235;
const HALF_W = ROOM.w / 2 - ROOM.margin;
const HALF_D = ROOM.d / 2 - ROOM.margin;
const CEIL = ROOM.h - ROOM.margin;
const UP = new Vector3(0, 1, 0);

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const shortestArc = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

interface CatState {
  mode: CatMode;
  time: number;
  stateStart: number;
  dur: number;
  pos: Vector3;
  vel: Vector3;
  spin: Vector3;
  heading: number;
  step: number;
  target: Vector3;
  pounceTarget: Vector3;
  leaped: boolean;
  lastSeq: number;
  chaseCool: number;
  blinkAt: number;
  blinkStart: number;
  earAt: number;
  earStart: number;
  lookAt: number;
  lookStart: number;
  lookYaw: number;
  flickAt: number;
  flickStart: number;
  rand: () => number;
}

export function Cat({
  index,
  spec,
  geoms,
  mats,
}: {
  index: number;
  spec: CatSpec;
  geoms: CatGeoms;
  mats: CatMats;
}) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const headG = useRef<Group>(null);
  const earL = useRef<Group>(null);
  const earR = useRef<Group>(null);
  const eyeL = useRef<Mesh>(null);
  const eyeR = useRef<Mesh>(null);
  const tail = useRef<(Group | null)[]>([]);
  const fs = useRef<(Group | null)[]>([]); // front shoulders
  const fe = useRef<(Group | null)[]>([]); // front elbows
  const hh = useRef<(Group | null)[]>([]); // hind hips
  const hk = useRef<(Group | null)[]>([]); // hind knees

  const st = useRef<CatState | null>(null);
  if (!st.current) {
    const rand = mulberry32(spec.seed);
    st.current = {
      mode: "sit",
      time: 0,
      stateStart: 0,
      dur: 2 + rand() * 4,
      pos: new Vector3(spec.x, 0, spec.z),
      vel: new Vector3(),
      spin: new Vector3(),
      heading: rand() * Math.PI * 2,
      step: rand() * 6,
      target: new Vector3(spec.x, 0, spec.z),
      pounceTarget: new Vector3(),
      leaped: false,
      lastSeq: 0,
      chaseCool: 0,
      blinkAt: 1 + rand() * 4,
      blinkStart: -9,
      earAt: 2 + rand() * 5,
      earStart: -9,
      lookAt: 2 + rand() * 5,
      lookStart: -9,
      lookYaw: 0,
      flickAt: 1.5 + rand() * 4,
      flickStart: -9,
      rand,
    };
  }

  const scratch = useRef({
    v: new Vector3(),
    q: new Quaternion(),
    yawQ: new Quaternion(),
    headPos: new Vector3(),
  });

  const decide = (s: CatState) => {
    s.mode = pickGroundedMode(s.rand(), spec.lazy, spec.playful);
    s.stateStart = s.time;
    s.dur = modeDuration(s.mode, s.rand());
    if (s.mode === "walk") {
      if (s.rand() < 0.55) {
        const [tx, tz] = CAT_SPOTS[Math.floor(s.rand() * CAT_SPOTS.length)];
        s.target.set(tx + (s.rand() - 0.5) * 1.2, 0, tz + (s.rand() - 0.5) * 1.2);
      } else {
        s.target.set((s.rand() * 2 - 1) * (HALF_W - 0.5), 0, (s.rand() * 2 - 1) * (HALF_D - 0.5));
      }
    }
  };

  const enterDrift = (s: CatState) => {
    s.mode = "drift";
    s.stateStart = s.time;
    s.vel.x += (s.rand() - 0.5) * 0.5;
    s.vel.y += 0.3 + s.rand() * 0.5;
    s.vel.z += (s.rand() - 0.5) * 0.5;
    s.spin.set((s.rand() - 0.5) * 1.6, (s.rand() - 0.5) * 1.2, (s.rand() - 0.5) * 1.6);
    if (s.pos.y < 0.02) s.pos.y = 0.02;
  };

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const t = state.clock.elapsedTime; // cosmetic sways only
    const g = useGravity.getState().g;
    const s = st.current!;
    const sc = scratch.current;
    const rootG = root.current;
    const bodyG = body.current;
    if (!rootG || !bodyG) return;
    s.time += dt;

    const airborne = s.mode === "drift" || (s.mode === "pounce" && s.leaped);

    // --- Cues: the Observer director (or console) commands a performance. ---
    const dir = useDirection.getState();
    if (dir.seq !== s.lastSeq) {
      s.lastSeq = dir.seq;
      if (dir.cue && dir.cue.index === index) {
        if (dir.cue.kind === "groom" && !airborne && s.mode !== "land") {
          s.mode = "groom";
          s.stateStart = s.time;
          s.dur = GROOM_TOTAL;
        } else if (dir.cue.kind === "pounce") {
          if (s.mode === "drift") {
            // Zero-g "pounce": a committed push-off along the heading.
            sc.v.set(Math.sin(s.heading), 0.25, Math.cos(s.heading));
            s.vel.addScaledVector(sc.v, 1.9);
            s.spin.x += 1.2;
          } else if (s.mode !== "pounce") {
            s.mode = "pounce";
            s.stateStart = s.time;
            s.leaped = false;
            sc.v.set(Math.sin(s.heading), 0, Math.cos(s.heading));
            s.pounceTarget.copy(s.pos).addScaledVector(sc.v, 1.4);
          }
        }
      }
    }

    // --- Laser: nearby cats lock on (never during a choreographed tour). ----
    const laserOn = laserChannel.active && !directionFlags.observing;
    const laserDist = laserOn ? s.pos.distanceTo(laserChannel.point) : Infinity;
    if (
      laserOn &&
      s.time > s.chaseCool &&
      laserDist < MEOW.chaseRadius &&
      s.mode !== "chase" &&
      s.mode !== "pounce" &&
      s.mode !== "drift" &&
      s.mode !== "land" &&
      s.mode !== "sleep" // sleepers have seen it all before
    ) {
      s.mode = "chase";
      s.stateStart = s.time;
    }

    // --- Gravity gates. ------------------------------------------------------
    if (g < MEOW.driftG && !airborne && s.mode !== "land") enterDrift(s);

    // --- Mode logic + locomotion. -------------------------------------------
    let moveSpeed = 0;
    let gaitRate = 0;

    if (s.mode === "walk" || s.mode === "chase") {
      const chasing = s.mode === "chase";
      if (chasing && !laserOn) {
        // Dot vanished: a beat of hunting stillness, then back to cat business.
        if (s.time - s.stateStart > 0.6) {
          s.chaseCool = s.time + 1.2;
          decide(s);
        }
      } else {
        const tx = chasing ? laserChannel.point.x : s.target.x;
        const tz = chasing ? laserChannel.point.z : s.target.z;
        const want = Math.atan2(tx - s.pos.x, tz - s.pos.z);
        s.heading += shortestArc(want - s.heading) * Math.min(1, (chasing ? 7 : 3.5) * dt);
        // Light-paw band: strides slow and float as the deck lets go.
        const floaty = MathUtils.smoothstep(g, MEOW.driftG, MEOW.lightPawG);
        moveSpeed = (chasing ? 1.5 : 0.42 + 0.35 * spec.playful) * (0.45 + 0.55 * floaty);
        s.pos.x += Math.sin(s.heading) * moveSpeed * dt;
        s.pos.z += Math.cos(s.heading) * moveSpeed * dt;
        s.pos.x = MathUtils.clamp(s.pos.x, -HALF_W, HALF_W);
        s.pos.z = MathUtils.clamp(s.pos.z, -HALF_D, HALF_D);
        gaitRate = moveSpeed * 7.5;
        s.step += gaitRate * dt;

        const dx = tx - s.pos.x;
        const dz = tz - s.pos.z;
        const dd = Math.hypot(dx, dz);
        if (chasing && dd < MEOW.pounceRange) {
          s.mode = "pounce";
          s.stateStart = s.time;
          s.leaped = false;
          s.pounceTarget.copy(laserChannel.point);
        } else if (!chasing && dd < 0.18) {
          decide(s);
        }
      }
    } else if (s.mode === "pounce") {
      const u = s.time - s.stateStart;
      if (!s.leaped && u >= POUNCE.leap) {
        s.leaped = true;
        sc.v.copy(s.pounceTarget).sub(s.pos);
        sc.v.y = 0;
        const dd = Math.max(0.2, sc.v.length());
        sc.v.normalize();
        const flight = 0.45;
        s.vel.copy(sc.v).multiplyScalar(dd / flight);
        s.vel.y = Math.max(1.1, 0.5 * g * MEOW.gAccel * flight);
        s.spin.set(0, 0, 0);
      }
      if (!s.leaped && u > POUNCE.total) decide(s); // never left the deck (edge case)
    } else if (s.mode === "land") {
      if (s.time - s.stateStart > LAND_TOTAL) {
        s.chaseCool = s.time + 0.8;
        decide(s);
      }
    } else if (s.mode !== "drift") {
      // sit / loaf / groom / sleep run their timers.
      if (s.time - s.stateStart > s.dur) decide(s);
    }

    // --- Airborne physics: drift tumble + pounce ballistics. -----------------
    if (airborne) {
      s.vel.y -= g * MEOW.gAccel * dt;
      const drag = s.mode === "drift" ? MEOW.airDrag : MEOW.airDrag * 0.3;
      s.vel.multiplyScalar(Math.max(0, 1 - drag * dt));

      // Air-paddle toward the dot: in zero g the chase becomes a swim.
      if (s.mode === "drift" && laserOn && laserDist < MEOW.chaseRadius * 1.5) {
        sc.v.copy(laserChannel.point).sub(s.pos).normalize();
        s.vel.addScaledVector(sc.v, 1.1 * dt * (0.5 + spec.playful));
        if (s.vel.length() > 2.4) s.vel.setLength(2.4);
      }

      s.pos.addScaledVector(s.vel, dt);

      // Soft room bounds. A wall kiss while hunting becomes a push-off.
      const pushOff = s.mode === "drift" && laserOn && laserDist < MEOW.chaseRadius * 1.5;
      let bounced = false;
      if (s.pos.x > HALF_W) (s.pos.x = HALF_W), (s.vel.x *= ROOM.bounce), (bounced = true);
      if (s.pos.x < -HALF_W) (s.pos.x = -HALF_W), (s.vel.x *= ROOM.bounce), (bounced = true);
      if (s.pos.z > HALF_D) (s.pos.z = HALF_D), (s.vel.z *= ROOM.bounce), (bounced = true);
      if (s.pos.z < -HALF_D) (s.pos.z = -HALF_D), (s.vel.z *= ROOM.bounce), (bounced = true);
      if (s.pos.y > CEIL) (s.pos.y = CEIL), (s.vel.y *= ROOM.bounce), (bounced = true);
      if (bounced && pushOff) {
        sc.v.copy(laserChannel.point).sub(s.pos).normalize();
        s.vel.copy(sc.v).multiplyScalar(1.8);
      }

      // Floor contact.
      if (s.pos.y <= 0.02 && s.vel.y <= 0) {
        s.pos.y = 0;
        if (g >= MEOW.landG || s.mode === "pounce") {
          s.mode = "land";
          s.stateStart = s.time;
          s.leaped = false;
          s.vel.set(0, 0, 0);
          s.spin.set(0, 0, 0);
        } else {
          s.vel.y *= ROOM.bounce; // too weightless to stick — bounce on
          s.pos.y = 0.02;
        }
      }

      // Pounce flight that outlives its budget in low g just becomes a drift.
      if (s.mode === "pounce" && g < MEOW.driftG && s.time - s.stateStart > POUNCE.total) {
        s.mode = "drift";
        s.stateStart = s.time;
        s.spin.set((s.rand() - 0.5) * 1.4, (s.rand() - 0.5) * 1, (s.rand() - 0.5) * 1.4);
      }

      // Re-landing pull: as the dial climbs, weight wins and tumble rights.
      if (s.mode === "drift" && g >= MEOW.landG) {
        s.spin.multiplyScalar(Math.max(0, 1 - 2.5 * dt));
      }
    }

    // --- Root transform. ------------------------------------------------------
    rootG.position.copy(s.pos);
    if (s.mode === "drift") {
      const a = s.spin.length() * dt;
      if (a > 1e-5) {
        sc.v.copy(s.spin).normalize();
        sc.q.setFromAxisAngle(sc.v, a);
        rootG.quaternion.premultiply(sc.q);
      }
      // Cats always know which way is down: righting torque scales with g.
      if (g > 0.1) {
        sc.yawQ.setFromAxisAngle(UP, s.heading);
        rootG.quaternion.slerp(sc.yawQ, 1 - Math.exp(-(0.5 + 4 * g) * dt));
      }
    } else {
      sc.yawQ.setFromAxisAngle(UP, s.heading);
      rootG.quaternion.slerp(sc.yawQ, 1 - Math.exp(-(s.mode === "land" ? 8 : 12) * dt));
    }

    // --- Pose targets. ---------------------------------------------------------
    const u = s.time - s.stateStart;
    let bodyY = BODY_REST_Y;
    let bodyRX = 0;
    let bodyRZ = 0;
    let bodySY = 1;
    let headRX = 0;
    let headRY = 0;
    let headRZ = 0;
    let eyeOpen = 1;
    let tailLift = 0.35;
    let tailSwayAmp = 0.22;
    let tailSwayRate = 1.6;
    let tailWrap = 0;
    const fsT = [0, 0];
    const feT = [0.1, 0.1];
    const hhT = [0, 0];
    const hkT = [0.15, 0.15];

    const gait = Math.min(1, gaitRate);
    switch (s.mode) {
      case "walk":
      case "chase": {
        const floaty = 1 - MathUtils.smoothstep(g, MEOW.driftG, MEOW.lightPawG);
        for (let i = 0; i < 2; i++) {
          const ph = i === 0 ? 0 : Math.PI;
          fsT[i] = 0.5 * Math.sin(s.step + ph) * gait;
          feT[i] = Math.max(0, -Math.sin(s.step + ph - 0.6)) * 0.8 * gait + 0.1;
          hhT[i] = 0.45 * Math.sin(s.step + ph + Math.PI + 0.5) * gait;
          hkT[i] = Math.max(0, -Math.sin(s.step + ph + Math.PI)) * 0.7 * gait + 0.15;
        }
        bodyY += (0.012 + 0.03 * floaty) * Math.sin(2 * s.step) * gait;
        bodyRZ = 0.045 * Math.sin(s.step) * gait;
        tailLift = 0.7;
        tailSwayAmp = 0.3;
        headRY = 0.1 * Math.sin(s.step * 0.5 + spec.seed);
        if (s.mode === "chase") {
          tailLift = 0.15; // low, twitching — locked on
          tailSwayRate = 5;
          headRX = 0.15;
        }
        break;
      }
      case "sit": {
        bodyRX = -0.5;
        bodyY = 0.21;
        fsT[0] = fsT[1] = 0.52;
        feT[0] = feT[1] = 0.05;
        hhT[0] = hhT[1] = -1.25;
        hkT[0] = hkT[1] = 2.0;
        tailWrap = 1;
        headRX = -0.08;
        headRY = 0.25 * Math.sin(t * 0.4 + spec.seed);
        break;
      }
      case "loaf":
      case "sleep": {
        bodyY = 0.14;
        bodySY = 0.8;
        fsT[0] = fsT[1] = -1.3;
        feT[0] = feT[1] = 2.2;
        hhT[0] = hhT[1] = -1.35;
        hkT[0] = hkT[1] = 2.3;
        tailWrap = 1;
        // The loaf breathes.
        bodySY += 0.03 * Math.sin(t * (s.mode === "sleep" ? 1.1 : 1.8) + spec.seed);
        if (s.mode === "sleep") {
          headRX = 0.5;
          eyeOpen = 0.06;
        } else {
          headRX = 0.1;
        }
        break;
      }
      case "groom": {
        bodyRX = -0.5;
        bodyY = 0.21;
        fsT[1] = 0.52;
        feT[1] = 0.05;
        hhT[0] = hhT[1] = -1.25;
        hkT[0] = hkT[1] = 2.0;
        tailWrap = 1;
        // One paw up, head dipping to it with the licking bob.
        fsT[0] = -1.0;
        feT[0] = 1.7;
        headRZ = 0.42;
        headRX = 0.5 + 0.12 * Math.sin(u * 9.5);
        eyeOpen = 0.35;
        break;
      }
      case "drift": {
        const speedAmp = Math.min(1, s.vel.length() * 0.6);
        for (let i = 0; i < 2; i++) {
          const ph = i * 2.1 + spec.seed;
          fsT[i] = -0.65 + Math.sin(t * 4.2 + ph) * (0.25 + 0.35 * speedAmp);
          feT[i] = 0.7 + Math.sin(t * 4.2 + ph + 1.2) * 0.3;
          hhT[i] = 0.5 + Math.sin(t * 3.7 + ph + 0.7) * (0.25 + 0.3 * speedAmp);
          hkT[i] = 0.5 + Math.sin(t * 3.7 + ph + 1.8) * 0.3;
        }
        tailLift = 0.5;
        tailSwayAmp = 0.55;
        tailSwayRate = 2.6;
        eyeOpen = 1.15; // saucer eyes
        headRX = -0.1;
        break;
      }
      case "pounce": {
        if (!s.leaped) {
          const crouch = MathUtils.smoothstep(u, 0, POUNCE.crouch);
          const wiggle =
            u > POUNCE.crouch && u < POUNCE.wiggleEnd ? Math.sin(u * 24) * 0.055 : 0;
          bodyY = MathUtils.lerp(BODY_REST_Y, 0.13, crouch);
          bodyRZ = wiggle;
          fsT[0] = fsT[1] = -0.85 * crouch;
          feT[0] = feT[1] = 1.5 * crouch + 0.1;
          hhT[0] = hhT[1] = -1.0 * crouch;
          hkT[0] = hkT[1] = 1.6 * crouch + 0.15;
          tailLift = 0.9;
          tailSwayRate = 6;
          tailSwayAmp = 0.3;
          headRX = 0.18;
          eyeOpen = 1.15;
        } else {
          // Superman stretch.
          fsT[0] = fsT[1] = -1.6;
          feT[0] = feT[1] = 0.15;
          hhT[0] = hhT[1] = 0.95;
          hkT[0] = hkT[1] = 0.1;
          tailLift = 0.2;
          eyeOpen = 1.15;
        }
        break;
      }
      case "land": {
        const k = MathUtils.smoothstep(u / LAND_TOTAL, 0, 1);
        bodyY = MathUtils.lerp(0.12, BODY_REST_Y, k);
        fsT[0] = fsT[1] = -0.7 * (1 - k);
        feT[0] = feT[1] = 1.2 * (1 - k) + 0.1;
        hhT[0] = hhT[1] = -0.8 * (1 - k);
        hkT[0] = hkT[1] = 1.3 * (1 - k) + 0.15;
        tailLift = 0.8;
        break;
      }
    }

    // Blink + ear twitch on their own little timers (skipped while asleep).
    if (s.mode !== "sleep") {
      if (s.time > s.blinkAt) {
        s.blinkStart = s.time;
        s.blinkAt = s.time + 2.2 + s.rand() * 4.5 + (s.rand() < 0.25 ? -1.9 : 0); // occasional double
      }
      const bu = s.time - s.blinkStart;
      if (bu < 0.2) eyeOpen *= Math.abs(Math.cos((bu / 0.2) * Math.PI));
    }
    if (s.time > s.earAt) {
      s.earStart = s.time;
      s.earAt = s.time + 2.5 + s.rand() * 6;
    }
    const eu = s.time - s.earStart;
    const earTwitch = eu < 0.28 ? Math.sin((eu / 0.28) * Math.PI * 2) * 0.3 : 0;

    // Curiosity: at rest, cats swivel to "look" at something and perk their
    // ears — the little head turns that make them feel alive, not posed.
    const resting = s.mode === "sit" || s.mode === "loaf" || s.mode === "groom";
    if (resting && s.time > s.lookAt) {
      s.lookStart = s.time;
      s.lookYaw = (s.rand() - 0.5) * 1.2;
      s.lookAt = s.time + 2.6 + s.rand() * 5;
      s.earStart = s.time; // ears perk toward whatever caught their eye
    }
    const lu = s.time - s.lookStart;
    let lookYaw = 0;
    let lookLift = 0;
    if (resting && lu < 1.8) {
      const env = Math.sin(Math.min(1, lu / 1.8) * Math.PI); // 0 → 1 → 0
      lookYaw = s.lookYaw * env;
      lookLift = 0.14 * env; // a curious little chin-up
    }

    // Tail-tip flick — a quick lash on its own timer, present even at rest.
    if (s.time > s.flickAt) {
      s.flickStart = s.time;
      s.flickAt = s.time + 2.5 + s.rand() * 5;
    }
    const flu = s.time - s.flickStart;
    const tailFlick = flu < 0.55 ? Math.sin((flu / 0.55) * Math.PI * 2) * 0.5 : 0;

    // --- Apply pose (damped per joint — transitions blend for free). --------
    const D = (cur: number, target: number, l = 10) => MathUtils.damp(cur, target, l, dt);
    bodyG.position.y = D(bodyG.position.y, bodyY);
    bodyG.rotation.x = D(bodyG.rotation.x, bodyRX);
    bodyG.rotation.z = D(bodyG.rotation.z, bodyRZ, 14);
    bodyG.scale.y = D(bodyG.scale.y, bodySY);

    if (headG.current) {
      headG.current.rotation.x = D(headG.current.rotation.x, headRX - lookLift, 8);
      headG.current.rotation.y = D(headG.current.rotation.y, headRY + lookYaw, 8);
      headG.current.rotation.z = D(headG.current.rotation.z, headRZ, 8);
    }
    if (earL.current) earL.current.rotation.x = D(earL.current.rotation.x, earTwitch, 20);
    if (earR.current)
      earR.current.rotation.x = D(earR.current.rotation.x, index % 2 ? earTwitch : 0, 20);
    if (eyeL.current && eyeR.current) {
      const sy = Math.max(0.05, Math.min(1.2, eyeOpen));
      eyeL.current.scale.y = sy;
      eyeR.current.scale.y = sy;
    }

    for (let k = 0; k < 4; k++) {
      const seg = tail.current[k];
      if (!seg) continue;
      const sway = Math.sin(t * tailSwayRate + k * 0.9 + spec.seed) * tailSwayAmp * (0.6 + k * 0.25);
      const wrapY = tailWrap * (k === 0 ? 1.1 : 0.55);
      const liftX = k === 0 ? -tailLift : -tailLift * 0.25 + tailWrap * 0.15;
      // The flick lashes the tip hardest (k grows toward the tuft) and reads
      // even on a wrapped tail — a curled tail-tip twitch is peak cat.
      const flick = tailFlick * (0.25 + k * 0.28) * (0.45 + 0.55 * (1 - tailWrap));
      seg.rotation.x = D(seg.rotation.x, liftX, 6);
      seg.rotation.y = D(seg.rotation.y, sway * (1 - tailWrap) + wrapY + flick, 6);
    }

    for (let i = 0; i < 2; i++) {
      const a = fs.current[i];
      const b = fe.current[i];
      const c = hh.current[i];
      const d = hk.current[i];
      if (a) a.rotation.x = D(a.rotation.x, fsT[i], 12);
      if (b) b.rotation.x = D(b.rotation.x, feT[i], 12);
      if (c) c.rotation.x = D(c.rotation.x, hhT[i], 12);
      if (d) d.rotation.x = D(d.rotation.x, hkT[i], 12);
    }

    // --- Track points for the Observer's anchored shots (hero cat only). ----
    if (index === 0) {
      setTrackPoint("cat0", rootG.position);
      setTrackYaw("cat0", s.heading);
      if (headG.current) {
        headG.current.getWorldPosition(sc.headPos);
        setTrackPoint("cat0Head", sc.headPos);
        setTrackYaw("cat0Head", s.heading);
      }
    }
    if (s.mode === "drift") reportDrift(rootG.position, s.vel.length());
  });

  const CAST = !IS_TOUCH;
  const eyeMat = index % 3 === 0 ? mats.eyeAlt : mats.eye;

  return (
    <group ref={root} scale={spec.size} position={[spec.x, 0, spec.z]}>
      <group ref={body} position={[0, BODY_REST_Y, 0]}>
        {/* haunches → barrel → chest */}
        <mesh geometry={geoms.haunch} material={mats.body} position={[0, 0, -0.14]} scale={[0.92, 0.92, 1.05]} castShadow={CAST} />
        <mesh geometry={geoms.barrel} material={mats.body} position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow={CAST} />
        <mesh geometry={geoms.chest} material={mats.body} position={[0, 0.01, 0.13]} castShadow={CAST} />

        {/* head — a neat sleek face with big pointed ears and big gold eyes */}
        <group ref={headG} position={[0, 0.085, 0.21]}>
          <mesh geometry={geoms.skull} material={mats.body} position={[0, 0.05, 0.03]} castShadow={CAST} />
          <mesh geometry={geoms.muzzle} material={mats.body} position={[0, -0.002, 0.12]} scale={[1, 0.82, 1]} />
          {/* a hint of cheek, kept sleek */}
          <mesh geometry={geoms.cheek} material={mats.body} position={[0.05, 0.005, 0.065]} scale={[0.9, 0.85, 0.85]} castShadow={CAST} />
          <mesh geometry={geoms.cheek} material={mats.body} position={[-0.05, 0.005, 0.065]} scale={[0.9, 0.85, 0.85]} castShadow={CAST} />
          <mesh geometry={geoms.nose} material={mats.nose} position={[0, 0.022, 0.162]} />
          <group ref={earL} position={[0.056, 0.155, -0.005]} rotation={[0, 0, 0.2]}>
            <mesh geometry={geoms.ear} material={mats.body} castShadow={CAST} />
            <mesh geometry={geoms.earInner} material={mats.innerEar} position={[0, -0.006, 0.015]} />
          </group>
          <group ref={earR} position={[-0.056, 0.155, -0.005]} rotation={[0, 0, -0.2]}>
            <mesh geometry={geoms.ear} material={mats.body} castShadow={CAST} />
            <mesh geometry={geoms.earInner} material={mats.innerEar} position={[0, -0.006, 0.015]} />
          </group>
          <mesh ref={eyeL} geometry={geoms.eye} material={eyeMat} position={[0.046, 0.062, 0.1]} />
          <mesh ref={eyeR} geometry={geoms.eye} material={eyeMat} position={[-0.046, 0.062, 0.1]} />
        </group>

        {/* tail: four chained segments off the haunches */}
        <group ref={(el) => (tail.current[0] = el)} position={[0, 0.05, -0.24]}>
          <mesh geometry={geoms.tailSeg} material={mats.body} position={[0, 0, -0.045]} rotation={[Math.PI / 2, 0, 0]} />
          <group ref={(el) => (tail.current[1] = el)} position={[0, 0, -0.09]}>
            <mesh geometry={geoms.tailSeg} material={mats.body} position={[0, 0, -0.045]} rotation={[Math.PI / 2, 0, 0]} />
            <group ref={(el) => (tail.current[2] = el)} position={[0, 0, -0.09]}>
              <mesh geometry={geoms.tailSeg} material={mats.body} position={[0, 0, -0.045]} rotation={[Math.PI / 2, 0, 0]} />
              <group ref={(el) => (tail.current[3] = el)} position={[0, 0, -0.09]}>
                <mesh geometry={geoms.tailSeg} material={mats.body} position={[0, 0, -0.04]} rotation={[Math.PI / 2, 0, 0]} scale={[0.8, 0.8, 0.8]} />
                {/* fluffy tail tip */}
                <mesh geometry={geoms.tailTuft} material={mats.body} position={[0, 0, -0.085]} scale={[0.85, 0.85, 1]} castShadow={CAST} />
              </group>
            </group>
          </group>
        </group>

        {/* front legs */}
        {[0.075, -0.075].map((lx, i) => (
          <group key={`f${i}`} ref={(el) => (fs.current[i] = el)} position={[lx, -0.02, 0.14]}>
            <mesh geometry={geoms.thigh} material={mats.body} position={[0, -0.05, 0]} />
            <group ref={(el) => (fe.current[i] = el)} position={[0, -0.105, 0]}>
              <mesh geometry={geoms.shin} material={mats.body} position={[0, -0.05, 0]} />
              <mesh geometry={geoms.paw} material={mats.body} position={[0, -0.1, 0.015]} scale={[1, 0.7, 1.25]} />
            </group>
          </group>
        ))}

        {/* hind legs */}
        {[0.08, -0.08].map((lx, i) => (
          <group key={`h${i}`} ref={(el) => (hh.current[i] = el)} position={[lx, -0.02, -0.15]}>
            <mesh geometry={geoms.thigh} material={mats.body} position={[0, -0.05, 0]} scale={[1.25, 1.1, 1.25]} />
            <group ref={(el) => (hk.current[i] = el)} position={[0, -0.105, 0]}>
              <mesh geometry={geoms.shin} material={mats.body} position={[0, -0.05, 0]} />
              <mesh geometry={geoms.paw} material={mats.body} position={[0, -0.1, 0.015]} scale={[1, 0.7, 1.25]} />
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}
