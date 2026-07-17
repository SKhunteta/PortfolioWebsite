// The crow commute: every evening, tens of thousands of Seattle crows stream
// northeast to the great communal roost in the Bothell wetlands off North
// Creek, and every morning they scatter back over the city — a real river of
// birds locals set their evenings by. Ambient paint like the gulls over the
// Sound (map/Birds.tsx), NOT data: one commuting corridor, deterministic from
// the scene clock, never presented as live.
//
// Where the gull skein keeps the symmetric golden-hours gate, the commute is
// DIRECTIONAL and one-sided: the same twilight band lifts the stream at both
// ends of the day, but the sun's trajectory decides which way it flows —
// roost-bound (city → Bothell) as the sun falls, city-bound (Bothell → city)
// as it rises, and gone under a bright midday sun or in the deep of night.
// Crows are the classic sumi subject — a brush blob and two strokes — so the
// marks fly darker and floppier than the gulls' shallow chevrons.
//
// ONE InstancedMesh of view-facing billboards (one draw call): a loose
// straggling river rather than a vee, each crow on its own fraction of the
// corridor with its own pace, fading in at one end and out at the other so
// the stream never visibly loops. Matrices written imperatively in useFrame —
// the hot path never touches React. The wingbeat is painted in the fragment
// shader from the clock. Sumi ink, NORMAL-blended (a dark mark darkens the
// sky; additive light would die on the bright print) and mixed toward the
// scene fog. renderOrder 6.6, beside the gulls, depthWrite false. The whole
// mesh hides itself outside the twilight windows, so midday costs nothing.
//
// ?crows=off clears the sky for tests and screenshots.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { projectLatLng } from "./network";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { sunPhase, sunPhaseAt, getPhaseOverride } from "../world/sun";
import { PROFILE } from "../world/device";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

function parseOverride(): boolean | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("crows");
  if (raw == null) return null;
  return raw !== "off" && raw !== "0";
}
const OVERRIDE = parseOverride();

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aPhase; // per-crow wingbeat offset — the river isn't in lockstep
  attribute float aSize;  // per-crow billboard footprint, km
  attribute float aFade;  // per-crow corridor-end envelope, written per frame
  varying vec2 vUv;
  varying float vPhase;
  varying float vFade;
  void main() {
    vUv = uv;
    vPhase = aPhase;
    vFade = aFade;
    vec4 center = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vWorld = center.xz;
    vec4 mv = viewMatrix * center;
    // View-facing billboard, like the gulls: the mark always turns its face
    // to the eye, so a distant crow never foreshortens into a sliver.
    mv.xy += (uv - 0.5) * aSize;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying vec2 vUv;
  varying float vPhase;
  varying float vFade;
  uniform vec3 uInk;
  uniform float uTime;
  uniform float uBeat;
  uniform float uFade;   // twilight-commute gate (JS, from the sun's trajectory)
  uniform float uOpacity;
  void main() {
    float fade = uFade * vFade;
    if (fade < 0.004) discard;
    vec2 p = vUv * 2.0 - 1.0; // -1..1
    float ax = abs(p.x);
    if (ax > 0.96) discard;
    // The crow's beat: deeper and floppier than the gull's shallow rows —
    // the down-stroke folds well below level, the up-stroke throws the tips.
    float flap = 0.5 + 0.5 * sin(uTime * uBeat + vPhase);
    float slope = mix(0.14, 0.9, flap);
    float arm = slope * ax - 0.16;
    float thickness = 0.2 * (1.0 - 0.5 * ax); // heavier brush, tapered tips
    float mark = 1.0 - smoothstep(0.0, thickness, abs(p.y - arm));
    mark *= 1.0 - smoothstep(0.6, 0.94, ax); // feather the wingtips
    // The body: a rounder ink lump than the gull's — a crow leads with bulk.
    mark = max(mark, (1.0 - smoothstep(0.0, 0.16, length(p - vec2(0.0, -0.14)))) * 0.95);
    if (mark < 0.01) discard;
    // True sumi — darker than the gulls' sepia — dissolving into the mist.
    vec3 c = uInk * 0.68;
    float a = mark * fade * uOpacity * (1.0 - fogFactor());
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a);
  }
`;

interface Corridor {
  pts: { x: number; z: number; y: number }[];
  cum: number[];
  lengthKm: number;
}

function corridor(latLngAlt: [number, number, number][]): Corridor {
  const pts = latLngAlt.map(([lat, lng, y]) => ({ ...projectLatLng(lat, lng), y }));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  }
  return { pts, cum, lengthKm: cum[cum.length - 1] };
}

// The commuting line: up off the Central District and Capitol Hill, over
// Montlake and Union Bay, along the west shore of Lake Washington, across
// the lake's north end at Kenmore and down into the Bothell roost — the real
// evening heading, flown low the way commuting crows do (well under the
// gulls' altitude over the Sound).
const COMMUTE = corridor([
  [47.598, -122.305, 0.55], // gathering off the Central District
  [47.622, -122.3, 0.62], // Capitol Hill's north slope
  [47.645, -122.293, 0.68], // over Montlake and the Cut
  [47.672, -122.28, 0.75], // Union Bay, up the shore
  [47.7, -122.268, 0.82], // Sand Point
  [47.73, -122.25, 0.85], // toward Lake City
  [47.755, -122.22, 0.78], // across the lake's north end at Kenmore
  [47.758, -122.195, 0.62], // settling into the Bothell roost
]);

const PERIOD_S = 150; // one crow's full run of the corridor
const BEAT = 5.6; // slower, deeper wingbeat than the gulls' 7.5

const COUNT = PROFILE.crowCount;

// Deterministic per-crow river slot (no Math.random — reloads identical):
// loose straggling groups strung along the corridor, each crow with its own
// lateral drift, altitude, size and pace, so the stream reads as a living
// river rather than a stencil.
interface Slot {
  offset: number; // starting fraction along the corridor
  pace: number; // per-crow speed jitter around the shared period
  side: number; // km of lateral drift off the corridor line
  yLift: number; // km of altitude jitter
  size: number; // billboard footprint, km
  phase: number; // wingbeat offset
}
const SLOTS: Slot[] = Array.from({ length: COUNT }, (_, i) => {
  const group = Math.floor(i / 5);
  const gBase = (group * 0.618034) % 1; // golden-ratio group spacing
  const j1 = ((i * 12.9898) % 1) - 0.5;
  const j2 = ((i * 7.37) % 1) - 0.5;
  return {
    offset: (gBase + ((i * 3.31) % 1) * 0.07) % 1,
    pace: 1 + j1 * 0.14,
    side: j2 * 0.5,
    yLift: j1 * 0.16,
    size: 0.11 + (((i * 5.13) % 1) - 0.5) * 0.04,
    phase: (i * 1.7) % (Math.PI * 2),
  };
});

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const ss = THREE.MathUtils.smoothstep;

/** Point on the corridor at fraction fr (0 = city end, 1 = the roost),
 *  pushed sideways by the local perpendicular. Writes into `position`. */
function corridorAt(fr: number, side: number) {
  const s = fr * COMMUTE.lengthKm;
  const { pts, cum } = COMMUTE;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const seg = Math.max(1e-6, cum[i] - cum[i - 1]);
  const f = THREE.MathUtils.clamp((s - cum[i - 1]) / seg, 0, 1);
  const a = pts[i - 1];
  const b = pts[i];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const inv = 1 / Math.max(1e-6, Math.hypot(dx, dz));
  position.set(
    a.x + dx * f - dz * inv * side,
    a.y + (b.y - a.y) * f,
    a.z + dz * f + dx * inv * side
  );
}

export function Crows() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const phaseRef = useRef(sunPhase());
  const velRef = useRef(0);

  const { geometry, fadeAttr } = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    const phase = new Float32Array(COUNT);
    const size = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      phase[i] = SLOTS[i].phase;
      size[i] = SLOTS[i].size;
    }
    g.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phase, 1));
    g.setAttribute("aSize", new THREE.InstancedBufferAttribute(size, 1));
    const fadeAttr = new THREE.InstancedBufferAttribute(new Float32Array(COUNT).fill(1), 1);
    fadeAttr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("aFade", fadeAttr);
    return { geometry: g, fadeAttr };
  }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;

    if (OVERRIDE === false) {
      mesh.visible = false;
      return;
    }

    // The commute lives in the twilight band — but unlike the gulls' gate it
    // needs a SIGN: sunPhase carries no rising/falling direction, so recover
    // it from the sun's trajectory the way the Red Fuji dawn does
    // (map/Landmarks.tsx dawnDuskEnv). Live: sample the honest sun 10 min
    // ahead. Override (observe sweep): a smoothed velocity works. A
    // pinned-static phase defaults to the ROOST-BOUND stream — the evening
    // commute is the iconic one.
    const p = sunPhase();
    let dir: number;
    if (getPhaseOverride() == null) {
      const ahead = sunPhaseAt(new Date(Date.now() + 10 * 60 * 1000));
      dir = ahead > p + 1e-4 ? 1 : ahead < p - 1e-4 ? -1 : 0;
    } else {
      const dp = p - phaseRef.current;
      velRef.current = velRef.current * 0.9 + (Math.abs(dp) > 1e-5 ? Math.sign(dp) : 0) * 0.1;
      dir = Math.abs(velRef.current) < 0.05 ? -1 : Math.sign(velRef.current);
    }
    phaseRef.current = p;

    const band = ss(p, 0.03, 0.18) * (1 - ss(p, 0.42, 0.7));
    const gate = Math.min(0.92, band);

    if (gate < 0.004) {
      mesh.visible = false; // midday and deep night cost nothing
      return;
    }
    mesh.visible = true;

    m.uniforms.uFade.value = gate;
    m.uniforms.uTime.value = CLOCK.t;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;

    // Roost-bound as the sun falls, city-bound as it rises: the direction
    // only flips which way each crow runs its fraction — the marks are
    // view-facing billboards, so motion IS the heading.
    const roostBound = dir <= 0;
    for (let i = 0; i < COUNT; i++) {
      const s = SLOTS[i];
      const fr = (((CLOCK.t * s.pace) / PERIOD_S + s.offset) % 1 + 1) % 1;
      // Fade in at one corridor end, out at the other — the river never
      // visibly loops around.
      const env = ss(fr, 0, 0.07) * (1 - ss(fr, 0.92, 1));
      fadeAttr.setX(i, env);
      corridorAt(roostBound ? fr : 1 - fr, s.side);
      position.y += s.yLift;
      matrix.makeTranslation(position.x, position.y, position.z);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    fadeAttr.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, COUNT]}
      geometry={geometry}
      renderOrder={6.6}
      frustumCulled={false}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          // palette-by-reference: the stable sepia ink the gulls fly in (the
          // label ink flips to cream after dark — right for HUD text on a
          // lantern print, wrong for a bird mark at dusk).
          uInk: { value: LIVE.landmark },
          uTime: { value: 0 },
          uBeat: { value: BEAT },
          uFade: { value: 0 },
          uOpacity: { value: 0.92 },
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
