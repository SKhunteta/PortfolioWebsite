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
import { tickObserve } from "../world/observe";
import { updatePalette } from "../world/palettes";
import { easeWeather, applyWeather } from "../world/weather";
import { audioTick } from "../audio/engine";
import { TRAIN_MODEL } from "./TrainModel";
import { FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "../map/watercolorGlsl";

export const MAX_TRAINS = 48;

// Live counter for ?debug and the smoke harness (dev/handles.ts exposes it):
// how many times the feed guard below caught a non-finite train transform
// before it could reach the GPU. Nonzero in the field = the flicker's source
// confirmed; the guard is what keeps it invisible.
export const TRAIN_GUARD = { badFixes: 0 };

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

// The sumi ink halo (idea #2): a soft normal-blended pigment ring dropped
// under each train, keyed to DAY (bright washi is where additive glow reads
// weakest) and to the far ease (only meaningful zoomed out). An inked outline
// is what keeps a passing train legible on paper — the same reason the toy's
// body carries ink seams up close. Mixes toward fog per the raw-ShaderMaterial
// contract so distant halos dissolve into the kasumi.
const INK_VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aScale;
  attribute float aStrength;
  varying vec2 vUv;
  varying float vStrength;
  void main() {
    vUv = uv;
    vStrength = aStrength;
    vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vWorld = wp.xz;
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vFogDepth = -mv.z;
    mv.xy += (uv - 0.5) * aScale;
    gl_Position = projectionMatrix * mv;
  }
`;

const INK_FRAG = /* glsl */ `
  ${FOG_VARYINGS_FRAG}
  uniform vec3 uInk;
  uniform float uOpacity;
  uniform float uDayness;
  varying vec2 vUv;
  varying float vStrength;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    // A feathered ring that frames the train's mark and fades past it, so it
    // reads as a hand-inked outline rather than a shadow blob.
    float ring = exp(-pow((r - 0.42) * 3.4, 2.0));
    float a = ring * vStrength * uOpacity * uDayness;
    vec3 c = mix(uInk, uFog, fogFactor());
    gl_FragColor = vec4(c, a);
  }
`;

const scratch = { x: 0, z: 0 };
const matrix = new THREE.Matrix4();

export function Trains() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const inkRef = useRef<THREE.InstancedMesh>(null);
  const inkMatRef = useRef<THREE.ShaderMaterial>(null);

  const { colorAttr, pulseAttr, scaleAttr, inkScaleAttr, inkStrengthAttr } = useMemo(() => {
    const colorAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TRAINS * 3), 3);
    colorAttr.setUsage(THREE.DynamicDrawUsage);
    const pulseAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TRAINS), 1);
    pulseAttr.setUsage(THREE.DynamicDrawUsage);
    const scaleAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TRAINS), 1);
    scaleAttr.setUsage(THREE.DynamicDrawUsage);
    const inkScaleAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TRAINS), 1);
    inkScaleAttr.setUsage(THREE.DynamicDrawUsage);
    const inkStrengthAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TRAINS), 1);
    inkStrengthAttr.setUsage(THREE.DynamicDrawUsage);
    return { colorAttr, pulseAttr, scaleAttr, inkScaleAttr, inkStrengthAttr };
  }, []);

  useFrame(({ camera }, rawDt) => {
    // The single clock tick and palette update for the whole app — Trains
    // is the one always-mounted frame driver. Weather modulates the fresh
    // palette AFTER the lerp, so its moves never accumulate.
    tickClock(rawDt);
    tickObserve(CLOCK.dt); // observe mode sweeps the sun across a whole day
    const phase = sunPhase();
    updatePalette(phase);
    easeWeather(CLOCK.dt);
    applyWeather(phase);
    // The room tone follows the same phase + live weather (no-op when the
    // audio toggle is off). Kept on the single driver so it can never drift
    // out of step with the light it's painting.
    audioTick(phase);

    const mesh = meshRef.current;
    if (!mesh) return;
    const inkMesh = inkRef.current;

    const tv = CONFIG.train;
    const m = CONFIG.train.model;
    let i = 0;
    for (const train of TRAINS.values()) {
      if (i >= MAX_TRAINS) break;
      advanceTrain(train, CLOCK.dt, CLOCK.t);
      pointAt(train.dir, train.sRendered, scratch);
      // Feed guard: one bad fix must never reach the GPU. A single non-finite
      // value here poisons an instance matrix for the sprite, the ink halo,
      // the trail AND the depth-writing model — which rasterizes as a giant
      // screen-covering polygon for exactly one frame (the black-flash
      // flicker recorded on iPad + desktop, Jul 16). Skip the slot, flag the
      // train, and let the next honest poll heal it.
      // The sum covers every per-train number that feeds vertex data somewhere:
      // position (sprite/ink/model/trail), toy length (scales), and load
      // (trail width/ink — a NaN load would otherwise self-perpetuate through
      // its own lerp and poison the trail buffer forever).
      if (
        !Number.isFinite(
          scratch.x + scratch.z + train.y + train.modelL + train.sRendered + train.load
        )
      ) {
        TRAIN_GUARD.badFixes++;
        console.warn(
          `[sound-and-rail] non-finite train transform (id=${train.id} s=${train.sRendered} ` +
            `x=${scratch.x} z=${scratch.z} y=${train.y} L=${train.modelL}) — slot skipped`
        );
        // Re-arm from the last known target so the train can recover instead
        // of warning forever; if the target is poisoned too, drop the train.
        if (Number.isFinite(train.sTarget)) {
          train.sRendered = train.sTarget;
          train.y = 0.02;
          train.modelL = m.farLenKm;
          train.vEst = 0;
          train.load = 0.5;
          train.trailCount = 0;
        } else {
          TRAINS.delete(train.id);
        }
        continue;
      }
      matrix.makeTranslation(scratch.x, train.y, scratch.z);
      mesh.setMatrixAt(i, matrix);

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
      TRAIN_MODEL.write(i, train.dir, train.sRendered, train.y, train.modelL, train.load);

      // Zoom-out visibility ease — its OWN, tighter range so it's ~full at
      // drift (the toy-scale ease above barely climbs at ~16 km). Drives both
      // the trail swell (Trails reads farFactor) and the sumi halo strength.
      const fv = Math.min(
        1,
        Math.max(0, (dist - tv.farVisNearKm) / (tv.farVisFarKm - tv.farVisNearKm))
      );
      const farVis = fv * fv * (3 - 2 * fv);
      train.farFactor = farVis;

      // Sumi ink halo shares the train's translation; footprint tracks the toy
      // and strength rides the zoom-out ease (gone up close).
      inkMesh?.setMatrixAt(i, matrix);
      inkScaleAttr.setX(i, train.modelL * m.inkHaloScale);
      inkStrengthAttr.setX(i, farVis);

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

    if (inkMesh) {
      inkMesh.count = i;
      inkMesh.instanceMatrix.needsUpdate = true;
      inkScaleAttr.needsUpdate = true;
      inkStrengthAttr.needsUpdate = true;
    }

    if (materialRef.current) {
      materialRef.current.uniforms.uIntensity.value = LIVE.trainIntensity;
    }
    if (inkMatRef.current) {
      // Dayness gates the ink (night leans on bloom); fog density follows the
      // live palette. uInk/uFog are palette-by-reference, so they self-update.
      inkMatRef.current.uniforms.uDayness.value = phase;
      inkMatRef.current.uniforms.uFogDensity.value = LIVE.fogDensity;
    }
  });

  return (
    <>
      {/* Sumi ink halo — under the glow (10) and model (9), above the trail
          (8), so it darkens paper without hiding the toy that sits on it. */}
      <instancedMesh
        ref={inkRef}
        args={[undefined, undefined, MAX_TRAINS]}
        renderOrder={8.5}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]}>
          <primitive object={inkScaleAttr} attach="attributes-aScale" />
          <primitive object={inkStrengthAttr} attach="attributes-aStrength" />
        </planeGeometry>
        <shaderMaterial
          ref={inkMatRef}
          vertexShader={INK_VERT}
          fragmentShader={INK_FRAG}
          uniforms={{
            uInk: { value: LIVE.label },
            uOpacity: { value: CONFIG.train.model.inkHaloOpacity },
            uDayness: { value: 1 },
            uFog: { value: LIVE.fog },
            uFogDensity: { value: LIVE.fogDensity },
          }}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </instancedMesh>
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
    </>
  );
}
