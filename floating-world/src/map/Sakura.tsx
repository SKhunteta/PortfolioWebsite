// The cherry blossom — the most ukiyo-e-native mark on the whole print, and a
// real Seattle pilgrimage: the UW Quad's Yoshino cherries at peak, the
// Washington Park Arboretum, the Green Lake shore, Seward Park. Soft pink
// blossom canopies clustered at the real bloom sites, upright cylindrical
// billboards pinned to the paper and turning to face the drift camera — the
// same one-draw-call instanced trick the forest uses, painted sakura-pink
// instead of sumi-green.
//
// SEASONAL and HONEST: the layer keys to world/bloom.ts — up in mid-March,
// full in the last week of March, gone by mid-April, and nothing at all the
// rest of the year (the shader discards when the bloom gate is ~0, so out of
// season it costs only a handful of idle vertices). It never invents a bloom
// it doesn't have, exactly like the birds only fly at the golden hour and the
// seaplanes only by day. ?bloom=peak|none|0.6 pins it. Pink dims toward a
// dusk-plum after dark and dissolves toward the scene fog at drift distance
// like every other normal-blended layer. renderOrder 5.62 — just over the
// green forest canopy, under the buildings and landmarks. depthWrite false.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LIVE } from "../world/palettes";
import { PROFILE } from "../world/device";
import { sunPhase } from "../world/sun";
import { bloomFactor } from "../world/bloom";
import { mulberry32, isWater } from "./scatter";
import { projectLatLng } from "./network";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aSeed;
  varying vec2 vUv;
  varying float vSeed;
  void main() {
    vUv = uv;
    vSeed = aSeed;
    // Upright cylindrical billboard, exactly like the firs: the canopy stands
    // on the paper and turns to face the camera about Y, so a blossom never
    // foreshortens into a sliver at the drift angle.
    vec3 base = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
    float w = length(vec3(instanceMatrix[0]));
    float h = length(vec3(instanceMatrix[1]));
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 toCam = cameraPosition - base;
    toCam.y = 0.0;
    vec3 right = normalize(cross(up, toCam));
    vec3 world = base + right * (uv.x - 0.5) * w + up * uv.y * h;
    vWorld = world.xz;
    vec4 mv = viewMatrix * vec4(world, 1.0);
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  uniform vec3 uPink;     // sakura pink, sunlit
  uniform vec3 uPinkDeep; // shadowed pigment in the clumps
  uniform vec3 uPlum;     // the blossom after dark — a lantern-dusk plum
  uniform float uDay;     // sunPhase: 1 daylight pink, 0 night plum
  uniform float uBloom;   // world/bloom.ts season gate — 0 out of season
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vSeed;
  void main() {
    if (uBloom < 0.004) discard;
    vec2 p = vUv * 2.0 - 1.0; // -1..1, a rounded canopy
    float r = length(p * vec2(1.0, 1.15)); // a touch taller than wide
    // A soft cloud of blossom broken into petal clumps by noise, so the canopy
    // reads as a mass of flowers, not a flat disc.
    float mottle = wcFbm(p * 3.2 + vSeed * 17.0);
    float puff = smoothstep(1.0, 0.12, r) * (0.55 + 0.55 * mottle);
    // A hint of trunk at the foot, like the firs, so it plants on the paper.
    float trunk = step(vUv.y, 0.14) * step(abs(vUv.x - 0.5), 0.045);
    float a = max(puff, trunk * 0.7);
    if (a < 0.02) discard;
    vec3 pink = mix(uPinkDeep, uPink, mottle);
    vec3 c = mix(uPlum, pink, uDay);
    a *= uBloom * uOpacity;
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a);
  }
`;

// The bloom sites, each a cluster center: [lat, lng, spreadKm, weight]. The UW
// Quad is the hero (dense, tight), the Arboretum and Green Lake broader.
const SITES: [number, number, number, number][] = [
  [47.657, -122.308, 0.06, 3.2], // UW Quad — the pilgrimage
  [47.6545, -122.3085, 0.12, 1.0], // Rainier Vista / campus edges
  [47.639, -122.295, 0.28, 1.6], // Washington Park Arboretum
  [47.681, -122.328, 0.24, 1.3], // Green Lake shore
  [47.551, -122.257, 0.2, 1.0], // Seward Park
  [47.57, -122.31, 0.14, 0.7], // Jefferson Park, Beacon Hill
  [47.606, -122.333, 0.1, 0.6], // a few downtown street rows
];

export function Sakura() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { count, matrices, seedAttr } = useMemo(() => {
    const rand = mulberry32(0x5a2b);
    const target = PROFILE.sakuraCount;
    const totalWeight = SITES.reduce((s, site) => s + site[3], 0);
    const mats: THREE.Matrix4[] = [];
    const seeds: number[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    for (const [lat, lng, spread, weight] of SITES) {
      const { x, z } = projectLatLng(lat, lng);
      const n = Math.max(1, Math.round((weight / totalWeight) * target));
      for (let i = 0; i < n; i++) {
        // Gaussian-ish scatter around the site center (two uniform samples),
        // resampled off open water so the blossoms plant on the shore, not the
        // lake — cherry trees line the Arboretum's Union Bay edge, they don't
        // float on it.
        let px = x;
        let pz = z;
        for (let attempt = 0; attempt < 6; attempt++) {
          const rr = (rand() + rand()) * 0.5 * spread * 2;
          const ang = rand() * Math.PI * 2;
          px = x + Math.cos(ang) * rr;
          pz = z + Math.sin(ang) * rr;
          if (!isWater(px, pz)) break;
        }
        const h = 0.16 + rand() * 0.14; // storybook canopy, a touch above the firs
        const w = h * (0.9 + rand() * 0.4); // blossoms read rounder than the firs
        pos.set(px, 0, pz);
        scl.set(w, h, 1);
        m.compose(pos, q, scl);
        mats.push(m.clone());
        seeds.push(rand());
      }
    }
    const seedAttr = new THREE.InstancedBufferAttribute(new Float32Array(seeds), 1);
    return { count: mats.length, matrices: mats, seedAttr };
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
      mat.uniforms.uDay.value = sunPhase();
      mat.uniforms.uBloom.value = bloomFactor();
      mat.uniforms.uOpacity.value = LIVE.treeOpacity;
      mat.uniforms.uFogDensity.value = LIVE.fogDensity;
    }
  });

  if (!count) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      renderOrder={5.62}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]}>
        <primitive object={seedAttr} attach="attributes-aSeed" />
      </planeGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uPink: { value: new THREE.Color("#f4c9d6") }, // sakura pink
          uPinkDeep: { value: new THREE.Color("#e2a2bb") },
          uPlum: { value: new THREE.Color("#6b4a63") }, // dusk-plum after dark
          uDay: { value: 1 },
          uBloom: { value: 0 },
          uOpacity: { value: LIVE.treeOpacity },
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
