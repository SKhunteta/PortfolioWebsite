import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Group,
  LatheGeometry,
  MeshStandardMaterial,
  Vector2,
} from "three";
import { POI } from "../world/locations";

// The pod — eight-limbed leviathans. Whale-scale (~55 m) filter feeders that
// cruise the drowned fjord basins, surfacing in slow breach arcs. The eight
// tentacle-limbs trail from the rear half and row with a lazy sine sweep —
// under the translucent sea they read as huge slow shadows; at the surface the
// back and dorsal keel break into the light. (Aesthetic pillar 4: everything
// drifts — the pod never stops moving.)

const POD = [
  // size 1.7 => ~95 m nose-to-tail: awe-of-scale megafauna, not merely whales.
  { radius: 240, speed: 0.031, phase: 0, dive: 0.21, size: 1.7 },
  { radius: 300, speed: 0.026, phase: 2.6, dive: 0.17, size: 1.35 },
  { radius: 180, speed: 0.037, phase: 4.4, dive: 0.26, size: 1.05 },
];

const BODY_LEN = 55;

/** Whale-ish hull, lathed then laid along +z (nose at +z). */
function makeBodyGeometry(): LatheGeometry {
  const profile: Vector2[] = [
    new Vector2(0.01, -27), // tail tip
    new Vector2(1.6, -20),
    new Vector2(3.6, -10),
    new Vector2(5.2, 0),
    new Vector2(5.4, 8),
    new Vector2(4.6, 16),
    new Vector2(3.0, 22),
    new Vector2(1.4, 26),
    new Vector2(0.01, 27.5), // nose
  ];
  const geom = new LatheGeometry(profile, 20);
  geom.rotateX(Math.PI / 2); // lathe axis Y -> body along Z
  geom.scale(1, 0.82, 1); // slightly flattened, like a swimmer
  return geom;
}

interface TentacleProps {
  material: MeshStandardMaterial;
  position: [number, number, number];
  baseYaw: number;
  swayPhase: number;
}

/** Four nested, tapering segments; rocking each joint bends the whole limb. */
function Tentacle({ material, position, baseYaw, swayPhase }: TentacleProps) {
  const joints = useRef<(Group | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    joints.current.forEach((joint, i) => {
      if (!joint) return;
      // The wave travels tipward: later joints lag the base.
      joint.rotation.x = 0.55 + Math.sin(t * 0.9 + swayPhase - i * 0.7) * 0.22;
      joint.rotation.z = Math.sin(t * 0.6 + swayPhase * 1.3 - i * 0.5) * 0.14;
    });
  });

  const radii = [1.5, 1.05, 0.65, 0.32];
  const segLen = 7;

  // Build the nested chain inside-out so each segment is a child of the last.
  let chain: JSX.Element | null = null;
  for (let i = radii.length - 1; i >= 0; i--) {
    chain = (
      <group
        key={i}
        ref={(el) => (joints.current[i] = el)}
        position={i === 0 ? [0, 0, 0] : [0, -segLen, 0]}
      >
        <mesh material={material} position={[0, -segLen / 2, 0]}>
          <cylinderGeometry args={[radii[i] * 0.7, radii[i], segLen, 8]} />
        </mesh>
        {chain}
      </group>
    );
  }

  return (
    <group position={position} rotation={[0, baseYaw, 0]}>
      {chain}
    </group>
  );
}

function Leviathan({
  bodyGeom,
  material,
  ventralMaterial,
  radius,
  speed,
  phase,
  dive,
  size,
}: (typeof POD)[number] & {
  bodyGeom: LatheGeometry;
  material: MeshStandardMaterial;
  ventralMaterial: MeshStandardMaterial;
}) {
  const root = useRef<Group>(null);
  const pitchGroup = useRef<Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = root.current;
    if (!g) return;

    const a = t * speed + phase;
    const { x: cx, z: cz } = POI.leviathanPool;
    const x = cx + Math.cos(a) * radius;
    const z = cz + Math.sin(a) * radius;

    // Breach cycle: mostly submerged, back arcing above the surface at the top.
    const breath = Math.sin(t * dive + phase * 1.7);
    const y = -11 * size + breath * 13 * size;
    g.position.set(x, y, z);
    g.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));

    // Pitch follows the vertical velocity: nose up on the rise, down on the dive.
    if (pitchGroup.current) {
      const vy = Math.cos(t * dive + phase * 1.7); // d/dt of the breath sine
      pitchGroup.current.rotation.x = -vy * 0.28;
      pitchGroup.current.rotation.z = Math.sin(t * 0.3 + phase) * 0.06;
    }
  });

  // Eight limbs: four per side along the rear half.
  const tentacles: TentacleProps[] = [];
  for (let i = 0; i < 4; i++) {
    const zPos = -6 - i * 5.5;
    tentacles.push(
      { material, position: [4.2, -2.5, zPos], baseYaw: 0.5, swayPhase: i * 1.4 },
      { material, position: [-4.2, -2.5, zPos], baseYaw: -0.5, swayPhase: i * 1.4 + 0.9 }
    );
  }

  return (
    <group ref={root} scale={size}>
      <group ref={pitchGroup}>
        <mesh geometry={bodyGeom} material={material} />
        {/* ventral stripe — pale belly so the breach roll reads */}
        <mesh material={ventralMaterial} position={[0, -3.2, 6]} scale={[3.4, 1.6, 16]}>
          <sphereGeometry args={[1, 12, 8]} />
        </mesh>
        {/* dorsal keel */}
        <mesh material={material} position={[0, 4.4, -4]} rotation={[0.25, 0, 0]} scale={[0.5, 3.2, 6]}>
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>
        {/* tail flukes */}
        <mesh material={material} position={[3.2, 0.4, -26]} rotation={[0, 0.5, 0.12]} scale={[4.5, 0.5, 2.2]}>
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>
        <mesh material={material} position={[-3.2, 0.4, -26]} rotation={[0, -0.5, -0.12]} scale={[4.5, 0.5, 2.2]}>
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>
        {tentacles.map((tp, i) => (
          <Tentacle key={i} {...tp} />
        ))}
      </group>
    </group>
  );
}

export function Leviathans() {
  const bodyGeom = useMemo(makeBodyGeometry, []);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#2a3a44",
        roughness: 0.55,
        metalness: 0.05,
        // Faint bioluminescence (this is an ember-run world) so the pod reads
        // against dark water at the hinge instead of vanishing dark-on-dark.
        emissive: "#0c4f46",
        emissiveIntensity: 0.65,
      }),
    []
  );
  const ventralMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#9fb4b6",
        roughness: 0.6,
        metalness: 0,
        emissive: "#7fd8c0",
        emissiveIntensity: 0.4,
      }),
    []
  );

  return (
    <group>
      {POD.map((animal, i) => (
        <Leviathan
          key={i}
          {...animal}
          bodyGeom={bodyGeom}
          material={material}
          ventralMaterial={ventralMaterial}
        />
      ))}
    </group>
  );
}
