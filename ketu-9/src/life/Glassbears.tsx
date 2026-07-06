import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MeshPhysicalMaterial } from "three";
import { sampleHeight } from "../terrain/heightfield";
import { POI } from "../world/locations";
import { IS_TOUCH } from "../world/device";

// Glassbears — canon: transparent apex predators you read as heat-shimmer.
// The material does all the work: full transmission + refractive thickness, so
// a bear is visible mainly by the way it BENDS the ice behind it. Silhouettes
// are deliberately simple (aesthetic pillar 3): a bear-shaped cluster of
// primitives is exactly enough when the whole animal is a lens.

const BEARS = [
  { offsetX: 0, offsetZ: 0, radius: 14, speed: 0.055, phase: 0 },
  { offsetX: 26, offsetZ: -14, radius: 10, speed: -0.042, phase: 2.4 },
  { offsetX: -20, offsetZ: 18, radius: 12, speed: 0.048, phase: 4.2 },
];

const SCALE = 2.2; // shoulder height ~2.6 m — a big bear

function Bear({
  material,
  offsetX,
  offsetZ,
  radius,
  speed,
  phase,
}: (typeof BEARS)[number] & { material: MeshPhysicalMaterial }) {
  const root = useRef<Group>(null);
  const head = useRef<Group>(null);
  const legs = useRef<(Group | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = root.current;
    if (!g) return;

    // Slow amble around a loop on the glacial bench, pinned to the terrain.
    const a = t * speed + phase;
    const cx = POI.bearRidge.x + offsetX;
    const cz = POI.bearRidge.z + offsetZ;
    const x = cx + Math.cos(a) * radius;
    const z = cz + Math.sin(a) * radius;
    g.position.set(x, sampleHeight(x, z), z);
    // Face the direction of travel (tangent of the circle).
    const dirX = -Math.sin(a) * Math.sign(speed);
    const dirZ = Math.cos(a) * Math.sign(speed);
    g.rotation.y = Math.atan2(dirX, dirZ);

    // Gait: diagonal legs swing in opposite phase; head sways as it scents.
    const step = t * 2.1 + phase;
    legs.current.forEach((leg, i) => {
      if (leg) leg.rotation.x = Math.sin(step + (i % 2 === 0 ? 0 : Math.PI)) * 0.35;
    });
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.4 + phase) * 0.3;
      head.current.rotation.x = Math.sin(t * 0.9 + phase) * 0.08;
    }
  });

  return (
    <group ref={root} scale={SCALE}>
      {/* torso + shoulder hump */}
      <mesh material={material} position={[0, 1.05, -0.1]} scale={[0.85, 0.8, 1.5]}>
        <sphereGeometry args={[1, 20, 14]} />
      </mesh>
      <mesh material={material} position={[0, 1.5, 0.35]} scale={[0.6, 0.5, 0.65]}>
        <sphereGeometry args={[1, 16, 12]} />
      </mesh>
      {/* head group: skull, muzzle, ears */}
      <group ref={head} position={[0, 1.45, 1.35]}>
        <mesh material={material} scale={[0.42, 0.4, 0.48]}>
          <sphereGeometry args={[1, 16, 12]} />
        </mesh>
        <mesh material={material} position={[0, -0.08, 0.42]} scale={[0.22, 0.2, 0.32]}>
          <sphereGeometry args={[1, 12, 8]} />
        </mesh>
        <mesh material={material} position={[0.26, 0.34, -0.05]} scale={0.12}>
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>
        <mesh material={material} position={[-0.26, 0.34, -0.05]} scale={0.12}>
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>
      </group>
      {/* legs — pivoted at the shoulder/hip so the gait swing reads */}
      {[
        [0.55, 0.95],
        [-0.55, 0.95],
        [0.55, -1.0],
        [-0.55, -1.0],
      ].map(([lx, lz], i) => (
        <group key={i} ref={(el) => (legs.current[i] = el)} position={[lx, 0.95, lz]}>
          <mesh material={material} position={[0, -0.5, 0]}>
            <cylinderGeometry args={[0.19, 0.24, 1.0, 10]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Glassbears() {
  const material = useMemo(
    () =>
      IS_TOUCH
        ? // Mobile: transmission forces a second scene render — fake the glass
          // with plain transparency instead.
          new MeshPhysicalMaterial({
            transparent: true,
            opacity: 0.32,
            roughness: 0.15,
            color: "#dcecee",
          })
        : new MeshPhysicalMaterial({
            transmission: 1.0,
            thickness: 2.5,
            roughness: 0.12,
            ior: 1.42,
            color: "#eef4f6",
            attenuationColor: "#bfe6e0",
            attenuationDistance: 6,
            transparent: true,
          }),
    []
  );

  return (
    <group>
      {BEARS.map((bear, i) => (
        <Bear key={i} {...bear} material={material} />
      ))}
    </group>
  );
}
