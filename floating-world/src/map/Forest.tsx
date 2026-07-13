// The evergreen carpet — what makes the poster the poster. Thousands of tiny
// conifer silhouettes scattered across the land, clumped by noise into stands
// and ridgelines, thinning where downtown takes over and thickening inside
// the parks. ONE InstancedMesh of camera-facing billboards (one draw call);
// each is a fir-shaped alpha cut, normal-blended sumi-green mixed toward the
// scene fog so the far forest dissolves into kasumi like the print's hills.
//
// Deterministic from a fixed seed (map/scatter.ts) — the same forest every
// visit, no per-frame work beyond handing the live palette to the shader.
// Count keys off PROFILE (phones carry a lighter wood).

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LIVE } from "../world/palettes";
import { PROFILE } from "../world/device";
import { CONFIG } from "../world/config";
import { mulberry32, fbm, isWater, isPark } from "./scatter";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aTone;
  varying vec2 vUv;
  varying float vTone;
  void main() {
    vUv = uv;
    vTone = aTone;
    // The tree stands upright and turns to face the camera about Y (a
    // cylindrical billboard): width/height come from the instance scale, the
    // base stays pinned to the paper.
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
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vTone;
  void main() {
    float x = abs(vUv.x - 0.5) * 2.0; // 0 center → 1 edge
    float y = vUv.y;                  // 0 base → 1 tip
    // Conifer profile: widest near the base, tapering to the tip, with soft
    // fir tiers stepped down the sides.
    float prof = pow(1.0 - y, 0.85);
    float tier = 0.80 + 0.20 * sin(y * 22.0);
    float edge = prof * tier;
    float body = 1.0 - smoothstep(edge - 0.12, edge, x);
    float trunk = step(y, 0.13) * step(x, 0.11); // a hint of trunk at the foot
    float a = max(body, trunk);
    if (a < 0.02) discard;
    // The canopy lifts toward the light at the crown; pigment mottles per tree.
    float wash = wcFbm(vWorld * 1.3 + vTone * 7.0);
    vec3 c = uColor * vTone * (0.80 + 0.30 * y) * (0.9 + 0.2 * wash);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a * uOpacity);
  }
`;

const HEART = { x: CONFIG.camera.heartX, z: CONFIG.camera.heartZ };
const SCATTER_RADIUS_KM = 42;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function Forest() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { count, matrices, toneAttr } = useMemo(() => {
    const rand = mulberry32(0x5eed);
    const target = PROFILE.treeCount;
    const mats: THREE.Matrix4[] = [];
    const tones: number[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    let tries = 0;
    const maxTries = target * 7;
    while (mats.length < target && tries < maxTries) {
      tries++;
      // Sample uniformly in a disc around the drift's heart.
      const ang = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * SCATTER_RADIUS_KM;
      const x = HEART.x + Math.cos(ang) * rr;
      const z = HEART.z + Math.sin(ang) * rr;
      if (isWater(x, z)) continue;
      const clump = fbm(x * 0.09 + 11.3, z * 0.09 - 4.7); // stands and clearings
      const dHeart = Math.hypot(x - HEART.x, z - HEART.z);
      const cityFactor = 0.18 + 0.82 * smoothstep(1.5, 7.5, dHeart); // thin over downtown
      // Sharper clumping: dense stands, barer clearings — reads as forest
      // masses and ridgelines rather than an even stipple.
      let density = (0.12 + 1.05 * smoothstep(0.32, 0.72, clump)) * cityFactor;
      if (isPark(x, z)) density += 0.5; // parks are forest
      if (rand() > Math.min(1, density)) continue;
      const h = 0.17 + clump * 0.26 + rand() * 0.16;
      const w = h * (0.4 + rand() * 0.24);
      pos.set(x, 0, z);
      scl.set(w, h, 1);
      m.compose(pos, q, scl);
      mats.push(m.clone());
      tones.push(0.78 + rand() * 0.42);
    }
    const toneAttr = new THREE.InstancedBufferAttribute(new Float32Array(tones), 1);
    return { count: mats.length, matrices: mats, toneAttr };
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
      mat.uniforms.uOpacity.value = LIVE.treeOpacity;
      mat.uniforms.uFogDensity.value = LIVE.fogDensity;
    }
  });

  if (!count) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      renderOrder={5.6}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]}>
        <primitive object={toneAttr} attach="attributes-aTone" />
      </planeGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uColor: { value: LIVE.tree }, // palette-by-reference
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
