import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";
import { MEOW, ROOM } from "../world/config";
import { useGravity } from "../world/GravityDial";
import { IS_TOUCH } from "../world/device";
import { resolveCircles } from "./colliders";

// The loose clutter — toy balls, kibble, mugs — and the one place instancing
// IS right (numerous, identical, no articulation). Each instance has a rest
// transform; below liftG it pops off with a small impulse and free-drifts,
// above it a damped spring reels it home. The clutter lifting off is the
// first tell that the dial is really doing something.
//
// Props are also KICKABLE: a trotting cat that runs into a toy bats it — the
// toy gets real ballistics (full weight, floor restitution, rolling friction)
// and, once it stops, adopts the new spot as home instead of teleporting back.

export interface PropSim {
  pos: Vector3;
  vel: Vector3;
  quat: Quaternion;
  spin: Vector3;
  rest: Vector3;
  restQ: Quaternion;
  scale: number;
  floating: boolean;
  kicked: boolean; // batted at (near-)full weight — ballistic + rolling regime
  seed: number;
}

/** How the cats reach the toys: Props publishes its live sim groups here
 *  (same plain-mutable-channel pattern as the laser). */
export interface PropGroup {
  sims: PropSim[];
  radius: number; // collision radius at scale 1
  restY: number;
  kickMul: number; // lighter toys fly further off the same paw
}
export const propChannel: { groups: PropGroup[] } = { groups: [] };

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

function makeSims(
  seed: number,
  count: number,
  place: (r: () => number, i: number) => [number, number, number],
  scaleRange: [number, number]
): PropSim[] {
  const r = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => {
    const [x, y, z] = place(r, i);
    const rest = new Vector3(x, y, z);
    const restQ = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), r() * Math.PI * 2);
    return {
      pos: rest.clone(),
      vel: new Vector3(),
      quat: restQ.clone(),
      spin: new Vector3(),
      rest,
      restQ,
      scale: scaleRange[0] + r() * (scaleRange[1] - scaleRange[0]),
      floating: false,
      kicked: false,
      seed: r() * 1000,
    };
  });
}

const HALF_W = ROOM.w / 2 - ROOM.margin;
const HALF_D = ROOM.d / 2 - ROOM.margin;
const CEIL = ROOM.h - ROOM.margin;

const scratchV = new Vector3();
const scratchQ = new Quaternion();
const scratchM = new Matrix4();
const SCALE3 = new Vector3();

function applyTumble(s: PropSim, dt: number) {
  const a = s.spin.length() * dt;
  if (a > 1e-5) {
    scratchV.copy(s.spin).normalize();
    scratchQ.setFromAxisAngle(scratchV, a);
    s.quat.premultiply(scratchQ);
  }
}

function bounceOffFurniture(s: PropSim, radius: number, restitution: number) {
  const hit = resolveCircles(s.pos, radius);
  if (!hit) return;
  const vn = s.vel.x * hit.nx + s.vel.z * hit.nz;
  if (vn < 0) {
    s.vel.x -= (1 + restitution) * vn * hit.nx;
    s.vel.z -= (1 + restitution) * vn * hit.nz;
  }
}

function stepSim(s: PropSim, dt: number, g: number, restY: number, radius: number) {
  if (!s.floating) {
    if (g < MEOW.liftG) {
      // Pop off the rest spot.
      s.floating = true;
      const r = mulberry32(Math.floor(s.seed * 4096));
      s.vel.set((r() - 0.5) * 0.5, 0.35 + r() * 0.4, (r() - 0.5) * 0.5);
      s.spin.set((r() - 0.5) * 2.4, (r() - 0.5) * 2.4, (r() - 0.5) * 2.4);
    }
    return;
  }

  if (s.kicked && g > MEOW.liftG) {
    // Batted toy under (near-)full weight: real ballistics, floor bounce,
    // then rolling friction until it stops — wherever it stops is home now.
    s.vel.y -= g * MEOW.gAccel * dt;
    s.pos.addScaledVector(s.vel, dt);
    if (s.pos.y < restY) {
      s.pos.y = restY;
      s.vel.y = Math.abs(s.vel.y) > 0.25 ? -s.vel.y * MEOW.ballRestitution : 0;
    }
    if (s.pos.y <= restY + 0.005 && Math.abs(s.vel.y) < 0.05) {
      s.vel.y = 0;
      const f = Math.max(0, 1 - MEOW.rollFriction * dt);
      s.vel.x *= f;
      s.vel.z *= f;
      // Roll, don't slide: spin axis ⟂ travel, rate ∝ speed / radius.
      s.spin.set(s.vel.z, 0, -s.vel.x).multiplyScalar(1 / Math.max(0.05, radius));
    }
    if (s.pos.x > HALF_W) (s.pos.x = HALF_W), (s.vel.x *= ROOM.bounce);
    if (s.pos.x < -HALF_W) (s.pos.x = -HALF_W), (s.vel.x *= ROOM.bounce);
    if (s.pos.z > HALF_D) (s.pos.z = HALF_D), (s.vel.z *= ROOM.bounce);
    if (s.pos.z < -HALF_D) (s.pos.z = -HALF_D), (s.vel.z *= ROOM.bounce);
    bounceOffFurniture(s, radius, 0.5);
    applyTumble(s, dt);
    if (s.vel.lengthSq() < 0.004 && s.pos.y <= restY + 0.01) {
      // Came to rest: adopt the spot (batted toys stay where they rolled).
      s.floating = false;
      s.kicked = false;
      s.rest.x = s.pos.x;
      s.rest.z = s.pos.z;
      s.pos.y = s.rest.y;
      s.restQ.copy(s.quat);
      s.vel.set(0, 0, 0);
      s.spin.set(0, 0, 0);
    }
    return;
  }

  if (g > MEOW.liftG + 0.06) {
    // Settling: damped spring toward home.
    scratchV.copy(s.rest).sub(s.pos).multiplyScalar(2.2);
    s.vel.lerp(scratchV, 1 - Math.exp(-3 * dt));
    s.pos.addScaledVector(s.vel, dt);
    if (s.pos.y < restY) s.pos.y = restY; // never spring through the deck
    s.quat.slerp(s.restQ, 1 - Math.exp(-4 * dt));
    if (s.pos.distanceToSquared(s.rest) < 0.0006 && s.vel.lengthSq() < 0.01) {
      s.floating = false;
      s.kicked = false;
      s.pos.copy(s.rest);
      s.quat.copy(s.restQ);
      s.vel.set(0, 0, 0);
    }
    return;
  }

  // Free drift.
  s.vel.y -= g * MEOW.gAccel * 0.6 * dt;
  s.vel.multiplyScalar(Math.max(0, 1 - MEOW.airDrag * 0.5 * dt));
  // The hab has air: tumble bleeds off just like linear speed does.
  s.spin.multiplyScalar(Math.max(0, 1 - MEOW.airDrag * 0.5 * dt));
  s.pos.addScaledVector(s.vel, dt);

  // Soft room bounds.
  if (s.pos.x > HALF_W) (s.pos.x = HALF_W), (s.vel.x *= ROOM.bounce);
  if (s.pos.x < -HALF_W) (s.pos.x = -HALF_W), (s.vel.x *= ROOM.bounce);
  if (s.pos.z > HALF_D) (s.pos.z = HALF_D), (s.vel.z *= ROOM.bounce);
  if (s.pos.z < -HALF_D) (s.pos.z = -HALF_D), (s.vel.z *= ROOM.bounce);
  if (s.pos.y > CEIL) (s.pos.y = CEIL), (s.vel.y *= ROOM.bounce);
  if (s.pos.y < restY) (s.pos.y = restY), (s.vel.y *= ROOM.bounce);
  bounceOffFurniture(s, radius, -ROOM.bounce);

  applyTumble(s, dt);
}

/** Sphere–sphere response within one group (the balls): equal-mass exchange
 *  of normal velocities, positional separation, and wake-on-hit so a rolling
 *  ball can break a resting cluster like billiards. */
function collideWithin(sims: PropSim[], radius: number, g: number) {
  for (let i = 0; i < sims.length; i++) {
    for (let j = i + 1; j < sims.length; j++) {
      const a = sims[i];
      const b = sims[j];
      const ra = radius * a.scale;
      const rb = radius * b.scale;
      const min = ra + rb;
      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      const dz = b.pos.z - a.pos.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= min * min || d2 < 1e-9) continue;
      const d = Math.sqrt(d2);
      const nx = dx / d;
      const ny = dy / d;
      const nz = dz / d;
      const push = (min - d) * 0.5;
      a.pos.x -= nx * push;
      a.pos.y -= ny * push;
      a.pos.z -= nz * push;
      b.pos.x += nx * push;
      b.pos.y += ny * push;
      b.pos.z += nz * push;
      // Resting pairs (overlapping spawns) separate quietly: shift home too.
      if (!a.floating) (a.rest.x = a.pos.x), (a.rest.z = a.pos.z);
      if (!b.floating) (b.rest.x = b.pos.x), (b.rest.z = b.pos.z);

      const rvn =
        (b.vel.x - a.vel.x) * nx + (b.vel.y - a.vel.y) * ny + (b.vel.z - a.vel.z) * nz;
      if (rvn >= -0.15) continue; // drifting apart / grazing — no impulse
      // Wake whoever gets hit, then swap normal components (e = 0.8).
      const wake = (s: PropSim) => {
        if (!s.floating) {
          s.floating = true;
          s.kicked = g > MEOW.liftG;
        }
      };
      wake(a);
      wake(b);
      const imp = -rvn * 0.9; // (1 + e) / 2 per body
      a.vel.x -= nx * imp;
      a.vel.y -= ny * imp;
      a.vel.z -= nz * imp;
      b.vel.x += nx * imp;
      b.vel.y += ny * imp;
      b.vel.z += nz * imp;
    }
  }
}

function DriftInstances({
  sims,
  geometry,
  material,
  restY,
  radius,
  colors,
  selfCollide,
}: {
  sims: PropSim[];
  geometry: JSX.Element;
  material: MeshStandardMaterial;
  restY: number;
  radius: number;
  colors?: Color[];
  selfCollide?: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);

  useEffect(() => {
    const m = ref.current;
    if (!m || !colors) return;
    for (let i = 0; i < sims.length; i++) m.setColorAt(i, colors[i % colors.length]);
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [sims, colors]);

  useFrame((_, rawDt) => {
    const m = ref.current;
    if (!m) return;
    const dt = Math.min(rawDt, 0.1);
    const g = useGravity.getState().g;
    for (let i = 0; i < sims.length; i++) stepSim(sims[i], dt, g, restY, radius * sims[i].scale);
    if (selfCollide) collideWithin(sims, radius, g);
    for (let i = 0; i < sims.length; i++) {
      const s = sims[i];
      SCALE3.setScalar(s.scale);
      scratchM.compose(s.pos, s.quat, SCALE3);
      m.setMatrixAt(i, scratchM);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, sims.length]} material={material} castShadow>
      {geometry}
    </instancedMesh>
  );
}

const BALL_COLORS = ["#ff6b9d", "#5ee9ff", "#ffd75e", "#9d6bff", "#7dffb0"].map((c) => new Color(c));

export function Props() {
  const counts = IS_TOUCH ? { balls: 6, kibble: 5, mugs: 2 } : { balls: 10, kibble: 8, mugs: 3 };

  const sims = useMemo(
    () => ({
      balls: makeSims(
        41,
        counts.balls,
        (r) => [(r() * 2 - 1) * 5.5, 0.09, (r() * 2 - 1) * 3.8],
        [0.8, 1.25]
      ),
      kibble: makeSims(
        73,
        counts.kibble,
        (r) => [4.6 + r() * 1.2, 0.035, 3.1 + r() * 0.9],
        [0.8, 1.2]
      ),
      mugs: makeSims(
        99,
        counts.mugs,
        (r, i) => (i === 0 ? [-4.05, 0.99, -2.4] : [(r() * 2 - 1) * 4, 0.075, (r() * 2 - 1) * 3]),
        [1, 1]
      ),
    }),
    [counts.balls, counts.kibble, counts.mugs]
  );

  // Publish the toys so the cats can bat them around (balls first — the
  // cats' ball-seeking play reads group 0).
  useEffect(() => {
    propChannel.groups = [
      { sims: sims.balls, radius: 0.09, restY: 0.07, kickMul: 1 },
      { sims: sims.kibble, radius: 0.04, restY: 0.03, kickMul: 1.5 },
      { sims: sims.mugs, radius: 0.075, restY: 0.06, kickMul: 0.6 },
    ];
    return () => {
      propChannel.groups = [];
    };
  }, [sims]);

  const mats = useMemo(
    () => ({
      ball: new MeshStandardMaterial({ color: "#ffffff", roughness: 0.55 }),
      kibble: new MeshStandardMaterial({ color: "#c98a4b", roughness: 0.8 }),
      mug: new MeshStandardMaterial({ color: "#dfe6f2", roughness: 0.35, metalness: 0.15 }),
    }),
    []
  );

  return (
    <group>
      <DriftInstances
        sims={sims.balls}
        geometry={<sphereGeometry args={[0.09, 12, 10]} />}
        material={mats.ball}
        restY={0.07}
        radius={0.09}
        colors={BALL_COLORS}
        selfCollide
      />
      <DriftInstances
        sims={sims.kibble}
        geometry={<boxGeometry args={[0.05, 0.04, 0.05]} />}
        material={mats.kibble}
        restY={0.03}
        radius={0.04}
      />
      <DriftInstances
        sims={sims.mugs}
        geometry={<cylinderGeometry args={[0.07, 0.06, 0.11, 14]} />}
        material={mats.mug}
        restY={0.06}
        radius={0.075}
      />
    </group>
  );
}
