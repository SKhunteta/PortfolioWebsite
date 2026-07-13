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

export const MAX_TRAINS = 48;

const VERT = /* glsl */ `
  attribute vec3 aColor;
  attribute float aPulse;
  varying vec3 vColor;
  varying vec2 vUv;
  varying float vPulse;
  uniform float uScale;
  void main() {
    vColor = aColor;
    vPulse = aPulse;
    vUv = uv;
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    mv.xy += (uv - 0.5) * uScale;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform float uIntensity;
  uniform float uCore;
  varying vec3 vColor;
  varying vec2 vUv;
  varying float vPulse;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r2 = dot(p, p);
    float core = exp(-r2 * 16.0);
    float halo = exp(-r2 * 3.2) * 0.32;
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

  const { colorAttr, pulseAttr } = useMemo(() => {
    const colorAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TRAINS * 3), 3);
    colorAttr.setUsage(THREE.DynamicDrawUsage);
    const pulseAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TRAINS), 1);
    pulseAttr.setUsage(THREE.DynamicDrawUsage);
    return { colorAttr, pulseAttr };
  }, []);

  useFrame((_, rawDt) => {
    // The single clock tick and palette update for the whole app — Trains
    // is the one always-mounted frame driver.
    tickClock(rawDt);
    updatePalette(sunPhase());

    const mesh = meshRef.current;
    if (!mesh) return;

    let i = 0;
    for (const train of TRAINS.values()) {
      if (i >= MAX_TRAINS) break;
      advanceTrain(train, CLOCK.dt, CLOCK.t);
      pointAt(train.dir, train.sRendered, scratch);
      matrix.makeTranslation(scratch.x, train.y, scratch.z);
      mesh.setMatrixAt(i, matrix);

      const glow = lineGlow(train.lineId, LINE_BY_ID.get(train.lineId)?.color ?? "#5fe3b0");
      colorAttr.setXYZ(i, glow.r, glow.g, glow.b);
      // Dwelling trains settle into a slower, deeper breath.
      const breathe = train.dwelling || train.vEst < 0.002 ? 0.75 + 0.25 * CLOCK.breath : 1.0;
      pulseAttr.setX(i, breathe);

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

    if (materialRef.current) {
      materialRef.current.uniforms.uIntensity.value = LIVE.trainIntensity;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_TRAINS]}
      renderOrder={5}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]}>
        <primitive object={colorAttr} attach="attributes-aColor" />
        <primitive object={pulseAttr} attach="attributes-aPulse" />
      </planeGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uScale: { value: CONFIG.train.spriteKm },
          uIntensity: { value: 1 },
          uCore: { value: CONFIG.train.coreIntensity },
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}
