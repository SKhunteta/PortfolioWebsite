import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MeshStandardMaterial } from "three";
import { POI } from "../world/locations";

// Stormwings — Ketu-9's answer to an eagle, scaled up and made strange: a
// 9-meter, FOUR-winged thermal rider with a spined crest and two long tail
// streamers. The double wing pair flaps in counterphase (front down while rear
// rises), which reads instantly as "not a bird from home". They ride the gyre
// over the summit near spawn, banking into the circle, with a faint aurora-green
// sheen so they still read against the Dark.

const GYRE = [
  { radius: 130, height: 190, speed: 0.16, phase: 0, size: 1 },
  { radius: 175, height: 240, speed: -0.12, phase: 1.7, size: 0.85 },
  { radius: 220, height: 160, speed: 0.1, phase: 3.4, size: 1.15 },
  { radius: 150, height: 300, speed: -0.14, phase: 4.6, size: 0.7 },
  { radius: 260, height: 220, speed: 0.09, phase: 5.5, size: 0.95 },
];

// Megafauna scale (aesthetic pillar 3): ~20 m wingspans, condor-of-condors.
const BASE_SCALE = 2.2;

interface WingProps {
  material: MeshStandardMaterial;
  side: 1 | -1;
  z: number;
  span: number;
  chord: number;
  refCb: (el: Group | null) => void;
}

/** One wing, pivoted at the shoulder so rotation.z flaps it. */
function Wing({ material, side, z, span, chord, refCb }: WingProps) {
  return (
    <group ref={refCb} position={[side * 0.5, 0.15, z]}>
      {/* inner panel */}
      <mesh material={material} position={[side * span * 0.25, 0, 0]} scale={[span * 0.5, 0.08, chord]}>
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
      {/* outer panel, swept back — the "fingers" */}
      <mesh
        material={material}
        position={[side * span * 0.72, 0.05, -chord * 0.35]}
        rotation={[0, side * -0.35, side * 0.1]}
        scale={[span * 0.34, 0.05, chord * 0.7]}
      >
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
    </group>
  );
}

function Stormwing({
  material,
  crestMaterial,
  radius,
  height,
  speed,
  phase,
  size,
}: (typeof GYRE)[number] & {
  material: MeshStandardMaterial;
  crestMaterial: MeshStandardMaterial;
}) {
  const root = useRef<Group>(null);
  const bank = useRef<Group>(null);
  const wings = useRef<(Group | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = root.current;
    if (!g) return;

    const a = t * speed + phase;
    const { x: cx, z: cz, summit } = POI.eaglePeak;
    g.position.set(
      cx + Math.cos(a) * radius,
      summit + height + Math.sin(t * 0.23 + phase) * 18, // riding the thermal
      cz + Math.sin(a) * radius
    );
    const dirX = -Math.sin(a) * Math.sign(speed);
    const dirZ = Math.cos(a) * Math.sign(speed);
    g.rotation.y = Math.atan2(dirX, dirZ);

    // Bank into the turn; deeper on tighter gyres.
    if (bank.current) bank.current.rotation.z = -Math.sign(speed) * (30 / radius + 0.18);

    // Slow soaring flap, front pair and rear pair in counterphase.
    const flap = Math.sin(t * 1.7 + phase);
    wings.current.forEach((wing, i) => {
      if (!wing) return;
      const side = i % 2 === 0 ? 1 : -1;
      const pair = i < 2 ? 1 : -1; // front pair vs rear pair
      wing.rotation.z = side * flap * pair * 0.28;
    });
  });

  return (
    <group ref={root} scale={size * BASE_SCALE}>
      <group ref={bank}>
        {/* body — long keel */}
        <mesh material={material} scale={[0.55, 0.55, 2.6]}>
          <sphereGeometry args={[1, 12, 8]} />
        </mesh>
        {/* neck + head */}
        <mesh material={material} position={[0, 0.25, 2.7]} scale={[0.28, 0.28, 0.9]}>
          <sphereGeometry args={[1, 10, 8]} />
        </mesh>
        <mesh material={material} position={[0, 0.35, 3.6]} scale={0.4}>
          <sphereGeometry args={[1, 10, 8]} />
        </mesh>
        {/* beak */}
        <mesh material={crestMaterial} position={[0, 0.28, 4.1]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.14, 0.8, 6]} />
        </mesh>
        {/* crest spines */}
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            material={crestMaterial}
            position={[0, 0.72 - i * 0.1, 3.4 - i * 0.5]}
            rotation={[-0.7 - i * 0.2, 0, 0]}
          >
            <coneGeometry args={[0.09, 0.9 - i * 0.15, 5]} />
          </mesh>
        ))}
        {/* four wings: front pair (bigger) + rear pair */}
        <Wing material={material} side={1} z={0.9} span={4.6} chord={1.15} refCb={(el) => (wings.current[0] = el)} />
        <Wing material={material} side={-1} z={0.9} span={4.6} chord={1.15} refCb={(el) => (wings.current[1] = el)} />
        <Wing material={material} side={1} z={-1.1} span={3.2} chord={0.85} refCb={(el) => (wings.current[2] = el)} />
        <Wing material={material} side={-1} z={-1.1} span={3.2} chord={0.85} refCb={(el) => (wings.current[3] = el)} />
        {/* twin tail streamers */}
        <mesh material={crestMaterial} position={[0.3, 0, -3.4]} rotation={[Math.PI / 2 + 0.12, 0, 0]}>
          <coneGeometry args={[0.07, 2.6, 5]} />
        </mesh>
        <mesh material={crestMaterial} position={[-0.3, 0, -3.4]} rotation={[Math.PI / 2 + 0.12, 0, 0]}>
          <coneGeometry args={[0.07, 2.6, 5]} />
        </mesh>
      </group>
    </group>
  );
}

export function SkyEagles() {
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#23282e",
        roughness: 0.6,
        metalness: 0.25,
        emissive: "#123f33", // faint aurora sheen so they read in the Dark
        emissiveIntensity: 0.35,
      }),
    []
  );
  const crestMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#3affb0",
        roughness: 0.4,
        emissive: "#1f8f66",
        emissiveIntensity: 0.5,
      }),
    []
  );

  return (
    <group>
      {GYRE.map((bird, i) => (
        <Stormwing key={i} {...bird} material={material} crestMaterial={crestMaterial} />
      ))}
    </group>
  );
}
