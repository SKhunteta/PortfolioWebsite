// Platform life: the little crowd that gathers to board. When a train pulls
// in and the station's orb swells on dwell, a scatter of warm figures fades
// up on the paper at that stop; as the train slides away they thin back to an
// empty platform. The crowd is driven straight off the dwell pulse
// Stations.tsx already computes (platformPulse.ts) — the SAME signal that
// derives the live arrivals — so it is automatically honest: full in live and
// simulated mode, and an empty platform when the network rests.
//
// ONE InstancedMesh of view-facing billboards (one draw call): a fixed pool
// of stations × PROFILE.platformMotes, scattered once around each platform
// and lifted to stand ON the paper. The figures never move between stations —
// only their opacity tracks their station's pulse — so the hot path just
// writes one float per figure and nudges the clock uniform; matrices are
// placed once. Sumi-warm pigment, NORMAL-blended (little ochre figures darken
// the bright washi; additive light would die on it) and mixed toward the
// scene fog so a distant crowd dissolves into the kasumi.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { PROFILE } from "../world/device";
import { CONFIG } from "../world/config";
import { PLATFORM_SITES, PLATFORM_PULSE } from "./platformPulse";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "../map/watercolorGlsl";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aSeed;  // per-figure scatter/animation seed
  attribute float aSize;  // per-figure height, km
  attribute float aPulse; // this figure's station dwell pulse (updated per frame)
  uniform float uTime;
  varying vec2 vUv;
  varying float vPulse;
  varying float vSeed;
  void main() {
    vUv = uv;
    vPulse = aPulse;
    vSeed = aSeed;
    vec4 center = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vWorld = center.xz;
    vec4 mv = viewMatrix * center;
    // A crowd shifts its weight: a small bob and sway on the clock, each
    // figure on its own phase so the platform stirs rather than pulses.
    mv.x += sin(uTime * 0.9 + aSeed * 6.283) * 0.004;
    mv.y += sin(uTime * 2.1 + aSeed * 3.14) * 0.005;
    // View-facing billboard, taller than wide, anchored at the feet (uv.y = 0
    // sits on the paper, the figure stands up from there).
    vec2 q = (uv - vec2(0.5, 0.0)) * vec2(aSize * 0.55, aSize);
    mv.xy += q;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying vec2 vUv;
  varying float vPulse;
  varying float vSeed;
  uniform vec3 uWarm;
  uniform float uOpacity;
  void main() {
    // A crowd only reads once its station really hosts a train — a far train
    // grazing the dwell radius shouldn't sketch ghosts on every platform.
    float crowd = smoothstep(0.09, 0.7, vPulse);
    if (crowd < 0.01) discard;
    // A standing figure: a vertical lozenge for the body, a small head above.
    vec2 p = vUv - vec2(0.5, 0.42);
    float body = 1.0 - smoothstep(0.26, 0.62, length(p * vec2(2.3, 1.05)));
    float head = 1.0 - smoothstep(0.06, 0.12, length((vUv - vec2(0.5, 0.82)) * vec2(1.5, 1.1)));
    float fig = clamp(max(body, head * 0.9), 0.0, 1.0);
    if (fig < 0.01) discard;
    // Warm ochre figures, each a touch different in weight, dissolving into
    // the mist at drift distance.
    vec3 c = uWarm * (0.72 + 0.18 * fract(vSeed * 1.37));
    float a = fig * crowd * uOpacity * (0.55 + 0.45 * fract(vSeed)) * (1.0 - fogFactor());
    if (a < 0.004) discard;
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a);
  }
`;

const PER = PROFILE.platformMotes;

// Deterministic 0..1 hash — no Math.random, so reloads lay the crowd out the
// same way every time (the whole scene's determinism rule).
function hash(n: number): number {
  return (Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1;
}
function unit(n: number): number {
  return Math.abs(hash(n));
}

const matrix = new THREE.Matrix4();

export function PlatformLife() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  // Counts are read at RENDER time, not module load: Stations.tsx publishes
  // PLATFORM_SITES during its own render, which runs before this sibling's.
  const SITE_COUNT = PLATFORM_SITES.length;
  const POOL = SITE_COUNT * PER;

  // Static layout: scatter each station's figures in a small disc around its
  // platform, biased toward the entrance. Built once from the published sites.
  const { geometry, pulseAttr, siteOf } = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const seed = new Float32Array(POOL);
    const size = new Float32Array(POOL);
    const pulse = new Float32Array(POOL);
    const siteOf = new Int32Array(POOL);
    // Per-figure identity only; the actual scatter positions are written into
    // the instance matrices on the first frame (the mesh isn't mounted yet).
    let k = 0;
    for (let s = 0; s < SITE_COUNT; s++) {
      for (let m = 0; m < PER; m++) {
        seed[k] = unit(s * 3.1 + m * 1.9);
        size[k] = 0.05 + unit(s * 9.2 + m * 4.4) * 0.035;
        siteOf[k] = s;
        k++;
      }
    }
    const pulseAttr = new THREE.InstancedBufferAttribute(pulse, 1);
    pulseAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
    geometry.setAttribute("aSize", new THREE.InstancedBufferAttribute(size, 1));
    geometry.setAttribute("aPulse", pulseAttr);
    return { geometry, pulseAttr, siteOf };
  }, [SITE_COUNT, POOL]);

  const placed = useRef(false);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || !PLATFORM_PULSE.ready) return;

    // Place the pool once (the mesh exists now; positions never change again).
    if (!placed.current) {
      placed.current = true;
      const radius = CONFIG.station.sealRadiusKm * 0.85;
      let k = 0;
      for (let s = 0; s < SITE_COUNT; s++) {
        const site = PLATFORM_SITES[s];
        for (let m = 0; m < PER; m++) {
          const ang = unit(s * 31.7 + m * 7.13) * Math.PI * 2;
          const rad = Math.sqrt(unit(s * 5.3 + m * 2.9)) * radius;
          matrix.makeTranslation(
            site.x + Math.cos(ang) * rad,
            site.y,
            site.z + Math.sin(ang) * rad
          );
          mesh.setMatrixAt(k, matrix);
          k++;
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    // Per-frame: each figure inherits its station's live dwell pulse.
    const pulses = PLATFORM_PULSE.value;
    for (let k = 0; k < POOL; k++) pulseAttr.setX(k, pulses[siteOf[k]] ?? 0);
    pulseAttr.needsUpdate = true;

    const mat = mesh.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = CLOCK.t;
    mat.uniforms.uFogDensity.value = LIVE.fogDensity;
  });

  if (POOL === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, POOL]}
      geometry={geometry}
      renderOrder={6.9}
      frustumCulled={false}
    >
      <shaderMaterial
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uWarm: { value: LIVE.station }, // palette-by-reference: persimmon by day, amber by night
          uOpacity: { value: 0.85 },
          uTime: { value: 0 },
          uFog: { value: LIVE.fog },
          uFogDensity: { value: LIVE.fogDensity },
        }}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}
