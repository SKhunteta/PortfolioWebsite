// The hero cast — a handful of individual, obvious ukiyo-e characters posed at
// signature Seattle spots, each hand-drawn and clearly recognisable, so the
// print has protagonists and not just the anonymous platform crowd. Ambient
// deterministic life like the ferries and the Needle beacon: always present,
// the same figures every visit, no live data behind them (they never pretend to
// be — they're characters in the scene, the way the toy ferries are).
//
// The cast, each a distinct silhouette read off its props:
//   • a bijin under a wagasa gazing from the Queen Anne overlook;
//   • a straw-hatted Tōkaidō traveller with staff and bindle in Pike Place;
//   • a broad-hatted fisherman casting a line at the Ballard Locks;
//   • a kite-flyer on the Gas Works hill — the kite up by day, a paper lantern
//     in hand by night (honest like the birds: kites only fly in daylight);
//   • a pilgrim monk with a ringed shakujō staff among the Arboretum green;
//   • two lovers sharing one umbrella (aiaigasa) on the Green Lake path.
// The road-folk (traveller, fisherman, monk) light a hand lantern after dark.
//
// ONE InstancedMesh of upright camera-facing billboards (one draw call, the
// same cylindrical-billboard trick the firs and blossoms use); every figure,
// hat, parasol, staff, kite and lantern is drawn procedurally in the fragment
// shader keyed off a per-figure archetype, so the whole cast costs no extra
// draws. Normal-blended pigment (the figures darken the bright washi like real
// ink) with the lantern cores painted HDR so the bloom skirt catches them after
// dark, and everything mixed toward the scene fog so a distant character
// dissolves into the kasumi. renderOrder 6.95 — a hair over the platform crowd
// (6.9), under the station orbs (7). depthWrite false.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LIVE } from "../world/palettes";
import { CLOCK } from "../world/clock";
import { CONFIG } from "../world/config";
import { sunPhase } from "../world/sun";
import { projectLatLng } from "./network";
import { isWater } from "./scatter";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aArch;   // which character
  attribute float aSeed;   // per-figure variation / animation phase
  uniform float uTime;
  varying vec2 vUv;
  varying float vArch;
  varying float vSeed;
  void main() {
    vUv = uv;
    vArch = aArch;
    vSeed = aSeed;
    // Upright cylindrical billboard: the figure stands on the paper and turns to
    // face the drift camera about Y, so a character never foreshortens to a
    // sliver at the drift angle.
    vec3 base = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
    float w = length(vec3(instanceMatrix[0]));
    float h = length(vec3(instanceMatrix[1]));
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 toCam = cameraPosition - base;
    toCam.y = 0.0;
    vec3 right = normalize(cross(up, toCam));
    // A living stillness: a slow weight-shift sway and a fainter bob, each on
    // the figure's own phase, so the cast breathes rather than stands frozen.
    float sway = sin(uTime * 0.55 + aSeed * 6.283) * 0.010;
    float bob = sin(uTime * 1.7 + aSeed * 3.14) * 0.004;
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
  varying vec2 vUv;
  varying float vArch;
  varying float vSeed;
  uniform vec3 uWarm;      // figure base pigment — persimmon by day, amber by night (by reference)
  uniform vec3 uSumi;      // ink — staff, pole, rod, line
  uniform vec3 uStraw;     // pale straw hat
  uniform vec3 uIndigo;    // ai-blue garment / parasol
  uniform vec3 uVermilion; // vermilion garment / parasol / kite
  uniform vec3 uSaffron;   // monk robe
  uniform vec3 uLantern;   // paper-lantern gold (painted HDR after dark)
  uniform float uDay;      // sunPhase: 1 day, 0 night
  uniform float uTime;
  uniform float uOpacity;

  float ell(vec2 p, vec2 c, vec2 r) { return 1.0 - smoothstep(0.86, 1.02, length((p - c) / r)); }
  float seg(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return 1.0 - smoothstep(r * 0.35, r, length(pa - ba * h));
  }
  float diamond(vec2 p, vec2 c, vec2 r) {
    vec2 d = abs(p - c) / r;
    return 1.0 - smoothstep(0.9, 1.05, d.x + d.y);
  }
  // A kimono column: soft feet, a slightly wider hem, narrowing to the shoulder.
  float kimono(vec2 p, float cx, float hem, float topY) {
    float halfw = mix(hem, 0.075, smoothstep(0.0, topY, p.y));
    float c = 1.0 - smoothstep(halfw, halfw + 0.02, abs(p.x - cx));
    c *= smoothstep(topY + 0.04, topY, p.y); // soft shoulders
    c *= smoothstep(0.0, 0.03, p.y);         // soft feet
    return clamp(c, 0.0, 1.0);
  }
  // A broad conical straw hat (kasa): a soft triangle capping the head.
  float kasa(vec2 p, float cx, float baseY, float apexY, float halfBase) {
    float hw = halfBase * clamp((apexY - p.y) / (apexY - baseY), 0.0, 1.0);
    float c = 1.0 - smoothstep(hw, hw + 0.02, abs(p.x - cx));
    c *= smoothstep(baseY - 0.02, baseY + 0.01, p.y) * smoothstep(apexY + 0.02, apexY - 0.01, p.y);
    return clamp(c, 0.0, 1.0);
  }

  void main() {
    int arch = int(vArch + 0.5);
    float night = 1.0 - uDay;
    vec3 col = uWarm * (0.80 + 0.14 * fract(vSeed * 3.1));
    float m = 0.0;    // silhouette coverage
    float glow = 0.0; // HDR (lantern) coverage that should survive to bloom
    vec2 p = vUv;
    vec3 accent = fract(vSeed * 7.0) < 0.5 ? uIndigo : uVermilion;

    if (arch == 0) {
      // BIJIN under a wagasa — a slim figure, an obi sash, a parasol overhead.
      float body = kimono(p, 0.5, 0.11, 0.60);
      float head = ell(p, vec2(0.5, 0.69), vec2(0.072, 0.086));
      float obi = (1.0 - smoothstep(0.03, 0.05, abs(p.y - 0.44))) * step(abs(p.x - 0.5), 0.12);
      float pole = seg(p, vec2(0.5, 0.90), vec2(0.5, 0.44), 0.010);
      float dome = ell(p, vec2(0.5, 0.90), vec2(0.30, 0.115));
      col = mix(col, accent * 0.9, body);
      col = mix(col, uWarm * 0.92, head);
      col = mix(col, uSumi, obi * 0.85);
      col = mix(col, uSumi, pole * 0.9);
      col = mix(col, fract(vSeed * 7.0) < 0.5 ? uVermilion : uIndigo, dome);
      m = max(max(body, head), max(max(obi, pole), dome));
    } else if (arch == 1) {
      // TRAVELLER — kasa hat, walking staff and bindle; a lantern after dark.
      float body = kimono(p, 0.47, 0.12, 0.60);
      float head = ell(p, vec2(0.47, 0.69), vec2(0.072, 0.086));
      float hat = kasa(p, 0.47, 0.74, 0.90, 0.24);
      float staff = seg(p, vec2(0.72, 0.05), vec2(0.72, 0.82), 0.010);
      float bindle = ell(p, vec2(0.72, 0.80), vec2(0.05, 0.045));
      col = mix(col, uIndigo * 0.92, body);
      col = mix(col, uWarm * 0.92, head);
      col = mix(col, uStraw, hat);
      col = mix(col, uSumi, staff * 0.9);
      col = mix(col, uStraw * 0.8, bindle);
      m = max(max(body, head), max(hat, max(staff, bindle)));
      float lant = ell(p, vec2(0.24, 0.42), vec2(0.05, 0.066)) * step(0.05, night);
      float str = seg(p, vec2(0.33, 0.52), vec2(0.24, 0.48), 0.008) * step(0.05, night);
      col = mix(col, uSumi, str * 0.8);
      col = mix(col, uLantern * mix(0.5, 3.0, night), lant);
      m = max(m, max(lant, str));
      glow = lant * night;
    } else if (arch == 2) {
      // FISHERMAN — a broad hat, a long rod and a line down to the water.
      float body = kimono(p, 0.42, 0.13, 0.55);
      float head = ell(p, vec2(0.42, 0.63), vec2(0.072, 0.084));
      float hat = kasa(p, 0.42, 0.66, 0.82, 0.27);
      float rod = seg(p, vec2(0.50, 0.40), vec2(0.93, 0.92), 0.009);
      float line = seg(p, vec2(0.93, 0.92), vec2(0.93, 0.06), 0.004) * 0.75;
      col = mix(col, uStraw * 0.85, body);
      col = mix(col, uWarm * 0.92, head);
      col = mix(col, uStraw, hat);
      col = mix(col, uSumi, rod * 0.9);
      col = mix(col, uSumi, line * 0.7);
      m = max(max(body, head), max(hat, max(rod, line)));
      float lant = ell(p, vec2(0.20, 0.40), vec2(0.048, 0.063)) * step(0.05, night);
      col = mix(col, uLantern * mix(0.5, 3.0, night), lant);
      m = max(m, lant);
      glow = lant * night;
    } else if (arch == 3) {
      // KITE-FLYER — the kite rides high by day; by night it becomes a lantern.
      float body = kimono(p, 0.45, 0.12, 0.60);
      float head = ell(p, vec2(0.45, 0.69), vec2(0.072, 0.086));
      col = mix(col, accent * 0.9, body);
      col = mix(col, uWarm * 0.92, head);
      m = max(body, head);
      // Day: string + diamond kite drifting on the wind.
      vec2 kc = vec2(0.86 + 0.03 * sin(uTime * 0.7 + vSeed * 5.0), 0.94 + 0.03 * sin(uTime * 0.9));
      float string = seg(p, vec2(0.55, 0.55), kc, 0.005) * uDay;
      float kite = diamond(p, kc, vec2(0.075, 0.10)) * uDay;
      float tail = (diamond(p, kc + vec2(0.0, -0.10), vec2(0.02, 0.025))
                  + diamond(p, kc + vec2(0.0, -0.16), vec2(0.016, 0.02))) * uDay;
      col = mix(col, uSumi, string * 0.8);
      col = mix(col, uVermilion, kite);
      col = mix(col, uIndigo, tail);
      m = max(m, max(string, max(kite, tail)));
      // Night: a lantern in hand instead.
      float lant = ell(p, vec2(0.66, 0.46), vec2(0.05, 0.066)) * step(0.05, night);
      float str = seg(p, vec2(0.56, 0.54), vec2(0.66, 0.52), 0.008) * step(0.05, night);
      col = mix(col, uSumi, str * 0.8);
      col = mix(col, uLantern * mix(0.5, 3.0, night), lant);
      m = max(m, max(lant, str));
      glow = lant * night;
    } else if (arch == 4) {
      // PILGRIM MONK — a wide robe, a round hat, a ringed shakujō staff.
      float body = kimono(p, 0.47, 0.20, 0.62);
      float head = ell(p, vec2(0.47, 0.71), vec2(0.070, 0.084));
      float hat = ell(p, vec2(0.47, 0.76), vec2(0.16, 0.055));
      float staff = seg(p, vec2(0.74, 0.05), vec2(0.74, 0.88), 0.010);
      float ring = ell(p, vec2(0.74, 0.90), vec2(0.045, 0.05))
                 - ell(p, vec2(0.74, 0.90), vec2(0.026, 0.030));
      col = mix(col, uSaffron, body);
      col = mix(col, uWarm * 0.92, head);
      col = mix(col, uStraw * 0.9, hat);
      col = mix(col, uSumi, staff * 0.9);
      col = mix(col, uSumi, clamp(ring, 0.0, 1.0) * 0.9);
      m = max(max(body, head), max(hat, max(staff, clamp(ring, 0.0, 1.0))));
      float lant = ell(p, vec2(0.22, 0.42), vec2(0.048, 0.063)) * step(0.05, night);
      col = mix(col, uLantern * mix(0.5, 3.0, night), lant);
      m = max(m, lant);
      glow = lant * night;
    } else {
      // LOVERS under one umbrella (aiaigasa) — two figures, one parasol.
      float b1 = kimono(p, 0.39, 0.11, 0.58);
      float b2 = kimono(p, 0.61, 0.11, 0.58);
      float h1 = ell(p, vec2(0.39, 0.66), vec2(0.066, 0.080));
      float h2 = ell(p, vec2(0.61, 0.66), vec2(0.066, 0.080));
      float pole = seg(p, vec2(0.5, 0.90), vec2(0.5, 0.60), 0.010);
      float dome = ell(p, vec2(0.5, 0.90), vec2(0.34, 0.12));
      col = mix(col, uIndigo * 0.92, b1);
      col = mix(col, uVermilion * 0.92, b2);
      col = mix(col, uWarm * 0.92, max(h1, h2));
      col = mix(col, uSumi, pole * 0.9);
      col = mix(col, uStraw, dome);
      m = max(max(max(b1, b2), max(h1, h2)), max(pole, dome));
    }

    if (m < 0.01) discard;
    float a = m * uOpacity * (1.0 - fogFactor());
    a = max(a, glow * (1.0 - fogFactor()) * 0.9); // a lit lantern holds its glow
    if (a < 0.004) discard;
    gl_FragColor = vec4(mix(col, uFog, fogFactor()), a);
  }
`;

// The cast: [lat, lng, archetype, heightKm]. Real Seattle spots, each chosen to
// suit the character. Heights are tree-tall so the figures read clearly at the
// drift distance without towering over the storybook city.
const BIJIN = 0,
  TRAVELLER = 1,
  FISHERMAN = 2,
  KITE = 3,
  MONK = 4,
  LOVERS = 5;

const CAST: [number, number, number, number][] = [
  [47.6295, -122.3599, BIJIN, 0.22], // Kerry Park overlook, Queen Anne
  [47.5765, -122.409, TRAVELLER, 0.22], // Alki Point — the open western shore, gazing back at the city
  [47.6653, -122.396, FISHERMAN, 0.22], // Ballard Locks
  [47.6456, -122.3345, KITE, 0.27], // Gas Works Park kite hill
  [47.639, -122.295, MONK, 0.21], // Washington Park Arboretum
  [47.681, -122.327, LOVERS, 0.2], // Green Lake path
];

const HEART = { x: CONFIG.camera.heartX, z: CONFIG.camera.heartZ };

// Nudge a placement off open water toward downtown so a land figure never
// floats — the fisherman wants the shore, not the middle of the locks.
function toLand(x: number, z: number): { x: number; z: number } {
  let cx = x;
  let cz = z;
  for (let i = 0; i < 12 && isWater(cx, cz); i++) {
    cx += (HEART.x - cx) * 0.12;
    cz += (HEART.z - cz) * 0.12;
  }
  return { x: cx, z: cz };
}

export function Heroes() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { count, matrices, archAttr, seedAttr } = useMemo(() => {
    const mats: THREE.Matrix4[] = [];
    const archs: number[] = [];
    const seeds: number[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    CAST.forEach(([lat, lng, arch, h], i) => {
      const proj = projectLatLng(lat, lng);
      // Land-safe placement, but let the shore-dwellers (fisherman) sit at the
      // very edge rather than being dragged inland.
      const { x, z } = arch === FISHERMAN ? proj : toLand(proj.x, proj.z);
      const w = h * (arch === LOVERS ? 1.05 : 0.85);
      pos.set(x, 0, z);
      scl.set(w, h, 1);
      m.compose(pos, q, scl);
      mats.push(m.clone());
      archs.push(arch);
      // A fixed per-figure phase (index-derived, deterministic) so their sway
      // never syncs up into a chorus line.
      seeds.push((i * 0.6180339887) % 1);
    });
    return {
      count: mats.length,
      matrices: mats,
      archAttr: new THREE.InstancedBufferAttribute(new Float32Array(archs), 1),
      seedAttr: new THREE.InstancedBufferAttribute(new Float32Array(seeds), 1),
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
      mat.uniforms.uDay.value = sunPhase();
      mat.uniforms.uFogDensity.value = LIVE.fogDensity;
    }
  });

  if (!count) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      renderOrder={6.95}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]}>
        <primitive object={archAttr} attach="attributes-aArch" />
        <primitive object={seedAttr} attach="attributes-aSeed" />
      </planeGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uWarm: { value: LIVE.station }, // palette-by-reference: persimmon by day, amber by night
          uSumi: { value: new THREE.Color("#3a2c20") },
          uStraw: { value: new THREE.Color("#d8c48a") },
          uIndigo: { value: new THREE.Color("#2f4d78") },
          uVermilion: { value: new THREE.Color("#c1432f") },
          uSaffron: { value: new THREE.Color("#c98a3a") },
          uLantern: { value: new THREE.Color("#ffcf85") },
          uDay: { value: 1 },
          uTime: { value: 0 },
          uOpacity: { value: 0.95 },
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
