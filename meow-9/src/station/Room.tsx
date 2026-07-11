import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  Color,
  DoubleSide,
  Group,
  MathUtils,
  MeshBasicMaterial,
  MeshStandardMaterial,
  ShaderMaterial,
  Vector2,
} from "three";
import { ROOM } from "../world/config";
import { PALETTE } from "../world/palettes";
import { useGravity } from "../world/GravityDial";
import { PROFILE } from "../world/device";
import { makeNoiseNormalMap } from "../fx/noiseTextures";
import { makeLabelTexture } from "../fx/labels";
import { registerSurface } from "./surfaces";
import { SCRATCH_POSTS } from "./colliders";
import { CREW, ZONES } from "./crew";

// The hab module: one hero room built entirely from primitives. Panel-grid
// walls, ceiling ribs, neon edge strips, the cat furniture (tree, wall pods,
// food station) — and the duty stations the crew actually works: the command
// console under the porthole, the spin-governor gauge (its needle IS the
// Gravity Dial, diegetically), the med bay, the comms rig, and the glowing
// catnip hydroponics rack. The neon strips are the room's HDR sources — their
// emissive intensity rides the Gravity Dial (spin-down = neon up), which is
// half the payoff of scrubbing the dial.

const { w: W, h: H, d: D } = ROOM;

// Where cats like to be. Walk targets + loaf anchors (floor-level points),
// spread wide on purpose — Cat.tsx crowd-scores its picks so the roster
// distributes across these instead of piling onto the tree corner.
export const CAT_SPOTS: [number, number][] = [
  [-3.4, -2.6], // beside the cat tree (outside its collider)
  [4.4, 3.2], // food station (outside the console collider)
  [0, -2.9], // the command-deck rug, under the porthole
  [-5.8, 3.2],
  [3.5, -3.2], // by the cargo stack
  [-2, 3.8],
  [2.5, 1.5],
  [-3.5, 0.6], // a polite step off scratch post A's doorstep
  [5.6, -1.0], // the med-bay corridor
  [0.8, -0.6], // the middle of the deck is real estate too
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
      // Gray plush + beige sisal, straight from the girls' real cat tree.
      carpet: new MeshStandardMaterial({
        color: "#8f939e",
        roughness: 0.98,
        normalMap: panelNormal,
        normalScale: new Vector2(0.5, 0.5),
      }),
      sisal: new MeshStandardMaterial({
        color: "#c9b088",
        roughness: 0.92,
        normalMap: panelNormal,
        normalScale: new Vector2(0.8, 0.8),
      }),
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
      // Hydroponics grow strips — a deliberate HDR source (they're LAMPS),
      // steady green over the catnip regardless of the dial.
      growLamp: new MeshStandardMaterial({
        color: "#000000",
        emissive: new Color("#8dffb0"),
        emissiveIntensity: 1.3,
      }),
      // The crop itself: gently self-lit catnip, well under the threshold.
      nip: new MeshStandardMaterial({
        color: "#3f7a48",
        roughness: 0.9,
        emissive: new Color("#7dffb0"),
        emissiveIntensity: 0.45,
      }),
    };
  }, []);

  const holoMats = useMemo(
    () =>
      // cyan + pink cat-status boards, and the command console's teal-green.
      [new Color("#4fd8ff"), new Color("#ff8ade"), new Color("#7dffb0")].map(
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

  // Canvas-drawn signage (fx/labels.ts) — the station names itself and its
  // sections, and posts the duty roster. Painted light, not lit slabs.
  // PROFILE.labelScale supersamples the canvases on tablet/desktop.
  const signMats = useMemo(() => {
    const LS = PROFILE.labelScale;
    const mat = (tex: ReturnType<typeof makeLabelTexture>) =>
      new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    return {
      plaque: mat(
        makeLabelTexture(
          [
            { text: "MEOW-9", size: 104, color: "#ff5ecf" },
            { text: "ORBITAL CAT SANCTUARY · HAB 3", size: 30, color: "#5ee9ff", gap: 14 },
          ],
          { width: 1024, height: 256, scale: LS }
        )
      ),
      roster: mat(
        makeLabelTexture(
          [
            { text: "DUTY ROSTER", size: 46, color: "#ffd75e" },
            ...CREW.map((m) => ({
              text: `${m.name} · ${m.title}`,
              size: 30,
              color: m.light,
              gap: 12,
            })),
          ],
          { width: 512, height: 512, scale: LS }
        )
      ),
      command: mat(makeLabelTexture([{ text: "COMMAND", size: 58, color: "#7dffb0" }], { width: 512, height: 128, scale: LS })),
      spin: mat(makeLabelTexture([{ text: "SPIN CONTROL", size: 50, color: "#ff8a3a" }], { width: 512, height: 128, scale: LS })),
      medbay: mat(makeLabelTexture([{ text: "MED BAY", size: 58, color: "#5effc9" }], { width: 512, height: 128, scale: LS })),
      comms: mat(makeLabelTexture([{ text: "COMMS", size: 58, color: "#5ee9ff" }], { width: 512, height: 128, scale: LS })),
      hydro: mat(makeLabelTexture([{ text: "HYDROPONICS", size: 46, color: "#7dffb0" }], { width: 512, height: 128, scale: LS })),
      cargo: mat(
        makeLabelTexture(
          [
            { text: "MEOW-9 LOGISTICS", size: 42, color: "#ffd75e" },
            { text: "TUNA · 24 CT", size: 34, color: "#5ee9ff", gap: 10 },
          ],
          { width: 512, height: 192, scale: LS }
        )
      ),
    };
  }, []);

  // Neon rides the dial: cozy idle at 1g, full glow at 0g. (Half the reason
  // the spin-down feels like an event.) The spin-governor needle rides it
  // too — the wall gauge in engineering IS the Gravity Dial, diegetically.
  const timeRef = useRef(0);
  const spinNeedle = useRef<Group>(null);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    timeRef.current += dt;
    const g = useGravity.getState().g;
    const glow = MathUtils.lerp(2.9, 1.3, g);
    mats.neonA.emissiveIntensity = glow;
    mats.neonB.emissiveIntensity = glow * 0.9;
    for (const m of holoMats) m.uniforms.uTime.value = timeRef.current;
    if (spinNeedle.current) {
      // Full spin sweeps the needle right; the drift lets it fall left.
      spinNeedle.current.rotation.z = MathUtils.lerp(1.35, -1.35, g);
    }
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

      {/* Holo cat-status boards (board A sits forward of the spin gauge —
          they share the -x wall with SPIN CONTROL's signage) */}
      <mesh material={holoMats[0]} position={[-(W / 2 - 0.3), 2.8, 3.5]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.7, 1.0]} />
      </mesh>
      <mesh material={holoMats[1]} position={[W / 2 - 0.3, 2.6, -1.4]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.5, 0.9]} />
      </mesh>

      {/* Cat tree — sisal-wrapped trunk + gray plush platforms, modelled on
          the girls' real tree (laser targets too) */}
      <group position={[-4.5, 0, -2.5]}>
        <mesh material={mats.carpet} position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.55, 0.65, 0.12, 16]} />
        </mesh>
        <mesh material={mats.sisal} position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[0.11, 0.13, 2.4, 12]} />
        </mesh>
        {/* rope-wrap ridges up the trunk */}
        {[0.35, 0.75, 1.15, 1.55, 1.95].map((y) => (
          <mesh key={`wrap${y}`} material={mats.sisal} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.122, 0.012, 6, 18]} />
          </mesh>
        ))}
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

      {/* Scratching posts — sisal columns with plush caps. Cats walk up,
          square off, and rise on their hind legs to get their claws in. */}
      {SCRATCH_POSTS.map(([x, z], i) => (
        <group key={`post${i}`} position={[x, 0, z]}>
          <mesh material={mats.carpet} position={[0, 0.04, 0]} receiveShadow>
            <cylinderGeometry args={[0.27, 0.31, 0.08, 16]} />
          </mesh>
          <mesh ref={registerSurface} material={mats.sisal} position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.09, 0.84, 12]} />
          </mesh>
          {[0.2, 0.36, 0.52, 0.68, 0.84].map((y) => (
            <mesh key={`ring${y}`} material={mats.sisal} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.092, 0.011, 6, 16]} />
            </mesh>
          ))}
          <mesh material={mats.carpet} position={[0, 0.955, 0]} castShadow>
            <cylinderGeometry args={[0.13, 0.13, 0.07, 14]} />
          </mesh>
        </group>
      ))}

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

      {/* ——— The duty stations. Footprints come from ZONES (crew.ts), the
          same source colliders.ts derives the furniture circles from. ——— */}

      {/* COMMAND: the conn under the porthole. Cmdr. Bast sits here and
          watches the whole room on the teal-green status board. */}
      <group position={[ZONES.command.x, 0, ZONES.command.z]}>
        <mesh ref={registerSurface} material={mats.trim} position={[0, 0.3, -0.05]} castShadow receiveShadow>
          <boxGeometry args={[1.7, 0.6, 0.55]} />
        </mesh>
        <mesh material={mats.panel} position={[0, 0.63, 0.14]} rotation={[-0.5, 0, 0]}>
          <boxGeometry args={[1.6, 0.05, 0.42]} />
        </mesh>
        <mesh material={holoMats[2]} position={[0, 1.25, -0.28]} rotation={[-0.08, 0, 0]}>
          <planeGeometry args={[1.5, 0.8]} />
        </mesh>
        {/* console edge-light */}
        <mesh material={mats.neonA} position={[0, 0.615, 0.36]}>
          <boxGeometry args={[1.3, 0.02, 0.03]} />
        </mesh>
      </group>

      {/* ENGINEERING: the spin governor. The wall gauge's needle is driven
          by the ONE GravityDial — Kepler's console reads the real dial. */}
      <group position={[ZONES.engineering.x, 0, ZONES.engineering.z]}>
        <mesh ref={registerSurface} material={mats.trim} position={[-0.12, 0.32, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.55, 0.64, 1.1]} />
        </mesh>
        <mesh material={mats.panel} position={[0.18, 0.62, 0]} rotation={[0, 0, -0.5]}>
          <boxGeometry args={[0.42, 0.05, 1.0]} />
        </mesh>
        <mesh material={mats.neonB} position={[0.34, 0.55, 0]}>
          <boxGeometry args={[0.03, 0.02, 0.85]} />
        </mesh>
      </group>
      <group position={[-(W / 2 - 0.12), 2.05, ZONES.engineering.z]} rotation={[0, Math.PI / 2, 0]}>
        {/* the gauge: trim ring, neon sweep arc, and the live needle */}
        <mesh material={mats.trim}>
          <torusGeometry args={[0.55, 0.045, 10, 40]} />
        </mesh>
        <mesh material={mats.neonB} position={[0, 0, 0.02]}>
          <torusGeometry args={[0.47, 0.016, 6, 32, Math.PI]} />
        </mesh>
        <group ref={spinNeedle} position={[0, 0, 0.04]}>
          <mesh material={mats.neonA} position={[0, 0.2, 0]}>
            <boxGeometry args={[0.03, 0.38, 0.02]} />
          </mesh>
        </group>
        <mesh material={mats.trim} position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.06, 10]} />
        </mesh>
      </group>

      {/* MED BAY: Miso's scanner bed — plush top (a patient must be
          comfortable) under a trim arch with a soft cyan scan ring. */}
      <group position={[ZONES.medbay.x, 0, ZONES.medbay.z]}>
        <mesh material={mats.trim} position={[0, 0.14, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.28, 1.05]} />
        </mesh>
        <mesh ref={registerSurface} material={mats.carpet} position={[0, 0.31, 0]} receiveShadow>
          <boxGeometry args={[0.62, 0.06, 0.95]} />
        </mesh>
        <group position={[0, 0.34, 0]} rotation={[0, Math.PI / 2, 0]}>
          <mesh material={mats.trim}>
            <torusGeometry args={[0.5, 0.035, 8, 24, Math.PI]} />
          </mesh>
          <mesh material={mats.neonB} position={[0, 0, 0.045]}>
            <torusGeometry args={[0.44, 0.014, 6, 20, Math.PI]} />
          </mesh>
        </group>
      </group>

      {/* COMMS: Static's rig on the front wall — console, pink board, and
          an antenna mast with a beacon that pierces the room's dark. */}
      <group position={[ZONES.comms.x, 0, ZONES.comms.z]}>
        <mesh ref={registerSurface} material={mats.trim} position={[0, 0.28, 0.05]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.56, 0.5]} />
        </mesh>
        <mesh material={mats.panel} position={[0, 0.585, -0.12]} rotation={[0.45, 0, 0]}>
          <boxGeometry args={[0.9, 0.05, 0.36]} />
        </mesh>
        <mesh material={holoMats[1]} position={[0, 1.1, -0.24]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.95, 0.6]} />
        </mesh>
        <mesh material={mats.trim} position={[0.42, 1.15, 0.14]} castShadow>
          <cylinderGeometry args={[0.022, 0.032, 1.7, 8]} />
        </mesh>
        <mesh material={mats.neonA} position={[0.42, 2.05, 0.14]}>
          <sphereGeometry args={[0.035, 8, 8]} />
        </mesh>
      </group>

      {/* HYDROPONICS: Clover's catnip rack — two shelves of crop under
          green grow strips (deliberate HDR lamps; the crop glows softly). */}
      <group position={[ZONES.hydroponics.x, 0, ZONES.hydroponics.z]}>
        {[-0.55, 0.55].map((z) => (
          <mesh key={`hp${z}`} material={mats.trim} position={[0, 0.8, z]} castShadow>
            <boxGeometry args={[0.5, 1.6, 0.07]} />
          </mesh>
        ))}
        {[0.5, 1.05].map((y) => (
          <group key={`shelf${y}`}>
            <mesh material={mats.trim} position={[0, y, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.5, 0.05, 1.1]} />
            </mesh>
            <mesh material={mats.panel} position={[0, y + 0.06, 0]}>
              <boxGeometry args={[0.4, 0.08, 1.0]} />
            </mesh>
            <mesh material={mats.growLamp} position={[0.16, y + 0.42, 0]}>
              <boxGeometry args={[0.04, 0.025, 1.0]} />
            </mesh>
            {/* the crop — five tufts a shelf, staggered like a real planting */}
            {[-0.36, -0.18, 0, 0.18, 0.36].map((z, i) => (
              <mesh
                key={`nip${z}`}
                material={mats.nip}
                position={[i % 2 ? 0.07 : -0.07, y + 0.16, z]}
              >
                <coneGeometry args={[0.045, 0.13, 6]} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* CARGO: the resupply stack — someone has to bring the tuna up the
          well. One crate sits askew; nobody on this station re-stacks. */}
      <group position={[ZONES.cargo.x, 0, ZONES.cargo.z]}>
        <mesh ref={registerSurface} material={mats.hull} position={[-0.25, 0.325, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.65, 0.65, 0.65]} />
        </mesh>
        <mesh material={mats.panel} position={[-0.22, 0.9, 0.02]} rotation={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
        </mesh>
        <mesh material={mats.hull} position={[0.45, 0.275, 0.08]} rotation={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.55, 0.55, 0.55]} />
        </mesh>
        <mesh material={mats.neonB} position={[-0.25, 0.52, 0.328]}>
          <boxGeometry args={[0.66, 0.03, 0.012]} />
        </mesh>
        <mesh material={signMats.cargo} position={[-0.25, 0.28, 0.334]}>
          <planeGeometry args={[0.55, 0.21]} />
        </mesh>
      </group>

      {/* ——— Signage. The station names itself: the big plaque over the
          porthole, the duty roster beside the conn, a label per section. ——— */}
      <mesh material={signMats.plaque} position={[0, 4.35, -(D / 2 - 0.06)]}>
        <planeGeometry args={[3.6, 0.9]} />
      </mesh>
      <mesh material={signMats.roster} position={[3.0, 2.5, -(D / 2 - 0.06)]}>
        <planeGeometry args={[1.6, 1.6]} />
      </mesh>
      <mesh material={signMats.command} position={[0, 1.95, -(D / 2 - 0.06)]}>
        <planeGeometry args={[1.15, 0.29]} />
      </mesh>
      <mesh material={signMats.spin} position={[-(W / 2 - 0.09), 3.0, ZONES.engineering.z]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.45, 0.36]} />
      </mesh>
      <mesh material={signMats.hydro} position={[-(W / 2 - 0.09), 2.1, ZONES.hydroponics.z]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.35, 0.34]} />
      </mesh>
      <mesh material={signMats.medbay} position={[W / 2 - 0.09, 1.7, ZONES.medbay.z]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.2, 0.3]} />
      </mesh>
      <mesh material={signMats.comms} position={[ZONES.comms.x, 1.95, D / 2 - 0.09]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.0, 0.25]} />
      </mesh>
    </group>
  );
}
