// The floating-bridge set piece: when a train is out over open water —
// above all, the 2 Line's I-90 crossing of Lake Washington, the only light
// rail on a floating bridge on Earth — its glow lays a broken column of
// light on the lake, stretched toward the viewer the way a real light
// reflects on chopped water. One InstancedMesh of flat quads on the water
// surface; over-water spans come from map/overWater.ts (computed against
// the real geography, tunnels excluded), so the reflection is as honest as
// the train it mirrors. Rain (world/weather.ts) chops the column harder.
//
// renderOrder 6 — on the water like the ferries, under stations and every
// train layer. Additive, so fog multiplies (the watercolorGlsl contract).

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TRAINS } from "./store";
import { MAX_TRAINS } from "./Trains";
import { pointAt, LINE_BY_ID } from "../map/network";
import { overWaterAt } from "../map/overWater";
import { CLOCK } from "../world/clock";
import { LIVE, lineGlow } from "../world/palettes";
import { WEATHER } from "../world/weather";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "../map/watercolorGlsl";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute vec3 aColor;
  attribute float aFade;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vUv = uv;
    vColor = aColor;
    vFade = aFade;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vFade;
  uniform float uTime;
  uniform float uRain;
  uniform float uIntensity;
  void main() {
    float across = abs(vUv.y * 2.0 - 1.0);
    float lateral = pow(1.0 - smoothstep(0.0, 1.0, across), 1.7);
    // uv.x = 0 is the train end; the column decays toward the viewer.
    float along = pow(max(0.0, 1.0 - vUv.x), 1.2);
    // The chop: drifting noise bands slice the column into glints. Rain
    // breaks it harder — a downpour shatters the reflection.
    float g = wcNoise(vec2(vUv.x * 9.0 - uTime * 0.6, vWorld.x * 0.05 + vWorld.y * 0.08));
    float band = smoothstep(0.3, 0.8, g);
    float shimmer = mix(1.0, band, mix(0.55, 0.9, uRain));
    float fogF = 1.0 - fogFactor(); // additive: multiply
    float a = lateral * along * vFade * shimmer;
    gl_FragColor = vec4(vColor * uIntensity * a * fogF, a);
  }
`;

const REFLECTION_Y = 0.004; // just above the paper, under the road strokes
const LENGTH_X_MODEL = 6.0; // column length in train-model lengths
const WIDTH_X_MODEL = 1.2;

const scratch = { x: 0, z: 0 };
const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export function Reflections() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, colorAttr, fadeAttr } = useMemo(() => {
    // Long axis +X, lying flat; uv.x runs 0 at -X (the train end) to 1.
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.rotateX(-Math.PI / 2);
    const colorAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TRAINS * 3), 3);
    colorAttr.setUsage(THREE.DynamicDrawUsage);
    const fadeAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TRAINS), 1);
    fadeAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aColor", colorAttr);
    geometry.setAttribute("aFade", fadeAttr);
    return { geometry, colorAttr, fadeAttr };
  }, []);

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;

    let i = 0;
    for (const train of TRAINS.values()) {
      if (i >= MAX_TRAINS) break;
      const over = overWaterAt(train.dir, train.sRendered);
      if (over <= 0.01) continue;

      pointAt(train.dir, train.sRendered, scratch);
      // Stretch toward the viewer, like a light column on real water.
      let ux = camera.position.x - scratch.x;
      let uz = camera.position.z - scratch.z;
      const len = Math.hypot(ux, uz) || 1;
      ux /= len;
      uz /= len;
      const columnKm = train.modelL * LENGTH_X_MODEL;
      quaternion.setFromAxisAngle(UP, Math.atan2(-uz, ux));
      matrix.compose(
        position.set(
          scratch.x + ux * columnKm * 0.5,
          REFLECTION_Y,
          scratch.z + uz * columnKm * 0.5
        ),
        quaternion,
        scale.set(columnKm, 1, train.modelL * WIDTH_X_MODEL)
      );
      mesh.setMatrixAt(i, matrix);

      const glow = lineGlow(train.lineId, LINE_BY_ID.get(train.lineId)?.color ?? "#5fe3b0");
      colorAttr.setXYZ(i, glow.r, glow.g, glow.b);
      // The lake breathes with everything else.
      fadeAttr.setX(i, over * (0.82 + 0.18 * CLOCK.breath));
      i++;
    }

    mesh.count = i;
    mesh.visible = i > 0;
    if (i > 0) {
      mesh.instanceMatrix.needsUpdate = true;
      colorAttr.needsUpdate = true;
      fadeAttr.needsUpdate = true;
    }
    m.uniforms.uTime.value = CLOCK.t;
    m.uniforms.uRain.value = WEATHER.rain;
    m.uniforms.uIntensity.value = LIVE.trainIntensity * 1.1;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_TRAINS]}
      geometry={geometry}
      renderOrder={6}
      frustumCulled={false}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uTime: { value: 0 },
          uRain: { value: 0 },
          uIntensity: { value: 1 },
          uFog: { value: LIVE.fog },
          uFogDensity: { value: LIVE.fogDensity },
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}
