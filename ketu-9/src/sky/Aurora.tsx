import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  ShaderMaterial,
} from "three";
import { useWorldClock } from "../world/WorldClock";
import { dayness } from "../world/sun";
import { PALETTE } from "../world/palettes";

// The aurora — the light the Long Dark is lit by (canon). Three big curtain
// ribbons hang over the coast on serpentine paths; the shader does all the
// motion: vertical rays slide along each curtain at two speeds while a slow
// envelope makes whole sections bloom and die. Sharp emerald lower border
// fading through violet at the top — the classic curtain profile. Additive,
// no depth write, faded entirely out by dayness() — in the Bright there is
// simply no night sky for it to live in.
//
// Same raw-GLSL WebGL path as the atmosphere/waterfalls (renderer note in
// CLAUDE.md) — and cheap: ~600 triangles and a small fragment shader, fine
// for the touch profile.

const auroraVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const auroraFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uSeed;
  uniform vec3 uColorLow;
  uniform vec3 uColorHigh;

  float hash(float p) { return fract(sin(p * 127.1 + uSeed) * 43758.5453123); }
  float noise1(float p) {
    float i = floor(p);
    float f = fract(p);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), u);
  }

  void main() {
    float u = vUv.x;
    float v = vUv.y;

    // Rays: two ridged noise layers sliding along the curtain in opposite
    // directions — the picket-fence structure of a real aurora.
    float r1 = noise1(u * 34.0 + uTime * 0.11);
    float r2 = noise1(u * 90.0 - uTime * 0.23 + 13.7);
    float rays = pow(0.55 * r1 + 0.45 * r2, 2.2);

    // Activity envelope: whole sections of the curtain bloom and die slowly.
    float env = 0.35 + 0.65 * noise1(u * 3.0 + uTime * 0.045);

    // Vertical profile: hard emerald hem at the bottom, long violet fade up.
    float hem = smoothstep(0.0, 0.06, v) * (1.0 - smoothstep(0.05, 0.28, v) * 0.35);
    float fadeUp = pow(1.0 - v, 1.7);
    float profile = hem * fadeUp;

    // Ends feather out so the ribbon never shows a cut edge.
    float ends = smoothstep(0.0, 0.06, u) * smoothstep(1.0, 0.94, u);

    vec3 col = mix(uColorLow, uColorHigh, smoothstep(0.05, 0.75, v));
    float a = rays * env * profile * ends * uOpacity;
    // Additive blending multiplies rgb by alpha at the blend stage — don't
    // pre-multiply here too, or the curtain dims quadratically.
    gl_FragColor = vec4(col * 2.4, a);
  }
`;

interface RibbonSpec {
  /** Serpentine path center + heading. */
  cx: number;
  cz: number;
  yaw: number;
  length: number;
  base: number; // altitude of the lower hem
  height: number;
  sway: number; // serpentine amplitude
  seed: number;
}

const RIBBONS: RibbonSpec[] = [
  // The main curtain hangs over the wolf bench — the Dark shots stare up it.
  { cx: -300, cz: -1600, yaw: 0.9, length: 5200, base: 700, height: 650, sway: 420, seed: 3.1 },
  { cx: 400, cz: 300, yaw: -0.5, length: 4400, base: 950, height: 560, sway: 300, seed: 17.9 },
  { cx: -1700, cz: -400, yaw: 1.4, length: 4000, base: 1150, height: 480, sway: 520, seed: 41.3 },
];

/** A vertical ribbon standing on a serpentine path — a curtain, not a wall. */
function buildRibbon(spec: RibbonSpec): BufferGeometry {
  const SEGS = 96;
  const positions = new Float32Array((SEGS + 1) * 2 * 3);
  const uvs = new Float32Array((SEGS + 1) * 2 * 2);
  const cosY = Math.cos(spec.yaw);
  const sinY = Math.sin(spec.yaw);

  for (let i = 0; i <= SEGS; i++) {
    const u = i / SEGS;
    const along = (u - 0.5) * spec.length;
    // Two sine octaves make the path serpentine rather than bowed.
    const across =
      Math.sin(u * Math.PI * 2 * 1.3 + spec.seed) * spec.sway +
      Math.sin(u * Math.PI * 2 * 3.1 + spec.seed * 2.7) * spec.sway * 0.35;
    const x = spec.cx + along * cosY - across * sinY;
    const z = spec.cz + along * sinY + across * cosY;
    for (let j = 0; j < 2; j++) {
      const k = (i * 2 + j) * 3;
      positions[k] = x;
      positions[k + 1] = spec.base + j * spec.height;
      positions[k + 2] = z;
      uvs[(i * 2 + j) * 2] = u;
      uvs[(i * 2 + j) * 2 + 1] = j;
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < SEGS; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

export function Aurora() {
  const group = useRef<Group>(null);

  const ribbons = useMemo(
    () =>
      RIBBONS.map((spec) => ({
        geometry: buildRibbon(spec),
        material: new ShaderMaterial({
          vertexShader: auroraVertex,
          fragmentShader: auroraFragment,
          uniforms: {
            uTime: { value: 0 },
            uOpacity: { value: 0 },
            uSeed: { value: spec.seed },
            uColorLow: { value: new Color(PALETTE.aurora) },
            uColorHigh: { value: new Color("#7a5cff") },
          },
          transparent: true,
          depthWrite: false,
          side: DoubleSide,
          blending: AdditiveBlending,
        }),
      })),
    []
  );

  useFrame((state) => {
    const d = dayness(useWorldClock.getState().phase);
    const strength = Math.pow(1 - d, 2); // only the true Dark gets curtains
    if (group.current) group.current.visible = strength > 0.02;
    for (const r of ribbons) {
      r.material.uniforms.uTime.value = state.clock.elapsedTime;
      r.material.uniforms.uOpacity.value = strength;
    }
  });

  return (
    <group ref={group}>
      {ribbons.map((r, i) => (
        <mesh key={i} geometry={r.geometry} material={r.material} frustumCulled={false} />
      ))}
    </group>
  );
}
