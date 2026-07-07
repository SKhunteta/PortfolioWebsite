import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  Color,
  DoubleSide,
  MathUtils,
  MeshStandardMaterial,
  ShaderMaterial,
  Vector2,
} from "three";
import { ROOM } from "../world/config";
import { PALETTE } from "../world/palettes";
import { useGravity } from "../world/GravityDial";
import { makeNoiseNormalMap } from "../fx/noiseTextures";
import { registerSurface } from "./surfaces";

// The hab module: one hero room built entirely from primitives. Panel-grid
// walls, ceiling ribs, neon edge strips, and the cat furniture (tree, wall
// pods, food station). The neon strips are the room's HDR sources — their
// emissive intensity rides the Gravity Dial (spin-down = neon up), which is
// half the payoff of scrubbing the dial.

const { w: W, h: H, d: D } = ROOM;

// Where cats like to be. Walk targets + loaf anchors (floor-level points).
export const CAT_SPOTS: [number, number][] = [
  [-4.5, -2.2], // by the cat tree
  [5.2, 3.4], // food station
  [0, -3.6], // under the porthole
  [-5.8, 3.2],
  [3.5, -3.2],
  [-2, 3.8],
  [2.5, 1.5],
  [-3.5, 0],
];

const HOLO_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Cat-status boards: scanlines + a slow shuffle of glyph blocks. Deliberately
// dim (< 1.0) so the holograms glow softly without tripping the bloom.
const HOLO_FRAG = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform vec3 uTint;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  float scan = 0.75 + 0.25 * sin(vUv.y * 170.0 + uTime * 4.0);
  vec2 cell = floor(vUv * vec2(12.0, 7.0));
  float on = step(0.55, hash(cell + floor(uTime * 0.7)));
  float border = step(0.94, vUv.x) + step(vUv.x, 0.06) + step(0.9, vUv.y) + step(vUv.y, 0.1);
  float body = 0.16 + 0.55 * on;
  vec3 col = uTint * (body + 0.5 * min(border, 1.0)) * scan;
  float alpha = 0.28 + 0.45 * on + 0.3 * min(border, 1.0);
  gl_FragColor = vec4(col, alpha * 0.85);
}
`;

export function Room() {
  const mats = useMemo(() => {
    const panelNormal = makeNoiseNormalMap(256, 4, 0.9, 11);
    return {
      hull: new MeshStandardMaterial({
        color: "#23262e",
        roughness: 0.72,
        metalness: 0.35,
        normalMap: panelNormal,
        normalScale: new Vector2(0.25, 0.25),
      }),
      deck: new MeshStandardMaterial({
        color: "#1a1c22",
        roughness: 0.6,
        metalness: 0.25,
        normalMap: panelNormal,
        normalScale: new Vector2(0.35, 0.35),
      }),
      panel: new MeshStandardMaterial({
        color: "#2a2e39",
        roughness: 0.55,
        metalness: 0.45,
      }),
      trim: new MeshStandardMaterial({ color: "#383e4e", roughness: 0.5, metalness: 0.6 }),
      carpet: new MeshStandardMaterial({ color: "#4a3f55", roughness: 0.95 }),
      // The HDR sources. Intensity is driven per-frame off the dial.
      neonA: new MeshStandardMaterial({
        color: "#000000",
        emissive: PALETTE.neonA.clone(),
        emissiveIntensity: 1.4,
      }),
      neonB: new MeshStandardMaterial({
        color: "#000000",
        emissive: PALETTE.neonB.clone(),
        emissiveIntensity: 1.4,
      }),
    };
  }, []);

  const holoMats = useMemo(
    () =>
      [new Color("#4fd8ff"), new Color("#ff8ade")].map(
        (tint) =>
          new ShaderMaterial({
            vertexShader: HOLO_VERT,
            fragmentShader: HOLO_FRAG,
            uniforms: { uTime: { value: 0 }, uTint: { value: tint } },
            transparent: true,
            depthWrite: false,
            side: DoubleSide,
          })
      ),
    []
  );

  const geoms = useMemo(
    () => ({
      wallPanel: new BoxGeometry(1.6, 1.35, 0.07),
      rib: new BoxGeometry(0.22, 0.16, D),
      stripX: new BoxGeometry(W - 0.4, 0.06, 0.06),
      stripZ: new BoxGeometry(0.06, 0.06, D - 0.4),
      ribStrip: new BoxGeometry(0.08, 0.05, D - 0.6),
    }),
    []
  );

  // Neon rides the dial: cozy idle at 1g, full glow at 0g. (Half the reason
  // the spin-down feels like an event.)
  const timeRef = useRef(0);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    timeRef.current += dt;
    const g = useGravity.getState().g;
    const glow = MathUtils.lerp(2.9, 1.3, g);
    mats.neonA.emissiveIntensity = glow;
    mats.neonB.emissiveIntensity = glow * 0.9;
    for (const m of holoMats) m.uniforms.uTime.value = timeRef.current;
  });

  // Panel grid positions for the two side walls + front wall.
  const sidePanels: [number, number][] = [];
  for (let i = 0; i < 5; i++)
    for (let j = 0; j < 3; j++) sidePanels.push([-3.8 + i * 1.9, 1.0 + j * 1.55]);
  const frontPanels: [number, number][] = [];
  for (let i = 0; i < 7; i++)
    for (let j = 0; j < 3; j++) frontPanels.push([-5.7 + i * 1.9, 1.0 + j * 1.55]);

  return (
    <group>
      {/* Deck + ceiling */}
      <mesh ref={registerSurface} material={mats.deck} position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[W, 0.2, D]} />
      </mesh>
      <mesh ref={registerSurface} material={mats.hull} position={[0, H + 0.1, 0]}>
        <boxGeometry args={[W, 0.2, D]} />
      </mesh>

      {/* Side walls (x = ±W/2) with panel grids */}
      {[1, -1].map((s) => (
        <group key={`side${s}`}>
          <mesh
            ref={registerSurface}
            material={mats.hull}
            position={[s * (W / 2 + 0.1), H / 2, 0]}
            receiveShadow
          >
            <boxGeometry args={[0.2, H, D]} />
          </mesh>
          {sidePanels.map(([z, y], i) => (
            <mesh
              key={i}
              geometry={geoms.wallPanel}
              material={mats.panel}
              position={[s * (W / 2 - 0.04), y, z]}
              rotation={[0, s * -Math.PI / 2, 0]}
            />
          ))}
        </group>
      ))}

      {/* Front wall (z = +D/2) with panel grid */}
      <mesh
        ref={registerSurface}
        material={mats.hull}
        position={[0, H / 2, D / 2 + 0.1]}
        receiveShadow
      >
        <boxGeometry args={[W, H, 0.2]} />
      </mesh>
      {frontPanels.map(([x, y], i) => (
        <mesh
          key={`fp${i}`}
          geometry={geoms.wallPanel}
          material={mats.panel}
          position={[x, y, D / 2 - 0.04]}
          rotation={[0, Math.PI, 0]}
        />
      ))}

      {/* Ceiling ribs + their neon under-strips (alternating hues) */}
      {[-6, -3, 0, 3, 6].map((x, i) => (
        <group key={`rib${x}`}>
          <mesh geometry={geoms.rib} material={mats.trim} position={[x, H - 0.08, 0]} />
          <mesh
            geometry={geoms.ribStrip}
            material={i % 2 === 0 ? mats.neonA : mats.neonB}
            position={[x, H - 0.19, 0]}
          />
        </group>
      ))}

      {/* Deck-edge neon perimeter */}
      <mesh geometry={geoms.stripX} material={mats.neonA} position={[0, 0.05, D / 2 - 0.08]} />
      <mesh geometry={geoms.stripX} material={mats.neonA} position={[0, 0.05, -(D / 2 - 0.08)]} />
      <mesh geometry={geoms.stripZ} material={mats.neonB} position={[W / 2 - 0.08, 0.05, 0]} />
      <mesh geometry={geoms.stripZ} material={mats.neonB} position={[-(W / 2 - 0.08), 0.05, 0]} />

      {/* Holo cat-status boards */}
      <mesh material={holoMats[0]} position={[-(W / 2 - 0.3), 2.8, 1.8]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.7, 1.0]} />
      </mesh>
      <mesh material={holoMats[1]} position={[W / 2 - 0.3, 2.6, -1.4]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.5, 0.9]} />
      </mesh>

      {/* Cat tree — trunk + three carpeted platforms (laser targets too) */}
      <group position={[-4.5, 0, -2.5]}>
        <mesh material={mats.trim} position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.55, 0.65, 0.12, 16]} />
        </mesh>
        <mesh material={mats.carpet} position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[0.11, 0.13, 2.4, 12]} />
        </mesh>
        {[
          [0.45, 0.9, 0.1],
          [-0.4, 1.6, -0.15],
          [0.1, 2.3, -0.05],
        ].map(([x, y, z], i) => (
          <mesh
            key={i}
            ref={registerSurface}
            material={mats.carpet}
            position={[x, y, z]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.85, 0.09, 0.65]} />
          </mesh>
        ))}
      </group>

      {/* Wall nap-pods: three half-domes set into the +x wall */}
      {[
        [1.6, 1.0],
        [2.6, -0.6],
        [3.4, 2.4],
      ].map(([y, z], i) => (
        <group key={`pod${i}`} position={[W / 2 - 0.15, y, z]}>
          <mesh material={mats.trim} rotation={[0, 0, Math.PI / 2]}>
            <sphereGeometry args={[0.5, 18, 12, 0, Math.PI]} />
          </mesh>
          <mesh material={i % 2 === 0 ? mats.neonB : mats.neonA} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.5, 0.025, 8, 24]} />
          </mesh>
        </group>
      ))}

      {/* Food station: console + two bowls */}
      <group position={[5.2, 0, 3.6]}>
        <mesh ref={registerSurface} material={mats.trim} position={[0, 0.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.85, 0.16, 0.5]} />
        </mesh>
        <mesh material={mats.panel} position={[0.2, 0.19, 0]}>
          <cylinderGeometry args={[0.12, 0.1, 0.06, 14]} />
        </mesh>
        <mesh material={mats.panel} position={[-0.2, 0.19, 0]}>
          <cylinderGeometry args={[0.12, 0.1, 0.06, 14]} />
        </mesh>
      </group>
    </group>
  );
}
