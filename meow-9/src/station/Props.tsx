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

// The loose clutter — toy balls, kibble, mugs — and the one place instancing
// IS right (numerous, identical, no articulation). Each instance has a rest
// transform; below liftG it pops off with a small impulse and free-drifts,
// above it a damped spring reels it home. The clutter lifting off is the
// first tell that the dial is really doing something.

interface PropSim {
  pos: Vector3;
  vel: Vector3;
  quat: Quaternion;
  spin: Vector3;
  rest: Vector3;
  restQ: Quaternion;
  scale: number;
  floating: boolean;
  seed: number;
}

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

function stepSim(s: PropSim, dt: number, g: number, restY: number) {
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

  if (g > MEOW.liftG + 0.06) {
    // Settling: damped spring toward home.
    scratchV.copy(s.rest).sub(s.pos).multiplyScalar(2.2);
    s.vel.lerp(scratchV, 1 - Math.exp(-3 * dt));
    s.pos.addScaledVector(s.vel, dt);
    s.quat.slerp(s.restQ, 1 - Math.exp(-4 * dt));
    if (s.pos.distanceToSquared(s.rest) < 0.0006 && s.vel.lengthSq() < 0.01) {
      s.floating = false;
      s.pos.copy(s.rest);
      s.quat.copy(s.restQ);
      s.vel.set(0, 0, 0);
    }
    return;
  }

  // Free drift.
  s.vel.y -= g * MEOW.gAccel * 0.6 * dt;
  s.vel.multiplyScalar(Math.max(0, 1 - MEOW.airDrag * 0.5 * dt));
  s.pos.addScaledVector(s.vel, dt);

  // Soft room bounds.
  if (s.pos.x > HALF_W) (s.pos.x = HALF_W), (s.vel.x *= ROOM.bounce);
  if (s.pos.x < -HALF_W) (s.pos.x = -HALF_W), (s.vel.x *= ROOM.bounce);
  if (s.pos.z > HALF_D) (s.pos.z = HALF_D), (s.vel.z *= ROOM.bounce);
  if (s.pos.z < -HALF_D) (s.pos.z = -HALF_D), (s.vel.z *= ROOM.bounce);
  if (s.pos.y > CEIL) (s.pos.y = CEIL), (s.vel.y *= ROOM.bounce);
  if (s.pos.y < restY) (s.pos.y = restY), (s.vel.y *= ROOM.bounce);

  // Lazy tumble.
  const a = s.spin.length() * dt;
  if (a > 1e-5) {
    scratchV.copy(s.spin).normalize();
    scratchQ.setFromAxisAngle(scratchV, a);
    s.quat.premultiply(scratchQ);
  }
}

function DriftInstances({
  sims,
  geometry,
  material,
  restY,
  colors,
}: {
  sims: PropSim[];
  geometry: JSX.Element;
  material: MeshStandardMaterial;
  restY: number;
  colors?: Color[];
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
    for (let i = 0; i < sims.length; i++) {
      const s = sims[i];
      stepSim(s, dt, g, restY);
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
        colors={BALL_COLORS}
      />
      <DriftInstances
        sims={sims.kibble}
        geometry={<boxGeometry args={[0.05, 0.04, 0.05]} />}
        material={mats.kibble}
        restY={0.03}
      />
      <DriftInstances
        sims={sims.mugs}
        geometry={<cylinderGeometry args={[0.07, 0.06, 0.11, 14]} />}
        material={mats.mug}
        restY={0.06}
      />
    </group>
  );
}
