// The trains: one InstancedMesh of view-facing quads carrying a painted
// radial glow whose core runs hot (above the 1.05 bloom threshold), so
// phones without a composer still read as luminous and bloom amplifies the
// same pixels on bigger tiers. This component also owns the per-frame tween
// step — it advances every train, then writes matrices.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TRAINS } from "./store";
import { advanceTrain, sampleTrail } from "./tween";
import { pointAt, LINE_BY_ID } from "../map/network";
import { CONFIG } from "../world/config";
import { PROFILE } from "../world/device";
import { CLOCK, tickClock } from "../world/clock";
import { LIVE, lineGlow } from "../world/palettes";
import { sunPhase } from "../world/sun";
import { updatePalette } from "../world/palettes";
import { easeWeather, applyWeather } from "../world/weather";
import { pushShadow } from "../world/shadows";
import { TRAIN_MODEL } from "./TrainModel";

export const MAX_TRAINS = 48;

const VERT = /* glsl */ `
  attribute vec3 aColor;
  attribute float aPulse;
  attribute float aScale;
  varying vec3 vColor;
  varying vec2 vUv;
  varying float vPulse;
  varying float vScale;
  void main() {
    vColor = aColor;
    vPulse = aPulse;
    vScale = aScale;
    vUv = uv;
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    mv.xy += (uv - 0.5) * aScale;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform float uIntensity;
  uniform float uCore;
  uniform float uHaloDim;
  varying vec3 vColor;
  varying vec2 vUv;
  varying float vPulse;
  varying float vScale;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r2 = dot(p, p);
    // Kill the quad silhouette — a billboard seen at a glancing angle would
    // otherwise read as a hard diamond under bloom.
    float edge = 1.0 - smoothstep(0.45, 0.85, sqrt(r2));
    // Up close the model carries the identity; the hot core steps aside and
    // the halo tightens so no quad geometry ever reads.
    float nearDim = mix(0.25, 1.0, smoothstep(0.18, 0.4, vScale));
    float core = exp(-r2 * 16.0) * nearDim;
    float halo = exp(-r2 * 4.5) * 0.32 * uHaloDim * edge * mix(0.55, 1.0, nearDim);
    float a = clamp(core + halo, 0.0, 1.0);
    vec3 c = vColor * (core * uCore * vPulse + halo * 1.6) * uIntensity;
    gl_FragColor = vec4(c, a);
  }
`;

const scratch = { x: 0, z: 0 };
const matrix = new THREE.Matrix4();

export function Trains() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { colorAttr, pulseAttr, scaleAttr } = useMemo(() => {
    const colorAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TRAINS * 3), 3);
    colorAttr.setUsage(THREE.DynamicDrawUsage);
    const pulseAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TRAINS), 1);
    pulseAttr.setUsage(THREE.DynamicDrawUsage);
    const scaleAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TRAINS), 1);
    scaleAttr.setUsage(THREE.DynamicDrawUsage);
    return { colorAttr, pulseAttr, scaleAttr };
  }, []);

  useFrame(({ camera }, rawDt) => {
    // The single clock tick and palette update for the whole app — Trains
    // is the one always-mounted frame driver. Weather modulates the fresh
    // palette AFTER the lerp, so its moves never accumulate.
    tickClock(rawDt);
    const phase = sunPhase();
    updatePalette(phase);
    easeWeather(CLOCK.dt);
    applyWeather(phase);

    const mesh = meshRef.current;
    if (!mesh) return;

    const m = CONFIG.train.model;
    let i = 0;
    for (const train of TRAINS.values()) {
      if (i >= MAX_TRAINS) break;
      advanceTrain(train, CLOCK.dt, CLOCK.t);
      pointAt(train.dir, train.sRendered, scratch);
      matrix.makeTranslation(scratch.x, train.y, scratch.z);
      mesh.setMatrixAt(i, matrix);

      // A soft wash-shadow under the paper: an elevated train floats a big
      // faint one offset southeast, a tunnel train almost none (world/shadows).
      pushShadow(scratch.x, scratch.z, train.y, train.modelL * 0.32);

      const glow = lineGlow(train.lineId, LINE_BY_ID.get(train.lineId)?.color ?? "#5fe3b0");
      colorAttr.setXYZ(i, glow.r, glow.g, glow.b);
      // Dwelling trains settle into a slower, deeper breath.
      const breathe = train.dwelling || train.vEst < 0.002 ? 0.75 + 0.25 * CLOCK.breath : 1.0;
      pulseAttr.setX(i, breathe);

      // Toy scale: exaggerated at drift distance, easing toward real scale
      // as THIS camera closes on THIS train (a chased train shrinks while
      // the background fleet stays storybook-sized).
      const dx = camera.position.x - scratch.x;
      const dy = camera.position.y - train.y;
      const dz = camera.position.z - scratch.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const t = Math.min(1, Math.max(0, (dist - m.nearCamKm) / (m.farCamKm - m.nearCamKm)));
      const eased = t * t * (3 - 2 * t);
      const targetL = m.nearLenKm + (m.farLenKm - m.nearLenKm) * eased;
      train.modelL += (targetL - train.modelL) * Math.min(1, CLOCK.dt * m.scaleLerpPerS);
      scaleAttr.setX(i, train.modelL * 0.8); // halo footprint tracks the toy
      TRAIN_MODEL.write(i, train.dir, train.sRendered, train.y, train.modelL);

      sampleTrail(
        train,
        scratch.x,
        train.y,
        scratch.z,
        CLOCK.t,
        PROFILE.trailSeconds / PROFILE.trailSegments
      );
      i++;
    }

    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    colorAttr.needsUpdate = true;
    pulseAttr.needsUpdate = true;
    scaleAttr.needsUpdate = true;
    TRAIN_MODEL.commit(i);

    if (materialRef.current) {
      materialRef.current.uniforms.uIntensity.value = LIVE.trainIntensity;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_TRAINS]}
      renderOrder={10}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]}>
        <primitive object={colorAttr} attach="attributes-aColor" />
        <primitive object={pulseAttr} attach="attributes-aPulse" />
        <primitive object={scaleAttr} attach="attributes-aScale" />
      </planeGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uIntensity: { value: 1 },
          uCore: { value: CONFIG.train.coreIntensity },
          uHaloDim: { value: CONFIG.train.model.spriteDim },
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}
