// The lighthouse's slow sentence: after dark, West Point and Alki Point
// sweep real-cadence rotating beams over the Sound. West Point turns its
// real alternating white/red pair (two opposed panels, one rotation per
// 10 s — a flash every 5 s, alternating colour); Alki Point sweeps a single
// white beam on its real 5 s flash. Where a beam crosses the water it
// briefly reveals the things the night hides — a foam wave crest, a seal's
// head, once in a rare while the orcas' fins — a rolling one-second
// spotlight that makes you watch the dark between sweeps.
//
// Ambient truth at the lighthouse tier: deterministic from the clock,
// night-only (the whole group hides itself by day — zero cost), never a
// sighting feed. TWO draw calls: one InstancedMesh of flat beam wedges
// (additive light on the water, multiplied by the fog factor per the
// additive-layer contract), and one InstancedMesh of billboarded reveal
// sprites (normal-blended sumi ink + seigaiha foam, mixed toward LIVE.fog).
// Reveal positions/types re-seed every few minutes from a hashed epoch, so
// the water never shows the same set twice, and each mark's alpha is a
// pulse keyed to the beam's angular pass — lit for about a second, with a
// slightly longer afterglow than attack, then gone until the next sweep
// finds something else.
//
// ?beams=off clears the sweeps; ?beams=on pins them lit (any phase) for
// demos and smoke tests.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { projectLatLng } from "./network";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { sunPhase } from "../world/sun";
import { useUi } from "../trains/store";
import { LIGHTS } from "./CityLights";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

function parseOverride(): boolean | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("beams");
  if (raw == null) return null;
  return raw !== "off" && raw !== "0";
}
const OVERRIDE = parseOverride();

// ---------------------------------------------------------------------------
// Sweep configuration. Cadence (period + phase) is read from the same LIGHTS
// entries that drive the towers' winks in CityLights.tsx — one source of
// truth, so the lantern and its beam always keep the same time. The water
// sector (where reveals may surface) and the beam's reach are authored here:
// conservative open-water fans that never land a seal on a drawn shoreline.
// Angles are world azimuth in the projected xz plane: 0 = east, π/2 = north
// (projectLatLng puts north at −z), direction (cos a, 0, −sin a).

interface Sweep {
  label: string; // must match the CityLights entry
  dual: boolean; // West Point's real alternating white/red panel pair
  sectorCenter: number; // radians, world azimuth of the open-water fan
  sectorHalf: number; // radians, half-width of that fan
  reachKm: number; // how far the beam (and its reveals) carry
  slots: number; // how many hidden things wait in this light's water
}

const SWEEPS: Sweep[] = [
  {
    // Discovery Park at its back (east), the whole main basin ahead.
    label: "West Point Light",
    dual: true,
    sectorCenter: Math.PI * 0.9, // just north of due west
    sectorHalf: Math.PI * 0.52,
    reachKm: 2.4,
    slots: 10,
  },
  {
    // Alki peninsula behind (east/southeast); water west through north.
    label: "Alki Point Light",
    dual: false,
    sectorCenter: Math.PI, // due west
    sectorHalf: Math.PI * 0.46,
    reachKm: 1.7,
    slots: 10,
  },
];

interface SweepRT extends Sweep {
  x: number;
  z: number;
  periodS: number;
  phase: number;
}

function resolveSweeps(): SweepRT[] {
  return SWEEPS.map((s) => {
    const light = LIGHTS.find((l) => l.label === s.label && l.lighthouse);
    if (!light) throw new Error(`LighthouseBeams: no CityLights entry for ${s.label}`);
    const { x, z } = projectLatLng(light.lat, light.lng);
    return { ...s, x, z, periodS: light.lighthouse!.periodS, phase: light.lighthouse!.phase };
  });
}

// One beam instance per panel: West Point white + red, Alki white.
const BEAM_COLORS: { sweep: number; angleOffset: number; color: THREE.Color; gain: number }[] = [
  { sweep: 0, angleOffset: 0, color: new THREE.Color("#ffe9c4"), gain: 1.0 },
  { sweep: 0, angleOffset: Math.PI, color: new THREE.Color("#ff6a55"), gain: 0.55 }, // the red panel
  { sweep: 1, angleOffset: 0, color: new THREE.Color("#ffe9c4"), gain: 1.0 },
];
const BEAM_COUNT = BEAM_COLORS.length;

// ---------------------------------------------------------------------------
// The beam wedge: a flat trapezoid on the water, hinged at the tower, built
// along +x and yawed live. Additive painted light — hot at the hearth, dying
// along its length and at its soft edges, peak well under the bloom line —
// and MULTIPLIED by the fog factor (the additive-layer fog contract).

const BEAM_HALF_NEAR = 0.012;
const BEAM_HALF_FAR = 0.11;

function buildBeamGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  // u runs 0 at the tower → 1 at the far tip; v is 0/1 across the wedge.
  // Length is unit — per-instance reach lives in aReach so one geometry
  // serves both lights.
  geo.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array([
        0.02, 0, -BEAM_HALF_NEAR,
        1, 0, -BEAM_HALF_FAR,
        1, 0, BEAM_HALF_FAR,
        0.02, 0, BEAM_HALF_NEAR,
      ]),
      3
    )
  );
  geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  return geo;
}

const BEAM_VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute vec3 aColor;
  attribute float aGlow;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vGlow;
  void main() {
    vUv = uv;
    vColor = aColor;
    vGlow = aGlow;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const BEAM_FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vGlow;
  uniform float uT;
  void main() {
    if (vGlow < 0.004) discard;
    float along = vUv.x;
    float across = abs(vUv.y - 0.5) * 2.0;
    // Soft-edged blade: a gaussian across, an exponential die-off along,
    // easing in off the hearth and feathering out before the tip.
    float lat = exp(-across * across * 3.2) * (1.0 - smoothstep(0.72, 1.0, across));
    float fall = exp(-along * 2.4) * (1.0 - smoothstep(0.7, 1.0, along));
    float rise = smoothstep(0.0, 0.05, along);
    // The light lives on the water: a faint seigaiha shimmer rolls through
    // the blade so it reads as a beam ACROSS waves, not a painted stripe.
    float shimmer = 0.82 + 0.36 * wcFbm(vWorld * 3.1 + vec2(uT * 0.18, -uT * 0.11));
    float i = lat * fall * rise * shimmer * vGlow;
    // Additive layer: multiply by the fog factor or the horizon breaks.
    gl_FragColor = vec4(vColor * i * (1.0 - fogFactor()), 1.0);
  }
`;

// ---------------------------------------------------------------------------
// The reveals: billboarded sprites anchored at the waterline, each painting
// one of three marks in the print's own language — a foam wave crest, a
// seal's round head, or a pair of orca fins (the rare one). Normal-blended
// pigment, alpha driven per-frame by the beam's pass.

const REVEAL_VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aType;
  attribute float aPulse;
  attribute float aScale;
  varying vec2 vUv;
  varying float vType;
  varying float vPulse;
  void main() {
    vUv = uv;
    vType = aType;
    vPulse = aPulse;
    vec4 world = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vWorld = world.xz;
    vec4 mv = viewMatrix * world;
    // Billboarded, anchored just below the waterline so the mark rises out
    // of the water rather than floating over it.
    mv.xy += vec2(uv.x - 0.5, uv.y - 0.06) * aScale;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const REVEAL_FRAG = /* glsl */ `
  ${FOG_VARYINGS_FRAG}
  varying vec2 vUv;
  varying float vType;
  varying float vPulse;
  uniform vec3 uInk;
  uniform vec3 uFoam;
  uniform float uOpacity;

  // A raked dorsal-fin silhouette: base at y=0 centred on cx, tapering to a
  // swept-back tip at height h.
  float fin(vec2 p, float cx, float h, float w0, float rake) {
    float yy = clamp(p.y / h, 0.0, 1.0);
    float w = w0 * (1.0 - yy * 0.92);
    float dx = abs(p.x - cx - rake * p.y);
    return smoothstep(w + 0.03, w - 0.01, dx)
      * smoothstep(h, h * 0.8, p.y)
      * step(0.0, p.y);
  }

  void main() {
    if (vPulse < 0.01) discard;
    // Local frame: x −1..1 across the sprite, y 0 at the waterline → 1 up.
    vec2 p = vec2((vUv.x - 0.5) * 2.0, vUv.y);
    float ink = 0.0;
    float foam = 0.0;
    if (vType < 0.5) {
      // A wave crest: one arc of seigaiha foam catching the light.
      float crest = 0.2 - 0.11 * p.x * p.x;
      foam = smoothstep(0.075, 0.02, abs(p.y - crest)) * smoothstep(1.0, 0.5, abs(p.x));
    } else if (vType < 1.5) {
      // A seal's head: a round sumi bump with a small snout, a whisper of
      // foam where it parts the water.
      vec2 h = (p - vec2(-0.03, 0.16)) * vec2(1.0, 1.3);
      ink = smoothstep(0.19, 0.14, length(h));
      vec2 s = (p - vec2(0.15, 0.1)) * vec2(1.3, 2.1);
      ink = max(ink, smoothstep(0.1, 0.05, length(s)));
      foam = smoothstep(0.05, 0.0, abs(p.y - 0.02)) * smoothstep(0.55, 0.2, abs(p.x)) * 0.55;
    } else {
      // The orcas: the bull's tall raked fin and a smaller one beside it,
      // foam pooling at their waterline — the rarest thing the beam finds.
      ink = max(fin(p, -0.28, 0.88, 0.17, -0.3), fin(p, 0.3, 0.52, 0.13, -0.26));
      foam = smoothstep(0.06, 0.0, abs(p.y - 0.02)) * smoothstep(0.9, 0.3, abs(p.x)) * 0.6;
    }
    float a = clamp(ink + foam, 0.0, 1.0);
    if (a < 0.01) discard;
    vec3 c = (uInk * ink + uFoam * foam) / max(ink + foam, 1e-4);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a * vPulse * uOpacity);
  }
`;

// ---------------------------------------------------------------------------

const TWO_PI = Math.PI * 2;
const EPOCH_S = 180; // reveals re-seed every few minutes — never the same water twice
const LIT_S = 1.0; // the rolling spotlight: about a second in the light
// Reveal type odds per slot: crests common, seals occasional, fins rare.
const SEAL_P = 0.24;
const ORCA_P = 0.035;

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

interface Slot {
  sweep: number;
  bearing: number;
  x: number;
  z: number;
  type: number; // 0 crest | 1 seal | 2 orca
}

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();

export function LighthouseBeams() {
  const groupRef = useRef<THREE.Group>(null);
  const beamRef = useRef<THREE.InstancedMesh>(null);
  const beamMatRef = useRef<THREE.ShaderMaterial>(null);
  const revealRef = useRef<THREE.InstancedMesh>(null);
  const revealMatRef = useRef<THREE.ShaderMaterial>(null);

  const sweeps = useMemo(resolveSweeps, []);
  const slotCount = useMemo(() => sweeps.reduce((n, s) => n + s.slots, 0), [sweeps]);
  const slots = useMemo<Slot[]>(
    () => Array.from({ length: slotCount }, () => ({ sweep: 0, bearing: 0, x: 0, z: 0, type: 0 })),
    [slotCount]
  );

  const { beamGeometry, beamColorAttr, beamGlowAttr } = useMemo(() => {
    const beamGeometry = buildBeamGeometry();
    const beamColorAttr = new THREE.InstancedBufferAttribute(new Float32Array(BEAM_COUNT * 3), 3);
    const beamGlowAttr = new THREE.InstancedBufferAttribute(new Float32Array(BEAM_COUNT), 1);
    beamGlowAttr.setUsage(THREE.DynamicDrawUsage);
    BEAM_COLORS.forEach((b, i) => beamColorAttr.setXYZ(i, b.color.r, b.color.g, b.color.b));
    beamGeometry.setAttribute("aColor", beamColorAttr);
    beamGeometry.setAttribute("aGlow", beamGlowAttr);
    return { beamGeometry, beamColorAttr, beamGlowAttr };
  }, []);

  const { revealGeometry, typeAttr, pulseAttr, scaleAttr } = useMemo(() => {
    const revealGeometry = new THREE.PlaneGeometry(1, 1);
    const typeAttr = new THREE.InstancedBufferAttribute(new Float32Array(slotCount), 1);
    const pulseAttr = new THREE.InstancedBufferAttribute(new Float32Array(slotCount), 1);
    const scaleAttr = new THREE.InstancedBufferAttribute(new Float32Array(slotCount), 1);
    typeAttr.setUsage(THREE.DynamicDrawUsage);
    pulseAttr.setUsage(THREE.DynamicDrawUsage);
    scaleAttr.setUsage(THREE.DynamicDrawUsage);
    revealGeometry.setAttribute("aType", typeAttr);
    revealGeometry.setAttribute("aPulse", pulseAttr);
    revealGeometry.setAttribute("aScale", scaleAttr);
    return { revealGeometry, typeAttr, pulseAttr, scaleAttr };
  }, [slotCount]);

  const epochRef = useRef(-1);
  const orcaCaptioned = useRef(false);

  useFrame(() => {
    const group = groupRef.current;
    const beams = beamRef.current;
    const bm = beamMatRef.current;
    const reveals = revealRef.current;
    const rm = revealMatRef.current;
    if (!group || !beams || !bm || !reveals || !rm) return;

    // Night creature, harder-gated than the winks: the beam only exists
    // after dark (a blade of light is nothing against the sun), easing up
    // through dusk. ?beams=on pins it lit for demos.
    const s = sunPhase();
    const gate = OVERRIDE === true ? 1 : Math.min(1, Math.max(0, (0.5 - s) / 0.3));
    group.visible = gate > 0.02;
    if (!group.visible) return;

    const t = CLOCK.t;
    bm.uniforms.uT.value = t;
    bm.uniforms.uFogDensity.value = LIVE.fogDensity;
    rm.uniforms.uOpacity.value = LIVE.ferryOpacity;
    rm.uniforms.uFogDensity.value = LIVE.fogDensity;

    // Re-seed the hidden things on a slow hashed epoch. Deterministic from
    // the clock — the same minute always hides the same seal.
    const epoch = Math.floor(t / EPOCH_S);
    if (epoch !== epochRef.current) {
      epochRef.current = epoch;
      let i = 0;
      for (let si = 0; si < sweeps.length; si++) {
        const sw = sweeps[si];
        for (let k = 0; k < sw.slots; k++, i++) {
          const seed = epoch * 7919 + i * 131;
          const slot = slots[i];
          slot.sweep = si;
          slot.bearing = sw.sectorCenter + (hash(seed) - 0.5) * 2 * sw.sectorHalf;
          const r = 0.3 + Math.pow(hash(seed + 1), 0.7) * (sw.reachKm - 0.45);
          slot.x = sw.x + Math.cos(slot.bearing) * r;
          slot.z = sw.z - Math.sin(slot.bearing) * r;
          const roll = hash(seed + 2);
          slot.type = roll < ORCA_P ? 2 : roll < ORCA_P + SEAL_P ? 1 : 0;
          typeAttr.setX(i, slot.type);
          scaleAttr.setX(i, slot.type === 2 ? 0.17 : slot.type === 1 ? 0.09 : 0.13);
          matrix.makeTranslation(slot.x, 0, slot.z);
          reveals.setMatrixAt(i, matrix);
        }
      }
      typeAttr.needsUpdate = true;
      scaleAttr.needsUpdate = true;
      reveals.instanceMatrix.needsUpdate = true;
    }

    // Yaw each beam panel to its live sweep angle and set its glow.
    for (let b = 0; b < BEAM_COUNT; b++) {
      const cfg = BEAM_COLORS[b];
      const sw = sweeps[cfg.sweep];
      const angle = sw.phase + (t * TWO_PI) / sw.periodS + cfg.angleOffset;
      matrix.makeRotationY(angle);
      matrix.scale(position.set(sw.reachKm, 1, 1));
      matrix.setPosition(sw.x, 0.045, sw.z);
      beams.setMatrixAt(b, matrix);
      // Peak ~0.6: painted light, never a bloom source.
      beamGlowAttr.setX(b, gate * 0.6 * cfg.gain);
    }
    beams.instanceMatrix.needsUpdate = true;
    beamGlowAttr.needsUpdate = true;

    // Each reveal's pulse: how close its own light's beam is to its bearing,
    // in sweep time — lit ~LIT_S seconds per pass, the fade-out a touch
    // longer than the fade-in so the mark lingers a heartbeat after the
    // light moves on.
    for (let i = 0; i < slotCount; i++) {
      const slot = slots[i];
      const sw = sweeps[slot.sweep];
      const omega = TWO_PI / sw.periodS;
      const span = sw.dual ? Math.PI : TWO_PI; // the red panel reveals too
      const beamAngle = sw.phase + t * omega;
      let d = (beamAngle - slot.bearing) % span;
      if (d < 0) d += span;
      if (d > span / 2) d -= span; // signed: <0 approaching, >0 passed
      const sigma = omega * (LIT_S * 0.33) * (d > 0 ? 1.7 : 1.0);
      const pulse = Math.exp(-(d * d) / (sigma * sigma)) * gate;
      pulseAttr.setX(i, pulse);
      // One quiet caption per visit, the first time a sweep finds the fins.
      if (slot.type === 2 && pulse > 0.6 && !orcaCaptioned.current) {
        orcaCaptioned.current = true;
        useUi.getState().setCaption(`the beam crosses fins — orcas off ${sw.label.replace(" Light", "")}`);
      }
    }
    pulseAttr.needsUpdate = true;
  });

  if (OVERRIDE === false) return null;

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={beamRef}
        args={[undefined, undefined, BEAM_COUNT]}
        geometry={beamGeometry}
        renderOrder={5.5}
        frustumCulled={false}
      >
        <shaderMaterial
          ref={beamMatRef}
          vertexShader={BEAM_VERT}
          fragmentShader={BEAM_FRAG}
          uniforms={{
            uT: { value: 0 },
            uFog: { value: LIVE.fog },
            uFogDensity: { value: LIVE.fogDensity },
          }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
      <instancedMesh
        ref={revealRef}
        args={[undefined, undefined, slotCount]}
        geometry={revealGeometry}
        renderOrder={6}
        frustumCulled={false}
      >
        <shaderMaterial
          ref={revealMatRef}
          vertexShader={REVEAL_VERT}
          fragmentShader={REVEAL_FRAG}
          uniforms={{
            uInk: { value: LIVE.label },
            uFoam: { value: LIVE.seigaiha },
            uOpacity: { value: LIVE.ferryOpacity },
            uFog: { value: LIVE.fog },
            uFogDensity: { value: LIVE.fogDensity },
          }}
          transparent
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </instancedMesh>
    </group>
  );
}
