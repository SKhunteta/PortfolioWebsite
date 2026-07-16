// Platform life: the little crowd that gathers to board — the people of the
// floating world. When a train pulls in and the station's orb swells on dwell,
// a scatter of warm figures fades up on the paper at that stop; as the train
// slides away they thin back to an empty platform. The crowd is driven straight
// off the dwell pulse Stations.tsx already computes (platformPulse.ts) — the
// SAME signal that derives the live arrivals — so it is automatically honest:
// full in live and simulated mode, and an empty platform when the network
// rests.
//
// Most of the crowd just loiters and gathers, but a couple of figures per
// platform are given a COMMUTER role so the exchange with the train reads, not
// just the milling. On every platform an index-assigned boarder and alighter
// walk the entrance — a shared, stylized ukiyo-e gate (the same point the crowd
// gathers toward) — timed by the SIGN of the dwell pulse's velocity, which tells
// a train pulling IN from one pulling OUT:
//   • an ALIGHTER is born at the gate as the train arrives and strides out
//     across the paper to a loitering spot — someone who just stepped off;
//   • a BOARDER waits at its scatter spot, then converges on the gate as the
//     train pulls away and fades out at the threshold — someone stepping aboard.
// Nobody's matrix ever moves (still one draw call, static instances): the walk
// lives entirely in the shader, gated off the same honest pulse, so it can never
// outrun the trains and an empty network still means an empty platform.
//
// The crowd is not a uniform smear of dabs but three kinds of traveller, each a
// tiny ukiyo-e silhouette carved into the same billboard:
//   • plain folk — a standing body and head, warm ochre pigment;
//   • parasol-bearers — a tilted wagasa over the shoulder, a spot of the print's
//     own ai-blue or vermilion worn by the crowd. A DAYTIME signature: parasols
//     crowd the sunny platforms and thin after dark;
//   • lantern-carriers — a paper chōchin hung from the hand, unlit ochre by day
//     but an HDR lantern-gold core after dark so the bloom skirt catches it (the
//     same painted-HDR trick the train cores use). A NIGHT signature: as the
//     day-crowd thins, it is the lantern folk who remain and glow.
// So the platform reads as a warm parasol-dotted crowd by day and a sparse,
// lantern-lit one by night — a real inversion keyed to the honest sun over
// Seattle (?phase=night|day pins it), not just an emptier stop.
//
// ONE InstancedMesh of view-facing billboards (one draw call): a fixed pool of
// stations × PROFILE.platformMotes, scattered once around each platform and
// lifted to stand ON the paper. The figures never move between stations — only
// their opacity tracks their station's pulse — so the hot path just writes one
// float per figure and nudges the clock uniform; matrices are placed once. Each
// traveller's kind, parasol and lantern are drawn procedurally in the fragment
// shader, so the extra character costs no extra draw calls. Sumi-warm pigment,
// NORMAL-blended (little ochre figures darken the bright washi; additive light
// would die on it) and mixed toward the scene fog so a distant crowd dissolves
// into the kasumi.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { PROFILE } from "../world/device";
import { CONFIG } from "../world/config";
import { sunPhase } from "../world/sun";
import { useUi } from "../trains/store";
import { PLATFORM_SITES, PLATFORM_PULSE } from "./platformPulse";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "../map/watercolorGlsl";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aSeed;      // per-figure scatter/animation seed
  attribute float aSize;      // per-figure height, km
  attribute float aKind;      // 0 plain, 1 parasol-bearer, 2 lantern-carrier
  attribute float aPulse;     // this figure's station dwell pulse (updated per frame)
  attribute vec2 aScatter;    // offset from the platform entrance (km) at rest
  attribute float aCaretaker; // 1 = the lone figure kept when the network rests
  attribute float aRole;      // 0 loiterer, 1 boarder, 2 alighter (index-assigned)
  attribute float aFlow;      // signed dwell velocity: + train arriving, - departing
  uniform float uTime;
  uniform float uGather;      // how far the crowd tightens toward the entrance on dwell
  varying vec2 vUv;
  varying float vPulse;
  varying float vSeed;
  varying float vCare;
  varying float vKind;
  varying float vRole;
  varying float vFlow;
  void main() {
    vUv = uv;
    vPulse = aPulse;
    vSeed = aSeed;
    vCare = aCaretaker;
    vKind = aKind;
    vRole = aRole;
    vFlow = aFlow;
    // The loitering crowd tightens toward the entrance as its train pulls in and
    // loosens back to a scatter as it leaves — driven straight off the honest
    // dwell pulse, so the motion can never outrun the trains.
    vec3 gathered = vec3(aScatter.x, 0.0, aScatter.y) * (1.0 - uGather * aPulse);
    // A per-figure stagger so commuters trickle through the gate, never in unison,
    // and arriving/departing edges read off the SIGN of the dwell velocity.
    float ph = aSeed - 0.5;
    float arrive = smoothstep(0.05 + 0.12 * ph, 0.5, aFlow);
    float depart = smoothstep(0.05 + 0.12 * ph, 0.5, -aFlow);
    vec3 offset = gathered;
    float stride = 0.0;         // how hard this figure is walking (drives the lean)
    if (aRole > 1.5) {
      // Alighter: born at the entrance (offset 0) as the train pulls in, then
      // strides OUT to its loitering spot as the dwell rises — just stepped off.
      float walkOut = smoothstep(0.06 + 0.12 * ph, 0.6, aPulse);
      offset = mix(vec3(0.0), gathered, walkOut);
      stride = arrive;
    } else if (aRole > 0.5) {
      // Boarder: waits at its scatter spot, then converges on the entrance as the
      // train pulls out (opacity finishes the exit in the frag) — stepping aboard.
      offset = mix(gathered, vec3(0.0), depart);
      stride = depart;
    }
    vec4 center = modelMatrix * (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0) + vec4(offset, 0.0));
    vWorld = center.xz;
    vec4 mv = viewMatrix * center;
    // A crowd shifts its weight: a bob and sway on the clock, plus a slower
    // lateral wander so a few figures stroll rather than stand — each on its
    // own phase so the platform stirs rather than pulses.
    mv.x += sin(uTime * 0.9 + aSeed * 6.283) * 0.004;
    mv.x += sin(uTime * 0.32 + aSeed * 21.7) * 0.006;
    mv.y += sin(uTime * 2.1 + aSeed * 3.14) * 0.005;
    // View-facing billboard, taller than wide, anchored at the feet (uv.y = 0
    // sits on the paper, the figure stands up from there). Parasol- and
    // lantern-bearers get a wider quad so the canopy and the hung lantern have
    // room beside the body.
    float aspect = aKind > 0.5 ? 0.74 : 0.55;
    // A walking figure leans into the stride: a slight vertical stretch reads as
    // motion, not a teleport, without ever moving the (static) instance matrix.
    float stretch = 1.0 + 0.16 * stride;
    vec2 q = (uv - vec2(0.5, 0.0)) * vec2(aSize * aspect, aSize * stretch);
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
  varying float vCare;
  varying float vKind;
  varying float vRole;
  varying float vFlow;
  uniform vec3 uWarm;      // figure pigment — persimmon by day, amber by night (by reference)
  uniform vec3 uParasolA;  // ai-blue wagasa
  uniform vec3 uParasolB;  // vermilion wagasa
  uniform vec3 uSumi;      // ink — parasol pole, lantern string
  uniform vec3 uLantern;   // paper-lantern gold (painted HDR after dark)
  uniform float uOpacity;
  uniform float uResting;
  uniform float uNight;    // 0 full day .. 1 full night (1 - sunPhase)

  // Soft, anti-aliased line segment (for the parasol pole and lantern string).
  float sdSeg(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return 1.0 - smoothstep(r * 0.4, r, length(pa - ba * h));
  }

  void main() {
    float kind = vKind;
    // A crowd only reads once its station really hosts a train — a far train
    // grazing the dwell radius shouldn't sketch ghosts on every platform.
    float crowd = smoothstep(0.09, 0.7, vPulse);
    // When the whole network rests, keep one lone caretaker on a handful of
    // platforms so an empty print still has a person in it — not a ghost town.
    // In live/simulated mode uResting is 0 and the crowd stays fully honest.
    crowd = max(crowd, vCare * uResting * 0.55);
    // A boarder fades out as it reaches the gate on the departing edge — stepped
    // aboard — so the platform visibly sheds a figure as the train pulls away.
    if (vRole > 0.5 && vRole < 1.5) {
      float depart = smoothstep(0.05, 0.5, -vFlow);
      crowd *= 1.0 - smoothstep(0.2, 0.85, depart);
    }
    // Day/night character: parasol folk crowd the sunny platforms and thin after
    // dark; the lantern-carriers are the night's own, holding through it. The
    // platform empties out toward evening the way a real one does.
    if (kind < 1.5) crowd *= mix(1.0, 0.5, uNight);
    else            crowd *= mix(0.6, 1.0, uNight);
    if (crowd < 0.01) discard;

    // The figure: a vertical lozenge for the body, a small head above.
    vec2 p = vUv - vec2(0.5, 0.42);
    float body = 1.0 - smoothstep(0.26, 0.62, length(p * vec2(2.3, 1.05)));
    float head = 1.0 - smoothstep(0.06, 0.12, length((vUv - vec2(0.5, 0.80)) * vec2(1.5, 1.1)));
    float figMask = clamp(max(body, head * 0.9), 0.0, 1.0);
    // Warm ochre figures, each a touch different in weight.
    vec3 col = uWarm * (0.72 + 0.18 * fract(vSeed * 1.37));
    float glow = 0.0; // HDR (lantern) coverage that should survive to bloom

    if (kind > 0.5 && kind < 1.5) {
      // Parasol-bearer: a tilted wagasa held over the shoulder, a spot of the
      // print's own ai-blue or vermilion — the crowd wearing the palette.
      vec2 pc = (vUv - vec2(0.70, 0.85)) / vec2(0.19, 0.135);
      float canopy = 1.0 - smoothstep(0.75, 1.0, length(pc));
      float pole = sdSeg(vUv, vec2(0.52, 0.47), vec2(0.70, 0.84), 0.012);
      vec3 para = mix(uParasolA, uParasolB, step(0.5, fract(vSeed * 7.0)));
      col = mix(col, uSumi, pole * 0.9);
      col = mix(col, para, canopy);
      figMask = max(figMask, max(canopy, pole));
    } else if (kind > 1.5) {
      // Lantern-carrier: a paper chōchin hung from the near hand — unlit ochre
      // by day, an HDR lantern-gold core after dark (col climbs above 1.0 so the
      // bloom threshold at 1.0 catches it, exactly like the train cores). By day
      // uNight is 0 and the lantern is just a dim red paper shape.
      vec2 hl = (vUv - vec2(0.31, 0.40)) / vec2(0.055, 0.075);
      float lant = 1.0 - smoothstep(0.72, 1.0, length(hl));
      float str = sdSeg(vUv, vec2(0.35, 0.52), vec2(0.31, 0.47), 0.008);
      vec3 lantCol = uLantern * mix(0.5, 3.0, uNight);
      col = mix(col, uSumi, str * 0.8);
      col = mix(col, lantCol, lant);
      figMask = max(figMask, max(lant, str));
      glow = lant * uNight;
    }

    if (figMask < 0.01) discard;
    float a = figMask * crowd * uOpacity * (0.55 + 0.45 * fract(vSeed)) * (1.0 - fogFactor());
    // Keep a lit lantern from dissolving as fast as flat pigment.
    a = max(a, glow * crowd * (1.0 - fogFactor()) * 0.9);
    if (a < 0.004) discard;
    gl_FragColor = vec4(mix(col, uFog, fogFactor()), a);
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
  const { geometry, pulseAttr, flowAttr, siteOf } = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const seed = new Float32Array(POOL);
    const size = new Float32Array(POOL);
    const kind = new Float32Array(POOL);
    const role = new Float32Array(POOL); // 0 loiterer, 1 boarder, 2 alighter
    const pulse = new Float32Array(POOL);
    const flow = new Float32Array(POOL); // signed station dwell velocity (per frame)
    const siteOf = new Int32Array(POOL);
    // Per-figure scatter (offset from the entrance) rides an attribute now —
    // the instance matrices just place the pool at each site center, and the
    // shader spreads the crowd out from there and gathers it back on dwell.
    const scatter = new Float32Array(POOL * 2);
    const caretaker = new Float32Array(POOL);
    const radius = CONFIG.station.sealRadiusKm * 0.85;
    let k = 0;
    for (let s = 0; s < SITE_COUNT; s++) {
      for (let m = 0; m < PER; m++) {
        seed[k] = unit(s * 3.1 + m * 1.9);
        size[k] = 0.05 + unit(s * 9.2 + m * 4.4) * 0.035;
        siteOf[k] = s;
        const ang = unit(s * 31.7 + m * 7.13) * Math.PI * 2;
        const rad = Math.sqrt(unit(s * 5.3 + m * 2.9)) * radius;
        scatter[k * 2] = Math.cos(ang) * rad;
        scatter[k * 2 + 1] = Math.sin(ang) * rad;
        // A lone caretaker on every fifth platform — enough to keep a resting
        // print inhabited, sparse enough that it still reads as "resting".
        const isCaretaker = m === 0 && s % 5 === 0;
        caretaker[k] = isCaretaker ? 1 : 0;
        // Commuter role, index-assigned so every platform reliably fields both a
        // boarder and an alighter (m%3 → 1 boarder, 2 alighter, else loiterer).
        // The lone resting caretaker always loiters, so a resting print — where
        // there is no train and thus no arriving/departing edge — never empties.
        role[k] = isCaretaker ? 0 : m % 3 === 1 ? 1 : m % 3 === 2 ? 2 : 0;
        // Traveller kind: the lone caretaker carries a lantern (a warm glow to
        // hold a resting night-print), otherwise a deterministic mix of plain
        // folk, parasol-bearers and lantern-carriers.
        if (isCaretaker) {
          kind[k] = 2;
        } else {
          const r = unit(s * 13.3 + m * 5.7);
          kind[k] = r < 0.5 ? 0 : r < 0.78 ? 1 : 2; // ~50% plain, ~28% parasol, ~22% lantern
        }
        k++;
      }
    }
    const pulseAttr = new THREE.InstancedBufferAttribute(pulse, 1);
    pulseAttr.setUsage(THREE.DynamicDrawUsage);
    const flowAttr = new THREE.InstancedBufferAttribute(flow, 1);
    flowAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
    geometry.setAttribute("aSize", new THREE.InstancedBufferAttribute(size, 1));
    geometry.setAttribute("aKind", new THREE.InstancedBufferAttribute(kind, 1));
    geometry.setAttribute("aRole", new THREE.InstancedBufferAttribute(role, 1));
    geometry.setAttribute("aPulse", pulseAttr);
    geometry.setAttribute("aFlow", flowAttr);
    geometry.setAttribute("aScatter", new THREE.InstancedBufferAttribute(scatter, 2));
    geometry.setAttribute("aCaretaker", new THREE.InstancedBufferAttribute(caretaker, 1));
    return { geometry, pulseAttr, flowAttr, siteOf };
  }, [SITE_COUNT, POOL]);

  const placed = useRef(false);
  const resting = useRef(0);
  // Per-station dwell state for the arriving/departing signal: last frame's pulse
  // and the smoothed velocity derived from it (sized lazily to the site count).
  const prevPulse = useRef<Float32Array>(new Float32Array(0));
  const flowState = useRef<Float32Array>(new Float32Array(0));

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || !PLATFORM_PULSE.ready) return;

    // Place the pool once at each site center (the mesh exists now; the crowd's
    // spread lives in aScatter, so these matrices never change again).
    if (!placed.current) {
      placed.current = true;
      let k = 0;
      for (let s = 0; s < SITE_COUNT; s++) {
        const site = PLATFORM_SITES[s];
        for (let m = 0; m < PER; m++) {
          matrix.makeTranslation(site.x, site.y, site.z);
          mesh.setMatrixAt(k, matrix);
          k++;
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    // Per-frame: each figure inherits its station's live dwell pulse, plus the
    // signed velocity of that pulse — the arriving(+)/departing(−) signal that
    // tells boarders from alighters. One subtraction per site, smoothed so an
    // edge reads as a steady flow rather than a one-frame spike, and clamped to
    // keep the shader's ramps in range.
    const pulses = PLATFORM_PULSE.value;
    if (prevPulse.current.length !== SITE_COUNT) {
      prevPulse.current = new Float32Array(SITE_COUNT);
      flowState.current = new Float32Array(SITE_COUNT);
    }
    const prev = prevPulse.current;
    const flowS = flowState.current;
    const invDt = 1 / Math.max(CLOCK.dt, 1e-3);
    const smooth = Math.min(1, CLOCK.dt * 8);
    for (let s = 0; s < SITE_COUNT; s++) {
      const p = pulses[s] ?? 0;
      const v = Math.max(-1, Math.min(1, (p - prev[s]) * invDt * 0.6));
      flowS[s] += (v - flowS[s]) * smooth;
      prev[s] = p;
    }
    for (let k = 0; k < POOL; k++) {
      const s = siteOf[k];
      pulseAttr.setX(k, pulses[s] ?? 0);
      flowAttr.setX(k, flowS[s]);
    }
    pulseAttr.needsUpdate = true;
    flowAttr.needsUpdate = true;

    const mat = mesh.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = CLOCK.t;
    mat.uniforms.uFogDensity.value = LIVE.fogDensity;
    // Day/night drives who is on the platform: 1 - sunPhase, the honest sun over
    // Seattle. The parasol crowd thins toward evening and the lanterns light.
    mat.uniforms.uNight.value = 1 - sunPhase();
    // Fade the resting caretaker in/out as the badge flips, so it never pops.
    const restTarget = useUi.getState().mode === "resting" ? 1 : 0;
    resting.current += (restTarget - resting.current) * Math.min(1, CLOCK.dt * 1.5);
    mat.uniforms.uResting.value = resting.current;
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
          uParasolA: { value: new THREE.Color("#2f4d78") }, // ai-blue wagasa
          uParasolB: { value: new THREE.Color("#c1432f") }, // vermilion wagasa
          uSumi: { value: new THREE.Color("#3a2c20") }, // ink pole / string
          uLantern: { value: new THREE.Color("#ffcf85") }, // paper-lantern gold (× HDR at night)
          uOpacity: { value: 0.85 },
          uTime: { value: 0 },
          uGather: { value: 0.55 }, // crowd tightens ~halfway to the entrance on full dwell
          uResting: { value: 0 },
          uNight: { value: 0 },
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
