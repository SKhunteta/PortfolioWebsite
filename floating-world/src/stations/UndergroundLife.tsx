// Down on the underground platforms. The surface crowd (PlatformLife.tsx)
// gathers on the paper at every station's entrance; this is the OTHER half — the
// life and the art that live 100 feet down, painted at the rail floor and seen
// up THROUGH the translucent paper (renderOrder 3, additive, the same painter's
// trick as the submerged orbs and light shafts). Two instanced layers:
//
//   • the crowd — a scatter of backlit glow-figures on each deep platform,
//     washed toward that station's identity accent under a warm platform-lamp
//     core. It fades up on the honest dwell pulse (driven straight off
//     PLATFORM_PULSE, the SAME signal the orb and the arrivals read) and thins
//     to a lone caretaker when the network rests — never a ghost town, never a
//     crowd the trains didn't earn.
//
//   • the art fresco — one glowing cartouche per hall, painting that station's
//     REAL signature artwork procedurally in the woodblock palette (motifs.ts +
//     motifsGlsl.ts): Beacon Hill's drifting sea-forms, Capitol Hill's kissing
//     jets, UW's geologic glyphs, Symphony's blinking cave-glyphs, Westlake's
//     terra-cotta vines, Pioneer Square's clocks, Roosevelt's gold ziggurat,
//     U District's light tubes. Each brightens on dwell and flares into bloom on
//     a train's arrival — the "things happening down there".
//
// Mounts after PlatformLife so UNDERGROUND_SITES (published by Stations.tsx
// during its render) is filled by the time this lays out its pools. Everything
// deterministic (hashed indices, no Math.random), palette-by-reference (uFog /
// LIVE held by object), single-clock (reads CLOCK, never ticks it), fog-correct
// (additive layers multiply by 1 - fogFactor()).

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { PROFILE } from "../world/device";
import { CONFIG } from "../world/config";
import { sunPhase } from "../world/sun";
import { useUi } from "../trains/store";
import { UNDERGROUND_SITES, PLATFORM_PULSE } from "./platformPulse";
import { FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "../map/watercolorGlsl";
import { MOTIFS_GLSL } from "./motifsGlsl";

// --- the art fresco ---------------------------------------------------------
// A flat disc laid on the platform floor, one per underground hall. The motif
// shader (motifsGlsl.ts) draws the station's artwork in its local disc coords
// (position.xy in [-1,1]); the caller here only supplies palette, pulse and the
// soft rim + fog falloff.
const FRESCO_VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aMotif;
  attribute float aSeed;
  attribute vec3 aAccent;
  attribute vec3 aColorB;
  attribute float aDensity;
  attribute float aSpeed;
  attribute float aPulse;
  varying vec2 vLocal;
  varying float vMotif;
  varying float vSeed;
  varying float vDensity;
  varying float vSpeed;
  varying float vPulse;
  varying vec3 vAccent;
  varying vec3 vColorB;
  void main() {
    vLocal = position.xy; // circle radius 1 → disc coords in [-1, 1]
    vMotif = aMotif; vSeed = aSeed; vDensity = aDensity; vSpeed = aSpeed; vPulse = aPulse;
    vAccent = aAccent; vColorB = aColorB;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const FRESCO_FRAG = /* glsl */ `
  ${FOG_VARYINGS_FRAG}
  ${MOTIFS_GLSL}
  uniform float uTime;
  uniform float uBreath;
  uniform float uNight;
  uniform float uBase;
  varying vec2 vLocal;
  varying float vMotif;
  varying float vSeed;
  varying float vDensity;
  varying float vSpeed;
  varying float vPulse;
  varying vec3 vAccent;
  varying vec3 vColorB;
  void main() {
    float rim = smoothstep(1.0, 0.5, length(vLocal));
    if (rim < 0.001) discard;
    vec2 m = motifSample(vMotif, vLocal, uTime * vSpeed, vSeed, vPulse, vDensity);
    // Quiet at rest, brighter on dwell, breathing on the global breath, and a
    // little harder underground at night (the paper overhead dims them).
    float glow = uBase * (0.4 + 0.6 * vPulse) * (0.8 + 0.2 * uBreath) * (1.0 + 0.5 * uNight);
    float shape = m.x * glow * rim; // m.x may exceed 1 → HDR flare into bloom
    vec3 col = mix(vAccent, vColorB, clamp(m.y, 0.0, 1.0));
    float fog = 1.0 - fogFactor();
    float a = clamp(shape, 0.0, 1.0) * fog;
    if (a < 0.003) discard;
    gl_FragColor = vec4(col * shape * fog, a);
  }
`;

// --- the deep-platform crowd ------------------------------------------------
// Backlit glow-figures (no ink silhouettes — these read as lit forms under the
// platform lamps, glowing up through the paper). Same gather-on-dwell contract
// as PlatformLife, tinted per-figure by its station's accent.
const CROWD_VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aSeed;
  attribute float aSize;
  attribute float aPulse;
  attribute vec2 aScatter;
  attribute float aCaretaker;
  attribute vec3 aAccent;
  uniform float uTime;
  uniform float uGather;
  varying vec2 vUv;
  varying float vPulse;
  varying float vSeed;
  varying float vCare;
  varying vec3 vAccent;
  void main() {
    vUv = uv;
    vPulse = aPulse; vSeed = aSeed; vCare = aCaretaker; vAccent = aAccent;
    vec3 offset = vec3(aScatter.x, 0.0, aScatter.y) * (1.0 - uGather * aPulse);
    vec4 center = modelMatrix * (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0) + vec4(offset, 0.0));
    vWorld = center.xz;
    vec4 mv = viewMatrix * center;
    mv.x += sin(uTime * 0.9 + aSeed * 6.283) * 0.004;
    mv.y += sin(uTime * 2.1 + aSeed * 3.14) * 0.005;
    // View-facing billboard, feet at uv.y = 0 (on the platform floor).
    vec2 q = (uv - vec2(0.5, 0.0)) * vec2(aSize * 0.55, aSize);
    mv.xy += q;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const CROWD_FRAG = /* glsl */ `
  ${FOG_VARYINGS_FRAG}
  uniform vec3 uLantern;
  uniform float uOpacity;
  uniform float uResting;
  uniform float uNight;
  uniform float uBoost;
  varying vec2 vUv;
  varying float vPulse;
  varying float vSeed;
  varying float vCare;
  varying vec3 vAccent;
  void main() {
    float crowd = smoothstep(0.09, 0.7, vPulse);
    // A lone caretaker per hall when the whole network rests, so a quiet
    // platform still has a soul on it. 0 in live/simulated mode.
    crowd = max(crowd, vCare * uResting * 0.6);
    if (crowd < 0.01) discard;
    // Body lozenge + head.
    vec2 p = vUv - vec2(0.5, 0.42);
    float body = 1.0 - smoothstep(0.26, 0.62, length(p * vec2(2.3, 1.05)));
    float head = 1.0 - smoothstep(0.06, 0.12, length((vUv - vec2(0.5, 0.80)) * vec2(1.5, 1.1)));
    float figMask = clamp(max(body, head * 0.9), 0.0, 1.0);
    if (figMask < 0.01) discard;
    // Backlit: a warm platform-lamp core washed toward the station accent,
    // hottest at the body center. HDR so the bloom skirt catches the lit forms.
    float core = 1.0 - smoothstep(0.0, 0.5, length(p * vec2(2.0, 1.0)));
    vec3 col = mix(vAccent, uLantern, core * 0.6);
    float hdr = uBoost * (0.7 + 0.6 * core) * (1.0 + 0.6 * uNight);
    float shape = figMask * crowd * (0.55 + 0.45 * fract(vSeed));
    float fog = 1.0 - fogFactor();
    float a = clamp(shape * hdr, 0.0, 1.0) * uOpacity * fog;
    if (a < 0.004) discard;
    gl_FragColor = vec4(col * shape * hdr * fog, a);
  }
`;

// Deterministic 0..1 hash — no Math.random, so the crowd lays out identically
// on every reload (the scene's determinism rule).
function hash(n: number): number {
  return (Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1;
}
function unit(n: number): number {
  return Math.abs(hash(n));
}

const matrix = new THREE.Matrix4();
const SEAL_QUAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
const POS = new THREE.Vector3();
const SCALE = new THREE.Vector3();

export function UndergroundLife() {
  const frescoRef = useRef<THREE.InstancedMesh>(null);
  const crowdRef = useRef<THREE.InstancedMesh>(null);

  // The art frescoes: one instance per underground hall that HAS a motif.
  const fresco = useMemo(() => {
    const sites = UNDERGROUND_SITES.filter((s) => s.motif >= 0);
    const n = sites.length;
    const geometry = new THREE.CircleGeometry(1, 32);
    const motif = new Float32Array(n);
    const seed = new Float32Array(n);
    const accent = new Float32Array(n * 3);
    const colorB = new Float32Array(n * 3);
    const density = new Float32Array(n);
    const speed = new Float32Array(n);
    const pulse = new Float32Array(n);
    const cB = new THREE.Color();
    sites.forEach((s, i) => {
      motif[i] = s.motif;
      seed[i] = s.seed;
      density[i] = s.density;
      speed[i] = s.speed;
      accent[i * 3] = s.accent.r;
      accent[i * 3 + 1] = s.accent.g;
      accent[i * 3 + 2] = s.accent.b;
      cB.set(s.colorB);
      colorB[i * 3] = cB.r;
      colorB[i * 3 + 1] = cB.g;
      colorB[i * 3 + 2] = cB.b;
    });
    const pulseAttr = new THREE.InstancedBufferAttribute(pulse, 1);
    pulseAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aMotif", new THREE.InstancedBufferAttribute(motif, 1));
    geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
    geometry.setAttribute("aAccent", new THREE.InstancedBufferAttribute(accent, 3));
    geometry.setAttribute("aColorB", new THREE.InstancedBufferAttribute(colorB, 3));
    geometry.setAttribute("aDensity", new THREE.InstancedBufferAttribute(density, 1));
    geometry.setAttribute("aSpeed", new THREE.InstancedBufferAttribute(speed, 1));
    geometry.setAttribute("aPulse", pulseAttr);
    return { geometry, sites, count: n, pulseAttr };
  }, []);

  // The deep-platform crowd: every submerged hall gets figures.
  const crowd = useMemo(() => {
    const sites = UNDERGROUND_SITES;
    const SITE_COUNT = sites.length;
    const PER = PROFILE.undergroundMotes;
    const POOL = SITE_COUNT * PER;
    const geometry = new THREE.PlaneGeometry(1, 1);
    const seed = new Float32Array(POOL);
    const size = new Float32Array(POOL);
    const pulse = new Float32Array(POOL);
    const scatter = new Float32Array(POOL * 2);
    const caretaker = new Float32Array(POOL);
    const accent = new Float32Array(POOL * 3);
    const siteOf = new Int32Array(POOL);
    const radius = CONFIG.station.sealRadiusKm * 0.7;
    let k = 0;
    for (let s = 0; s < SITE_COUNT; s++) {
      const site = sites[s];
      for (let m = 0; m < PER; m++) {
        seed[k] = unit(s * 3.1 + m * 1.9);
        size[k] = 0.05 + unit(s * 9.2 + m * 4.4) * 0.03;
        siteOf[k] = s;
        const ang = unit(s * 31.7 + m * 7.13) * Math.PI * 2;
        const rad = Math.sqrt(unit(s * 5.3 + m * 2.9)) * radius;
        scatter[k * 2] = Math.cos(ang) * rad;
        scatter[k * 2 + 1] = Math.sin(ang) * rad;
        // One figure per hall (m === 0) is the caretaker kept when resting.
        caretaker[k] = m === 0 ? 1 : 0;
        accent[k * 3] = site.accent.r;
        accent[k * 3 + 1] = site.accent.g;
        accent[k * 3 + 2] = site.accent.b;
        k++;
      }
    }
    const pulseAttr = new THREE.InstancedBufferAttribute(pulse, 1);
    pulseAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
    geometry.setAttribute("aSize", new THREE.InstancedBufferAttribute(size, 1));
    geometry.setAttribute("aScatter", new THREE.InstancedBufferAttribute(scatter, 2));
    geometry.setAttribute("aCaretaker", new THREE.InstancedBufferAttribute(caretaker, 1));
    geometry.setAttribute("aAccent", new THREE.InstancedBufferAttribute(accent, 3));
    geometry.setAttribute("aPulse", pulseAttr);
    return { geometry, sites, POOL, PER, SITE_COUNT, siteOf, pulseAttr };
  }, []);

  const placed = useRef(false);
  const resting = useRef(0);

  useFrame(() => {
    if (!PLATFORM_PULSE.ready) return;
    const pulses = PLATFORM_PULSE.value;
    const fm = frescoRef.current;
    const cm = crowdRef.current;

    // Place both pools once — matrices never change again (the crowd's spread
    // lives in aScatter, the fresco is a fixed disc on the floor).
    if (!placed.current && (fm || cm)) {
      placed.current = true;
      if (fm) {
        for (let i = 0; i < fresco.count; i++) {
          const s = fresco.sites[i];
          POS.set(s.x, s.y + 0.01, s.z); // a hair above the platform floor
          const r = CONFIG.station.sealRadiusKm * 2.5;
          SCALE.set(r, r, r);
          matrix.compose(POS, SEAL_QUAT, SCALE);
          fm.setMatrixAt(i, matrix);
        }
        fm.instanceMatrix.needsUpdate = true;
      }
      if (cm) {
        let k = 0;
        for (let s = 0; s < crowd.SITE_COUNT; s++) {
          const site = crowd.sites[s];
          for (let m = 0; m < crowd.PER; m++) {
            matrix.makeTranslation(site.x, site.y, site.z);
            cm.setMatrixAt(k, matrix);
            k++;
          }
        }
        cm.instanceMatrix.needsUpdate = true;
      }
    }

    const night = 1 - sunPhase();

    if (fm) {
      for (let i = 0; i < fresco.count; i++) {
        fresco.pulseAttr.setX(i, pulses[fresco.sites[i].pulseIndex] ?? 0);
      }
      fresco.pulseAttr.needsUpdate = true;
      const mat = fm.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = CLOCK.t;
      mat.uniforms.uBreath.value = CLOCK.breath;
      mat.uniforms.uNight.value = night;
      mat.uniforms.uFogDensity.value = LIVE.fogDensity;
    }

    if (cm) {
      for (let k = 0; k < crowd.POOL; k++) {
        crowd.pulseAttr.setX(k, pulses[crowd.sites[crowd.siteOf[k]].pulseIndex] ?? 0);
      }
      crowd.pulseAttr.needsUpdate = true;
      const mat = cm.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = CLOCK.t;
      mat.uniforms.uNight.value = night;
      mat.uniforms.uFogDensity.value = LIVE.fogDensity;
      // Fade the resting caretaker in/out as the honesty badge flips.
      const restTarget = useUi.getState().mode === "resting" ? 1 : 0;
      resting.current += (restTarget - resting.current) * Math.min(1, CLOCK.dt * 1.5);
      mat.uniforms.uResting.value = resting.current;
    }
  });

  if (fresco.count === 0 && crowd.POOL === 0) return null;

  return (
    <group>
      {/* Art frescoes on the platform floor — submerged (renderOrder 3), so
          each station's real artwork glows up through the paper. */}
      {fresco.count > 0 && (
        <instancedMesh
          ref={frescoRef}
          args={[undefined, undefined, fresco.count]}
          geometry={fresco.geometry}
          renderOrder={3}
          frustumCulled={false}
        >
          <shaderMaterial
            vertexShader={FRESCO_VERT}
            fragmentShader={FRESCO_FRAG}
            uniforms={{
              uTime: { value: 0 },
              uBreath: { value: 0 },
              uNight: { value: 0 },
              uBase: { value: 1.15 },
              uFog: { value: LIVE.fog }, // palette-by-reference
              uFogDensity: { value: LIVE.fogDensity },
            }}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </instancedMesh>
      )}

      {/* The deep-platform crowd — backlit glow-figures gathering on dwell. */}
      {crowd.POOL > 0 && (
        <instancedMesh
          ref={crowdRef}
          args={[undefined, undefined, crowd.POOL]}
          geometry={crowd.geometry}
          renderOrder={3}
          frustumCulled={false}
        >
          <shaderMaterial
            vertexShader={CROWD_VERT}
            fragmentShader={CROWD_FRAG}
            uniforms={{
              uTime: { value: 0 },
              uGather: { value: 0.5 },
              uOpacity: { value: 0.9 },
              uResting: { value: 0 },
              uNight: { value: 0 },
              uBoost: { value: 1.25 },
              uLantern: { value: new THREE.Color("#ffcf85") }, // warm platform-lamp core
              uFog: { value: LIVE.fog },
              uFogDensity: { value: LIVE.fogDensity },
            }}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </instancedMesh>
      )}
    </group>
  );
}
