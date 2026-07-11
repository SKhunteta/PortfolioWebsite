import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, Group, MathUtils, Material, Mesh, Quaternion, Vector3 } from "three";
import { MEOW, ROOM } from "../world/config";
import { useGravity } from "../world/GravityDial";
import { IS_TOUCH } from "../world/device";
import { mulberry32 } from "../world/rng";
import * as sfx from "../audio/engine";
import { laserChannel } from "../interact/LaserPointer";
import { CAT_SPOTS } from "../station/Room";
import { SCRATCH_POSTS, resolveCircles } from "../station/colliders";
import { CREW_BY_ROLE, type CrewRole } from "../station/crew";
import { propChannel } from "../station/Props";
import {
  GROOM_TOTAL,
  LAND_TOTAL,
  PET_TOTAL,
  POUNCE,
  modeDuration,
  pickGroundedMode,
  type CatMode,
} from "./fsm";
import {
  catBodies,
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
  /** The real girls wear collars: "A" = gold tag, "B" = blue tag. */
  collar?: "A" | "B";
  /** Duty crew wear a service harness and hold a post (station/crew.ts). */
  role?: CrewRole;
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
  whisker: BufferGeometry;
  pupil: BufferGeometry;
  collar: BufferGeometry;
  tag: BufferGeometry;
  vestBand: BufferGeometry;
  vestPlate: BufferGeometry;
  vestLight: BufferGeometry;
  pip: BufferGeometry;
}

export interface CatMats {
  body: Material;
  fuzz: Material; // translucent halo shells — the silhouette fray (desktop)
  innerEar: Material;
  eye: Material;
  eyeAlt: Material;
  nose: Material;
  whisker: Material;
  pupil: Material;
  collar: Material;
  tagA: Material;
  tagB: Material;
  /** Service-harness materials per crew role (cloth + the little duty light). */
  crew: Record<CrewRole, { cloth: Material; light: Material }>;
  pip: Material; // the commander's rank pips
}

const BODY_REST_Y = 0.235;
const HALF_W = ROOM.w / 2 - ROOM.margin;
const HALF_D = ROOM.d / 2 - ROOM.margin;
const CEIL = ROOM.h - ROOM.margin;
const UP = new Vector3(0, 1, 0);

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
  wantScratch: boolean; // current walk ends at a post, claws out
  wantDuty: boolean; // current walk ends at her console, on shift
  postX: number; // what she squares up to on arrival (post or console)
  postZ: number;
  hurry: boolean; // director-sent beeline (scratch cue) — trot, don't amble
  petSide: number; // which flank the visitor's tap landed on (lean direction)
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
      wantScratch: false,
      wantDuty: false,
      postX: 0,
      postZ: 0,
      hurry: false,
      petSide: 1,
      rand,
    };
  }

  const scratch = useRef({
    v: new Vector3(),
    q: new Quaternion(),
    yawQ: new Quaternion(),
    headPos: new Vector3(),
  });

  /** How many OTHER grounded cats are already hanging around a point.
   *  The personal-space currency: walk targets, scratch posts, and nap picks
   *  are all scored against it so the roster spreads across the hab instead
   *  of piling into a knot around the cat tree. */
  const crowdAt = (x: number, z: number, radius = 1.15) => {
    let n = 0;
    for (let j = 0; j < catBodies.length; j++) {
      if (j === index) continue;
      const b = catBodies[j];
      if (!b || b.airborne) continue;
      const dx = b.pos.x - x;
      const dz = b.pos.z - z;
      if (dx * dx + dz * dz < radius * radius) n++;
    }
    return n;
  };

  /** Walk to a sisal post, then rise up and scratch on arrival. Nearest wins,
   *  but a post with company costs ~3 m of extra walk — no queueing. */
  const startScratchApproach = (s: CatState) => {
    let px = SCRATCH_POSTS[0][0];
    let pz = SCRATCH_POSTS[0][1];
    let best = Infinity;
    for (const [x, z] of SCRATCH_POSTS) {
      const d = (x - s.pos.x) ** 2 + (z - s.pos.z) ** 2 + 9 * crowdAt(x, z, 0.9);
      if (d < best) (best = d), (px = x), (pz = z);
    }
    s.postX = px;
    s.postZ = pz;
    // Approach radially from wherever the cat is, stopping a paw's reach out.
    let dx = s.pos.x - px;
    let dz = s.pos.z - pz;
    const d = Math.hypot(dx, dz) || 1;
    dx /= d;
    dz /= d;
    s.target.set(px + dx * 0.36, 0, pz + dz * 0.36);
    s.wantScratch = true;
    s.mode = "walk";
    s.stateStart = s.time;
    s.dur = 9; // generous walk budget; the timeout below covers dead ends
  };

  /** Crew only: walk to her duty post, sit the console on arrival. */
  const startDutyApproach = (s: CatState) => {
    const post = CREW_BY_ROLE[spec.role!].post;
    s.postX = post.faceX;
    s.postZ = post.faceZ;
    s.target.set(post.x, 0, post.z);
    s.wantDuty = true;
    s.mode = "walk";
    s.stateStart = s.time;
    s.dur = 12; // her post can be clear across the hab
  };

  const decide = (s: CatState) => {
    s.hurry = false;
    s.wantScratch = false;
    s.wantDuty = false;
    let pick = pickGroundedMode(s.rand(), spec.lazy, spec.playful, !!spec.role);
    // Personal space: never settle inside a knot of sisters. If she'd sit,
    // loaf, or sleep where two others already are, she walks instead — cats
    // like company at a polite distance.
    if (pick !== "walk" && pick !== "scratch" && pick !== "duty" && crowdAt(s.pos.x, s.pos.z, 0.95) >= 2) {
      pick = "walk";
    }
    if (pick === "scratch") {
      startScratchApproach(s);
      return;
    }
    if (pick === "duty") {
      startDutyApproach(s);
      return;
    }
    s.mode = pick;
    s.stateStart = s.time;
    s.dur = modeDuration(s.mode, s.rand());
    if (s.mode === "walk") {
      const balls = propChannel.groups[0]?.sims;
      if (balls?.length && s.rand() < 0.12 + 0.3 * spec.playful) {
        // A toy! Playful cats seek out a ball — batting it happens on contact.
        const b = balls[Math.floor(s.rand() * balls.length)];
        s.target.set(
          MathUtils.clamp(b.pos.x, -HALF_W + 0.3, HALF_W - 0.3),
          0,
          MathUtils.clamp(b.pos.z, -HALF_D + 0.3, HALF_D - 0.3)
        );
      } else if (s.rand() < 0.55) {
        // Two candidate spots, take the quieter one — the roster stops piling
        // onto the cat tree the moment somebody's already loafing there.
        const a = CAT_SPOTS[Math.floor(s.rand() * CAT_SPOTS.length)];
        const b = CAT_SPOTS[Math.floor(s.rand() * CAT_SPOTS.length)];
        const [tx, tz] = crowdAt(a[0], a[1]) <= crowdAt(b[0], b[1]) ? a : b;
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
        } else if (
          dir.cue.kind === "pet" &&
          !airborne &&
          s.mode !== "land" &&
          s.mode !== "pounce"
        ) {
          // A visitor's tap. Re-tapping mid-pet just restarts the clock —
          // repeated petting extends the bliss.
          s.mode = "pet";
          s.stateStart = s.time;
          s.dur = PET_TOTAL;
          s.petSide = dir.cue.side;
          sfx.purr(PET_TOTAL);
        } else if (dir.cue.kind === "scratch" && !airborne && s.mode !== "land") {
          startScratchApproach(s);
          s.hurry = true; // she knows exactly where she's going
        } else if (dir.cue.kind === "duty" && spec.role && !airborne && s.mode !== "land") {
          startDutyApproach(s);
          s.hurry = true; // called to her post — she reports at a trot
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
      s.mode !== "scratch" && // mid-scratch bliss beats any dot
      s.mode !== "pet" && // being petted beats the dot too
      s.mode !== "duty" && // she's ON SHIFT — the dot can wait
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
        moveSpeed =
          (chasing ? 1.5 : s.hurry ? 1.6 : 0.42 + 0.35 * spec.playful) * (0.45 + 0.55 * floaty);
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
          if (s.wantScratch) {
            // Made it to the post: square up, rise, claws in.
            s.wantScratch = false;
            s.hurry = false;
            s.mode = "scratch";
            s.stateStart = s.time;
            s.dur = modeDuration("scratch", s.rand());
            sfx.purr(s.dur); // sisal under the claws — pure bliss
          } else if (s.wantDuty) {
            // Reported to her post: sit the console, start the shift.
            s.wantDuty = false;
            s.hurry = false;
            s.mode = "duty";
            s.stateStart = s.time;
            s.dur = modeDuration("duty", s.rand());
          } else {
            decide(s);
          }
        } else if (!chasing && s.time - s.stateStart > s.dur + 4) {
          // Target turned out unreachable (a collider in the way, a toy that
          // rolled off) — give up gracefully instead of walking forever.
          decide(s);
        }
      }
    } else if (s.mode === "scratch" || s.mode === "duty") {
      // Planted at the approach point, squared up to the post (or console).
      const want = Math.atan2(s.postX - s.pos.x, s.postZ - s.pos.z);
      s.heading += shortestArc(want - s.heading) * Math.min(1, 6 * dt);
      const k = Math.min(1, 8 * dt);
      s.pos.x += (s.target.x - s.pos.x) * k;
      s.pos.z += (s.target.z - s.pos.z) * k;
      if (s.time - s.stateStart > s.dur) decide(s);
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
      // Carry a little touchdown slide, absorbed through the crouch.
      s.pos.x = MathUtils.clamp(s.pos.x + s.vel.x * dt, -HALF_W, HALF_W);
      s.pos.z = MathUtils.clamp(s.pos.z + s.vel.z * dt, -HALF_D, HALF_D);
      const slide = Math.max(0, 1 - 6 * dt);
      s.vel.x *= slide;
      s.vel.z *= slide;
      if (s.time - s.stateStart > LAND_TOTAL) {
        s.chaseCool = s.time + 0.8;
        s.vel.set(0, 0, 0);
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
          // Touchdown thud from the impact speed (before it's absorbed).
          sfx.thump(Math.min(1, Math.abs(s.vel.y) / 3 + s.vel.length() * 0.1));
          s.mode = "land";
          s.stateStart = s.time;
          s.leaped = false;
          // Momentum doesn't vanish on touchdown: keep a damped slide that
          // the landing crouch absorbs over LAND_TOTAL.
          s.vel.y = 0;
          s.vel.x *= 0.35;
          s.vel.z *= 0.35;
          s.spin.set(0, 0, 0);
        } else {
          s.vel.y *= ROOM.bounce; // too weightless to stick — bounce on
          if (s.vel.y < 0.06) s.vel.y = 0; // kill the micro-bounce jitter
          s.pos.y = 0.02;
        }
      }

      // Pounce flight that outlives its budget in low g just becomes a drift.
      if (s.mode === "pounce" && g < MEOW.driftG && s.time - s.stateStart > POUNCE.total) {
        s.mode = "drift";
        s.stateStart = s.time;
        s.spin.set((s.rand() - 0.5) * 1.4, (s.rand() - 0.5) * 1, (s.rand() - 0.5) * 1.4);
      }

      // Air-righting: a real cat bleeds off tumble with her spine even in
      // free fall (the falling-cat reflex), and weight only helps — the
      // damping rate grows with g instead of switching on at a threshold.
      if (s.mode === "drift") {
        s.spin.multiplyScalar(Math.max(0, 1 - (0.35 + 2.2 * g) * dt));
      }
    }

    // --- Contact: furniture, each other, and the toys. -----------------------
    const myR = MEOW.catBodyR * spec.size;
    if (!airborne) {
      resolveCircles(s.pos, myR); // never walk through the tree or a post
    } else {
      const hit = resolveCircles(s.pos, myR);
      if (hit) {
        const vn = s.vel.x * hit.nx + s.vel.z * hit.nz;
        if (vn < 0) {
          s.vel.x -= 1.35 * vn * hit.nx;
          s.vel.z -= 1.35 * vn * hit.nz;
        }
      }
    }

    // Cats resolve against each other: soft xz separation on the deck, full
    // 3D when both are adrift. Each cat only ever moves itself.
    for (let j = 0; j < catBodies.length; j++) {
      if (j === index) continue;
      const b = catBodies[j];
      if (!b) continue;
      const both3D = airborne && b.airborne;
      const dy = s.pos.y - b.pos.y;
      if (!both3D && Math.abs(dy) > 0.5) continue; // one sails over the other
      const dx = s.pos.x - b.pos.x;
      const dz = s.pos.z - b.pos.z;
      const min = myR + b.r;
      const d2 = dx * dx + dz * dz + (both3D ? dy * dy : 0);
      if (d2 >= min * min || d2 < 1e-8) continue;
      const d = Math.sqrt(d2);
      const push = (min - d) * 0.5;
      s.pos.x += (dx / d) * push;
      s.pos.z += (dz / d) * push;
      if (both3D) {
        s.pos.y = Math.max(0, s.pos.y + (dy / d) * push);
        // A gentle shove apart — two drifting sisters bump and part ways.
        s.vel.x += (dx / d) * push * 2;
        s.vel.y += (dy / d) * push * 2;
        s.vel.z += (dz / d) * push * 2;
      }
      s.pos.x = MathUtils.clamp(s.pos.x, -HALF_W, HALF_W);
      s.pos.z = MathUtils.clamp(s.pos.z, -HALF_D, HALF_D);
    }

    // Paws meet toys: a trotting cat bats whatever she runs into (it rolls
    // off with real ballistics); adrift, toys bounce off her body and she
    // feels the nudge back.
    const centerY = s.pos.y + 0.22 * spec.size;
    for (const gp of propChannel.groups) {
      for (const p of gp.sims) {
        const pr = gp.radius * p.scale;
        const rr = pr + myR;
        const dx = p.pos.x - s.pos.x;
        const dy = p.pos.y - centerY;
        const dz = p.pos.z - s.pos.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2) || 1e-6;
        const nx = dx / d;
        const ny = dy / d;
        const nz = dz / d;
        if (p.floating || airborne) {
          // Free bodies: separate, reflect the toy, nudge the cat.
          p.pos.set(s.pos.x + nx * rr, Math.max(gp.restY, centerY + ny * rr), s.pos.z + nz * rr);
          const rvn =
            (p.vel.x - s.vel.x) * nx + (p.vel.y - s.vel.y) * ny + (p.vel.z - s.vel.z) * nz;
          if (rvn < 0) {
            p.vel.x -= 1.5 * rvn * nx;
            p.vel.y -= 1.5 * rvn * ny;
            p.vel.z -= 1.5 * rvn * nz;
            if (airborne) {
              s.vel.x += 0.2 * rvn * nx;
              s.vel.y += 0.2 * rvn * ny;
              s.vel.z += 0.2 * rvn * nz;
            }
          }
          if (!p.floating) {
            p.floating = true;
            p.kicked = g > MEOW.liftG;
          }
        } else if (moveSpeed > 0.05) {
          // The bat. Mostly along the contact normal, biased by her stride.
          const spd = (MEOW.kickSpeed * 0.7 + moveSpeed * 1.2) * gp.kickMul;
          let kx = nx * 0.65 + Math.sin(s.heading) * 0.35;
          let kz = nz * 0.65 + Math.cos(s.heading) * 0.35;
          const kd = Math.hypot(kx, kz) || 1;
          kx /= kd;
          kz /= kd;
          p.floating = true;
          p.kicked = true;
          p.vel.set(kx * spd, 0.55 + spd * 0.3, kz * spd);
          p.spin.set(p.vel.z, 0, -p.vel.x).multiplyScalar(1 / Math.max(0.05, pr));
        }
      }
    }

    // Publish this cat's body for the others (and next frame's pairs).
    let reg = catBodies[index];
    if (!reg) {
      reg = catBodies[index] = {
        pos: new Vector3(),
        vel: new Vector3(),
        r: myR,
        airborne: false,
        heading: 0,
      };
    }
    reg.pos.copy(s.pos);
    reg.vel.copy(s.vel);
    reg.airborne = airborne;
    reg.heading = s.heading;

    // --- Root transform. ------------------------------------------------------
    rootG.position.copy(s.pos);
    if (s.mode === "drift") {
      const a = s.spin.length() * dt;
      if (a > 1e-5) {
        sc.v.copy(s.spin).normalize();
        sc.q.setFromAxisAngle(sc.v, a);
        rootG.quaternion.premultiply(sc.q);
      }
      // Cats always know which way is down. Even at 0g she can twist herself
      // feet-down (zero-net-spin, the falling-cat trick) — weight just makes
      // the righting faster.
      sc.yawQ.setFromAxisAngle(UP, s.heading);
      rootG.quaternion.slerp(sc.yawQ, 1 - Math.exp(-(0.18 + 4.3 * g) * dt));
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
      case "pet": {
        // Sit base pose, then melt into the hand: chin up, head rolled
        // toward the tapped flank, eyes blissfully shut, a slow content
        // tail. The envelope settles her in and reopens her eyes before
        // the timer hands life back to decide().
        bodyRX = -0.5;
        bodyY = 0.21;
        fsT[0] = fsT[1] = 0.52;
        feT[0] = feT[1] = 0.05;
        hhT[0] = hhT[1] = -1.25;
        hkT[0] = hkT[1] = 2.0;
        tailWrap = 1;
        const env =
          MathUtils.smoothstep(u, 0, 0.5) * (1 - MathUtils.smoothstep(u, PET_TOTAL - 0.6, PET_TOTAL));
        headRX = -0.35 * env;
        headRZ = 0.25 * s.petSide * env;
        bodyRZ = 0.06 * s.petSide * env;
        eyeOpen = 1 - 0.9 * env;
        tailSwayRate = 1.1;
        tailSwayAmp = 0.3;
        // Pushing up into the hand — the little rhythmic lean-in.
        bodyY += 0.012 * Math.sin(u * 5) * env;
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
      case "duty": {
        // On shift: sat tall at the console, chin up at the readouts. Every
        // few seconds a burst of paw-taps at the panel; between bursts the
        // head sweeps the telemetry. Competence, rendered in cat.
        const rise = MathUtils.smoothstep(u, 0, 0.5);
        bodyRX = -0.62 * rise; // more upright than a plain sit
        bodyY = MathUtils.lerp(BODY_REST_Y, 0.255, rise);
        hhT[0] = hhT[1] = -1.25 * rise;
        hkT[0] = hkT[1] = 2.0 * rise;
        tailWrap = 1;
        const cycle = (u % 3.4) / 3.4; // work rhythm: tap burst, then watch
        const tap = cycle < 0.3 ? Math.max(0, Math.sin(u * 15)) : 0;
        fsT[0] = 0.52 * rise - 1.35 * tap;
        feT[0] = 0.05 + 1.0 * tap;
        fsT[1] = 0.52 * rise;
        feT[1] = 0.05;
        headRX = -0.14; // eyes on the screen
        headRY = 0.3 * Math.sin(u * 0.7 + spec.seed); // scanning the readouts
        eyeOpen = 1.05;
        tailSwayAmp = 0.16;
        tailSwayRate = 1.2;
        break;
      }
      case "scratch": {
        // Up on the hind legs, chest to the post, alternating full-arm
        // strokes down the sisal — pure bliss, eyes half-closed.
        const rise = MathUtils.smoothstep(u, 0, 0.6);
        bodyRX = -1.05 * rise;
        bodyY = MathUtils.lerp(BODY_REST_Y, 0.34, rise);
        const stroke = Math.sin(u * 7.5);
        fsT[0] = (-1.5 + 0.4 * stroke) * rise;
        fsT[1] = (-1.5 - 0.4 * stroke) * rise;
        feT[0] = 0.4 + 0.3 * Math.max(0, stroke);
        feT[1] = 0.4 + 0.3 * Math.max(0, -stroke);
        hhT[0] = hhT[1] = -1.15 * rise;
        hkT[0] = hkT[1] = 1.9 * rise + 0.15;
        headRX = -0.28 * rise; // chin up, eyes on her claws
        eyeOpen = 0.8;
        tailLift = 0.85;
        tailSwayAmp = 0.3;
        tailSwayRate = 2.2;
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
    // The commander is trackable too — the Observer's "The Watch" shot rides
    // her to the conn the same way the hero-cat shots ride cat0.
    if (spec.role === "commander") {
      setTrackPoint("cmdCat", rootG.position);
      setTrackYaw("cmdCat", s.heading);
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
        {/* fuzz halos: inflated translucent shells fray the big silhouettes
            (desktop only — the touch profile skips the extra draw calls) */}
        {!IS_TOUCH && (
          <>
            <mesh geometry={geoms.haunch} material={mats.fuzz} position={[0, 0, -0.14]} scale={[0.975, 0.975, 1.113]} renderOrder={2} />
            <mesh geometry={geoms.barrel} material={mats.fuzz} position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]} scale={1.06} renderOrder={2} />
            <mesh geometry={geoms.chest} material={mats.fuzz} position={[0, 0.01, 0.13]} scale={1.06} renderOrder={2} />
          </>
        )}

        {/* head — a neat sleek face with big pointed ears and big gold eyes */}
        <group ref={headG} position={[0, 0.085, 0.21]}>
          <mesh geometry={geoms.skull} material={mats.body} position={[0, 0.05, 0.03]} castShadow={CAST} />
          {!IS_TOUCH && (
            <mesh geometry={geoms.skull} material={mats.fuzz} position={[0, 0.05, 0.03]} scale={1.06} renderOrder={2} />
          )}
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
          <mesh ref={eyeL} geometry={geoms.eye} material={eyeMat} position={[0.046, 0.062, 0.1]}>
            {/* vertical slit pupil — rides the blink with its parent */}
            <mesh geometry={geoms.pupil} material={mats.pupil} position={[0.004, 0, 0.0245]} />
          </mesh>
          <mesh ref={eyeR} geometry={geoms.eye} material={eyeMat} position={[-0.046, 0.062, 0.1]}>
            <mesh geometry={geoms.pupil} material={mats.pupil} position={[-0.004, 0, 0.0245]} />
          </mesh>
          {/* whiskers — three a side, flared forward-out like the real girls' */}
          {[1, -1].map((sd) =>
            [0, 1, 2].map((i) => (
              <mesh
                key={`w${sd}${i}`}
                geometry={geoms.whisker}
                material={mats.whisker}
                position={[sd * 0.048, 0.012 - i * 0.009, 0.128]}
                rotation={[0, sd * -0.42, sd * -(Math.PI / 2 - 0.3 + (i - 1) * 0.17)]}
              />
            ))
          )}
          {/* brow whiskers — two shorter ones per side above the eyes */}
          {[1, -1].map((sd) =>
            [0, 1].map((i) => (
              <mesh
                key={`b${sd}${i}`}
                geometry={geoms.whisker}
                material={mats.whisker}
                position={[sd * 0.036, 0.098, 0.09]}
                rotation={[-0.25, sd * -0.35, sd * -(0.45 + i * 0.28)]}
                scale={0.6}
              />
            ))
          )}
        </group>

        {/* her collar — thin strap at the neck base, little tag under the chin */}
        {spec.collar && (
          <group position={[0, 0.065, 0.175]} rotation={[0.28, 0, 0]}>
            <mesh geometry={geoms.collar} material={mats.collar} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1.6]} />
            <mesh
              geometry={geoms.tag}
              material={spec.collar === "A" ? mats.tagA : mats.tagB}
              position={[0, -0.035, 0.102]}
              scale={[1, 1, 0.55]}
            />
          </group>
        )}

        {/* the service harness — two girth bands, a spine plate, and the
            role-colored duty light. Uniforms, but make it cat. */}
        {spec.role && (
          <group>
            <mesh geometry={geoms.vestBand} material={mats.crew[spec.role].cloth} position={[0, 0.01, 0.055]} scale={[1, 0.97, 1]} />
            <mesh geometry={geoms.vestBand} material={mats.crew[spec.role].cloth} position={[0, 0.005, -0.06]} scale={[1.04, 1, 1]} />
            <mesh geometry={geoms.vestPlate} material={mats.crew[spec.role].cloth} position={[0, 0.121, 0]} castShadow={CAST} />
            <mesh geometry={geoms.vestLight} material={mats.crew[spec.role].light} position={[0, 0.138, -0.048]} />
            {/* rank pips — the commander outranks everyone but the girls */}
            {spec.role === "commander" && (
              <>
                <mesh geometry={geoms.pip} material={mats.pip} position={[0.022, 0.137, 0.05]} />
                <mesh geometry={geoms.pip} material={mats.pip} position={[-0.022, 0.137, 0.05]} />
              </>
            )}
          </group>
        )}

        {/* tail: four chained segments off the haunches */}
        <group ref={(el) => (tail.current[0] = el)} position={[0, 0.05, -0.24]}>
          <mesh geometry={geoms.tailSeg} material={mats.body} position={[0, 0, -0.045]} rotation={[Math.PI / 2, 0, 0]} />
          <group ref={(el) => (tail.current[1] = el)} position={[0, 0, -0.09]}>
            <mesh geometry={geoms.tailSeg} material={mats.body} position={[0, 0, -0.045]} rotation={[Math.PI / 2, 0, 0]} />
            <group ref={(el) => (tail.current[2] = el)} position={[0, 0, -0.09]}>
              <mesh geometry={geoms.tailSeg} material={mats.body} position={[0, 0, -0.045]} rotation={[Math.PI / 2, 0, 0]} />
              <group ref={(el) => (tail.current[3] = el)} position={[0, 0, -0.09]}>
                <mesh geometry={geoms.tailSeg} material={mats.body} position={[0, 0, -0.04]} rotation={[Math.PI / 2, 0, 0]} scale={[0.8, 0.8, 0.8]} />
                {/* fluffy tail tip — a touch fuller than the old sleek nub */}
                <mesh geometry={geoms.tailTuft} material={mats.body} position={[0, 0, -0.085]} scale={[1, 1, 1.15]} castShadow={CAST} />
                {!IS_TOUCH && (
                  <mesh geometry={geoms.tailTuft} material={mats.fuzz} position={[0, 0, -0.085]} scale={[1.08, 1.08, 1.24]} renderOrder={2} />
                )}
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
