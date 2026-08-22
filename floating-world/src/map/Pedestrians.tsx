// The surface crowd — the anonymous townsfolk that a ukiyo-e streetscape is
// built on. The print had rich life underground (the deep-platform crowds) and
// at the station platforms, plus the six named Heroes at their scenic
// overlooks, but the SURFACE CITY BETWEEN stations was silent: cars and
// cyclists on the roads, and almost no walking people on the sidewalks. This
// layer fills the walks — many small, plain figures, concentrated downtown and
// thinning to the edges the way real foot traffic does, each ambling a short
// stretch of its own sidewalk.
//
// The cast is deliberately anonymous and plainer than the Heroes (no big
// signature props): a walker, one carrying a furoshiki bundle, one under a
// small parasol, a shoulder-pole peddler (tenbin), and a shorter child — so the
// crowd reads as townsfolk, not protagonists. They complement the six Heroes,
// never compete with them.
//
// ONE InstancedMesh of upright camera-facing billboards (one draw call, the
// same cylindrical-billboard trick the Heroes and firs use); every figure is
// drawn procedurally in the fragment shader keyed off a per-figure archetype.
// The AMBLE is baked entirely into the vertex shader — a bounded back-and-forth
// pace along the figure's own sidewalk tangent plus a footstep bob — so the hot
// path writes matrices only once and a figure can never wander onto the road.
// Normal-blended pigment (townsfolk darken the bright washi like the riders and
// the ink), mixed toward the scene fog so a distant figure dissolves into the
// kasumi, and thinned overnight by the real Seattle hour (world/traffic.ts)
// exactly like the street cars. No painted HDR — the crowd never ignites bloom.
//
// RAIN raises UMBRELLAS — Hiroshige's move (Sudden Shower over Shin-Ōhashi):
// when the real WEATHER.rain washes in, the walkers, bundle-carriers and
// children sprout paper-umbrella domes over their heads, each figure raising
// its own at a seeded threshold so the street blooms with canopies as the
// shower deepens rather than snapping open in lockstep. The peddler keeps
// working bare-headed (both hands on the tenbin), and the parasol figure
// already carries one. Same honesty tier as the wet-paper washes: the eased
// real-rain signal, never an invented shower. Zero extra draw cost — the
// umbrella is a few more strokes in the same fragment shader.
// renderOrder 6.4 — in front of the woodblock town (6.2), under the platform
// crowd (6.9) and the Heroes (6.95). depthWrite false.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LIVE } from "../world/palettes";
import { CLOCK } from "../world/clock";
import { CONFIG } from "../world/config";
import { PROFILE } from "../world/device";
import { trafficIntensity } from "../world/traffic";
import { WEATHER } from "../world/weather";
import { sampleRoadFrontages, isWater, mulberry32 } from "./scatter";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";
import { PAPER_CUT_GLSL } from "./paperCutGlsl";
import { PAPER_CUT_VEC } from "./paperCut";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aArch;   // which townsperson
  attribute float aSeed;   // per-figure variation / gait phase
  attribute vec2 aTan;     // unit along-sidewalk tangent (world xz), the pacing axis
  uniform float uTime;
  varying vec2 vUv;
  varying float vArch;
  varying float vSeed;
  void main() {
    vUv = uv;
    vArch = aArch;
    vSeed = aSeed;
    // The figure's ground anchor, then the amble: a bounded triangle-wave pace
    // back and forth ALONG the sidewalk tangent, so it walks a short stretch and
    // returns — never an unbounded advance that would drift onto the road or off
    // the map. Each figure paces on its own phase/speed/stride so the crowd
    // never marches in lockstep.
    vec3 base = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
    float w = length(vec3(instanceMatrix[0]));
    float h = length(vec3(instanceMatrix[1]));
    float sp = 0.14 + 0.16 * fract(aSeed * 17.0);        // pacing speed
    float phase = uTime * sp + aSeed * 6.2831;
    float stride = mix(1.8, 3.6, fract(aSeed * 31.0)) * h; // pace length in km, ∝ height
    float tri = abs(fract(phase) * 2.0 - 1.0) * 2.0 - 1.0; // -1..1 triangle
    base.xz += aTan * (tri * stride * 0.5);
    // Upright cylindrical billboard: the figure turns to face the drift camera
    // about Y, so it never foreshortens to a sliver at the drift angle.
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 toCam = cameraPosition - base;
    toCam.y = 0.0;
    vec3 right = normalize(cross(up, toCam));
    // A footstep bob (several steps per pace) and a fainter weight-shift sway.
    float bob = abs(sin(phase * 25.13)) * h * 0.03;
    float sway = sin(uTime * 0.7 + aSeed * 6.2831) * h * 0.025;
    vec3 world = base + right * ((uv.x - 0.5) * w + sway) + up * (uv.y * h + bob);
    vWorld = world.xz;
    vec4 mv = viewMatrix * vec4(world, 1.0);
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  ${PAPER_CUT_GLSL}
  varying vec2 vUv;
  varying float vArch;
  varying float vSeed;
  uniform vec3 uWarm;      // head/skin — persimmon by day, amber by night (by reference)
  uniform vec3 uInk;       // sumi ink — poles, straps (contrast-flips with the palette)
  uniform vec3 uIndigo;    // ai-blue garment
  uniform vec3 uVermilion; // vermilion garment
  uniform vec3 uStraw;     // pale straw — bundles, parasols, loads
  uniform vec3 uSaffron;   // warm ochre garment
  uniform float uOpacity;
  uniform float uRain;     // eased real rain (world/weather.ts) — raises the umbrellas

  float ell(vec2 p, vec2 c, vec2 r) { return 1.0 - smoothstep(0.86, 1.02, length((p - c) / r)); }
  float seg(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return 1.0 - smoothstep(r * 0.35, r, length(pa - ba * h));
  }
  // A kimono column: soft feet, a slightly wider hem, narrowing to the shoulder.
  float kimono(vec2 p, float cx, float hem, float topY) {
    float halfw = mix(hem, 0.07, smoothstep(0.0, topY, p.y));
    float c = 1.0 - smoothstep(halfw, halfw + 0.02, abs(p.x - cx));
    c *= smoothstep(topY + 0.04, topY, p.y); // soft shoulders
    c *= smoothstep(0.0, 0.03, p.y);         // soft feet
    return clamp(c, 0.0, 1.0);
  }

  void main() {
    int arch = int(vArch + 0.5);
    float m = 0.0; // silhouette coverage
    vec2 p = vUv;
    // Each figure wears one garment pigment off its seed, so the crowd has
    // woodblock colour variety without any one figure stealing focus.
    float g = fract(vSeed * 13.0);
    vec3 garb = g < 0.30 ? uIndigo : g < 0.54 ? uVermilion : g < 0.76 ? uSaffron : g < 0.90 ? uStraw : uInk;
    vec3 head = uWarm * 0.92;
    vec3 col = garb * (0.82 + 0.14 * fract(vSeed * 3.1));
    // Which figures may raise an umbrella when the rain comes, and where the
    // canopy sits: the peddler's hands are full (the tenbin), and the parasol
    // figure already carries one.
    float umb = 0.0;
    vec2 uc = vec2(0.5, 0.80);
    float us = 1.0;

    if (arch == 0) {
      // WALKER — the baseline citizen: a plain kimono and a clear head.
      float body = kimono(p, 0.5, 0.12, 0.52);
      float hd = ell(p, vec2(0.5, 0.60), vec2(0.085, 0.10));
      col = mix(col, garb, body);
      col = mix(col, head, hd);
      m = max(body, hd);
      umb = 1.0;
    } else if (arch == 1) {
      // BUNDLE-CARRIER — a walker with a furoshiki bundle held at the side.
      float body = kimono(p, 0.46, 0.12, 0.52);
      float hd = ell(p, vec2(0.46, 0.60), vec2(0.083, 0.098));
      float strap = seg(p, vec2(0.46, 0.44), vec2(0.70, 0.36), 0.012);
      float bundle = ell(p, vec2(0.72, 0.32), vec2(0.10, 0.085));
      col = mix(col, garb, body);
      col = mix(col, head, hd);
      col = mix(col, uInk, strap * 0.8);
      col = mix(col, uStraw, bundle);
      m = max(max(body, hd), max(strap, bundle));
      umb = 1.0;
      uc.x = 0.46;
    } else if (arch == 2) {
      // SMALL PARASOL — a walker under a modest parasol (kept clearly smaller
      // than a Hero's big wagasa so it never reads as a protagonist).
      float body = kimono(p, 0.5, 0.12, 0.50);
      float hd = ell(p, vec2(0.5, 0.58), vec2(0.083, 0.098));
      float pole = seg(p, vec2(0.5, 0.80), vec2(0.5, 0.46), 0.016);
      float dome = ell(p, vec2(0.5, 0.81), vec2(0.24, 0.10));
      col = mix(col, garb, body);
      col = mix(col, head, hd);
      col = mix(col, uInk, pole * 0.9);
      col = mix(col, g < 0.5 ? uVermilion : uIndigo, dome);
      m = max(max(body, hd), max(pole, dome));
    } else if (arch == 3) {
      // PEDDLER — a shoulder-pole (tenbin) across the shoulders, a small load
      // swinging at each end.
      float body = kimono(p, 0.5, 0.13, 0.50);
      float hd = ell(p, vec2(0.5, 0.58), vec2(0.083, 0.098));
      float pole = seg(p, vec2(0.20, 0.58), vec2(0.80, 0.58), 0.013);
      float l1 = ell(p, vec2(0.20, 0.46), vec2(0.075, 0.085));
      float l2 = ell(p, vec2(0.80, 0.46), vec2(0.075, 0.085));
      col = mix(col, garb, body);
      col = mix(col, head, hd);
      col = mix(col, uInk, pole * 0.9);
      col = mix(col, uStraw, max(l1, l2));
      m = max(max(body, hd), max(pole, max(l1, l2)));
    } else {
      // CHILD — a shorter figure: the silhouette sits lower in the billboard, so
      // it reads as small next to the grown townsfolk beside it.
      float body = kimono(p, 0.5, 0.10, 0.36);
      float hd = ell(p, vec2(0.5, 0.44), vec2(0.072, 0.086));
      col = mix(col, g < 0.5 ? uVermilion : uStraw, body); // kids in the bright pigments
      col = mix(col, head, hd);
      m = max(body, hd);
      umb = 1.0;
      uc = vec2(0.5, 0.62);
      us = 0.78;
    }

    // The sudden shower's umbrellas: each figure raises its own once the
    // eased rain crosses its seeded threshold, so a drizzle lifts only the
    // keenest canopies and a downpour blooms the whole street with them.
    float raise = umb * smoothstep(0.0, 0.22, uRain - (0.08 + 0.55 * fract(vSeed * 23.0)));
    if (raise > 0.004) {
      float pole = seg(p, vec2(uc.x + 0.01, uc.y - 0.02), vec2(uc.x + 0.02, uc.y - 0.30 * us), 0.015);
      float dome = ell(p, uc, vec2(0.26, 0.105) * us);
      // A paper canopy off the figure's own seed — janome vermilion most
      // often, indigo and oiled straw behind it, the odd sumi one.
      float gu = fract(vSeed * 29.0);
      vec3 canopy = gu < 0.42 ? uVermilion : gu < 0.72 ? uIndigo : gu < 0.92 ? uStraw : uInk;
      col = mix(col, uInk, pole * 0.9 * raise);
      col = mix(col, canopy, dome * raise);
      m = max(m, max(dome, pole) * raise);
    }

    if (m < 0.01) discard;
    // A walker on carved-away paper steps aside with it (the dive incision).
    float a = m * uOpacity * (1.0 - fogFactor()) * cutKeep(vWorld);
    if (a < 0.004) discard;
    gl_FragColor = vec4(mix(col, uFog, fogFactor()), a);
  }
`;

const WALKER = 0,
  BUNDLE = 1,
  PARASOL = 2,
  PEDDLER = 3,
  CHILD = 4;
const ARCH_COUNT = 5;

const HEART = { x: CONFIG.camera.heartX, z: CONFIG.camera.heartZ };

// How the crowd concentrates: a Gaussian density falloff from the downtown
// heart (busy core, thinning to the edges) with a small floor so the outer
// streets still get an occasional walker. R is the ~1/e radius in km.
const DENSITY_R = 2.4;
const DENSITY_FLOOR = 0.05;
// A touch further out along the frontage normal so a figure stands ON the walk,
// just clear of the road's ink stroke.
const WALK_OFFSET_KM = 0.012;

interface Ped {
  x: number;
  z: number;
  tx: number; // along-sidewalk tangent (unit)
  tz: number;
  arch: number;
  h: number;
  seed: number;
}

// Build the crowd once: sample sidewalk frontage points, weight them toward
// downtown, deterministically thin (seeded RNG — no Math.random, the scene's
// determinism rule) and trim to the tier's budget. Pure one-time cost at init.
function buildCrowd(count: number): Ped[] {
  if (count <= 0) return [];
  const rng = mulberry32(0x5eed_1a7e);
  const frontages = sampleRoadFrontages(0.06, 0.02);
  const chosen: Ped[] = [];
  for (const f of frontages) {
    const x = f.x + f.nx * WALK_OFFSET_KM;
    const z = f.z + f.nz * WALK_OFFSET_KM;
    if (isWater(x, z)) continue;
    const dx = x - HEART.x;
    const dz = z - HEART.z;
    const d = Math.hypot(dx, dz);
    const weight = Math.max(DENSITY_FLOOR, Math.exp(-((d / DENSITY_R) ** 2)));
    // Draw the roll regardless of the branch below so iteration order — and thus
    // the whole layout — stays stable across reloads.
    const roll = rng();
    if (roll > weight) continue;
    // The pacing axis runs ALONG the road: perpendicular to the outward normal.
    chosen.push({
      x,
      z,
      tx: -f.nz,
      tz: f.nx,
      arch: Math.floor(rng() * ARCH_COUNT) % ARCH_COUNT,
      h: 0.055 + 0.03 * rng(), // storybook-tiny, about a platform mote
      seed: rng(),
    });
  }
  // Deterministic Fisher–Yates shuffle, then trim — a weighted-random subset of
  // the sidewalks, densest downtown.
  for (let i = chosen.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = chosen[i];
    chosen[i] = chosen[j];
    chosen[j] = t;
  }
  if (chosen.length > count) chosen.length = count;
  return chosen;
}

export function Pedestrians() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { count, matrices, archAttr, seedAttr, tanAttr } = useMemo(() => {
    const crowd = buildCrowd(PROFILE.pedestrianCount);
    const mats: THREE.Matrix4[] = [];
    const archs: number[] = [];
    const seeds: number[] = [];
    const tans: number[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    crowd.forEach((c) => {
      pos.set(c.x, 0.02, c.z);
      scl.set(c.h * 0.8, c.h, 1);
      m.compose(pos, q, scl);
      mats.push(m.clone());
      archs.push(c.arch);
      seeds.push(c.seed);
      tans.push(c.tx, c.tz);
    });
    return {
      count: mats.length,
      matrices: mats,
      archAttr: new THREE.InstancedBufferAttribute(new Float32Array(archs), 1),
      seedAttr: new THREE.InstancedBufferAttribute(new Float32Array(seeds), 1),
      tanAttr: new THREE.InstancedBufferAttribute(new Float32Array(tans), 2),
    };
  }, []);

  const placed = useRef(false);
  useFrame(() => {
    const mesh = meshRef.current;
    const mat = materialRef.current;
    if (!mesh) return;
    if (!placed.current) {
      placed.current = true;
      for (let i = 0; i < count; i++) mesh.setMatrixAt(i, matrices[i]);
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (mat) {
      mat.uniforms.uTime.value = CLOCK.t;
      // Sidewalks thin overnight and swell by day, keyed to the real Seattle
      // hour — the same honesty tier as the street cars and cyclists. A small
      // floor keeps a few walkers about even at 3am so the town is never dead.
      mat.uniforms.uOpacity.value = 0.92 * (0.2 + 0.8 * trafficIntensity());
      mat.uniforms.uFogDensity.value = LIVE.fogDensity;
      // The eased real-rain signal raises the umbrellas (staggered per figure
      // in the shader) — the same honest wash that darkens the paper.
      mat.uniforms.uRain.value = WEATHER.rain;
    }
  });

  if (!count) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      renderOrder={6.4}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]}>
        <primitive object={archAttr} attach="attributes-aArch" />
        <primitive object={seedAttr} attach="attributes-aSeed" />
        <primitive object={tanAttr} attach="attributes-aTan" />
      </planeGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uWarm: { value: LIVE.station }, // palette-by-reference: day↔night for free
          uInk: { value: LIVE.label },
          uIndigo: { value: new THREE.Color("#2f4d78") },
          uVermilion: { value: new THREE.Color("#c1432f") },
          uStraw: { value: new THREE.Color("#d8c48a") },
          uSaffron: { value: new THREE.Color("#c98a3a") },
          uOpacity: { value: 0.9 },
          uRain: { value: 0 },
          uTime: { value: 0 },
          uCut: { value: PAPER_CUT_VEC }, // shared cut signal, by reference
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
