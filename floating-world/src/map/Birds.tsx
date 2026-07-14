// The flock: a skein of distant birds beating slowly across the Sound at the
// edges of the day. Hiroshige's signature mark — a scatter of shallow sumi
// chevrons high over the water — brought to life. Ambient paint like the
// ferries and floatplanes, NOT data: one migratory arc over Puget Sound,
// deterministic from the scene clock, never presented as live. The skein
// exists only at the golden hours: it fades up through the dawn twilight,
// thins to nothing under a bright midday sun, and is gone in the deep of
// night — the same honesty the seaplanes keep when they dissolve at dusk,
// here reading as "morning" and "evening".
//
// ONE InstancedMesh of view-facing billboards (one draw call): a lead bird
// with the rest strung behind it in a vee, matrices written imperatively in
// useFrame — the hot path never touches React. The wingbeat is painted in
// the fragment shader from the clock, so the flap costs nothing. Sumi ink,
// NORMAL-blended (a dark mark darkens the sky; additive light would die on
// the bright print) and mixed toward the scene fog so the far birds dissolve
// into the kasumi like everything else at drift distance. renderOrder 6.6,
// just over the mist bands, depthWrite false.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { projectLatLng } from "./network";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { sunPhase } from "../world/sun";
import { PROFILE } from "../world/device";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aPhase; // per-bird wingbeat offset — the skein isn't in lockstep
  attribute float aSize;  // per-bird billboard footprint, km
  varying vec2 vUv;
  varying float vPhase;
  void main() {
    vUv = uv;
    vPhase = aPhase;
    vec4 center = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vWorld = center.xz;
    vec4 mv = viewMatrix * center;
    // View-facing billboard: the mark always turns its face to the eye, so a
    // distant bird never foreshortens into a sliver.
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
  uniform vec3 uInk;
  uniform float uTime;
  uniform float uBeat;
  uniform float uFade;   // twilight gate (JS, from sunPhase)
  uniform float uOpacity;
  void main() {
    if (uFade < 0.004) discard;
    vec2 p = vUv * 2.0 - 1.0; // -1..1
    float ax = abs(p.x);
    if (ax > 0.96) discard;
    // The wingbeat: the dihedral of the two arms opens and closes on the
    // clock. Down-stroke lays the wings flat; up-stroke raises the tips.
    float flap = 0.5 + 0.5 * sin(uTime * uBeat + vPhase);
    float slope = mix(0.30, 0.74, flap);
    // Two straight arms meeting in a shallow vee, the body dipping at center.
    float arm = slope * ax - 0.12;
    float thickness = 0.16 * (1.0 - 0.55 * ax); // brush taper toward the tips
    float mark = 1.0 - smoothstep(0.0, thickness, abs(p.y - arm));
    mark *= 1.0 - smoothstep(0.66, 0.95, ax);   // feather the wingtips
    // A small ink lump for the body where the wings meet.
    mark = max(mark, (1.0 - smoothstep(0.0, 0.12, length(p - vec2(0.0, -0.12)))) * 0.9);
    if (mark < 0.01) discard;
    // Sumi ink, darkened a touch, dissolving into the mist with distance.
    vec3 c = uInk * 0.82;
    float a = mark * uFade * uOpacity * (1.0 - fogFactor());
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a);
  }
`;

interface Arc {
  pts: { x: number; z: number; y: number }[];
  cum: number[];
  lengthKm: number;
}

function arc(latLngAlt: [number, number, number][]): Arc {
  const pts = latLngAlt.map(([lat, lng, y]) => ({ ...projectLatLng(lat, lng), y }));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  }
  return { pts, cum, lengthKm: cum[cum.length - 1] };
}

// The migration line: low over the Sound off West Seattle, up Elliott Bay and
// out past Ballard, climbing away to the north over the open water toward
// Shoreline — a real skein's heading, well clear of the land so the birds
// read against the sky and the mist, not the town.
const SKEIN = arc([
  [47.575, -122.415, 1.15],
  [47.605, -122.428, 1.35],
  [47.638, -122.44, 1.5],
  [47.67, -122.445, 1.5],
  [47.702, -122.435, 1.42],
  [47.735, -122.418, 1.28],
]);

const PERIOD_S = 96; // one slow crossing per cycle
const BEAT = 7.5; // wingbeats — a couple of flaps a second

const lead = { x: 0, z: 0, y: 0, fx: 1, fz: 0 };

/** Lead-bird pose at clock time t: arc-length along the skein, plus the unit
 *  forward tangent the vee is strung behind. `fr` (0..1) also drives the
 *  enter/exit envelope so the flock sweeps through rather than looping in
 *  place. */
function leadAt(t: number): number {
  const fr = ((t % PERIOD_S) + PERIOD_S) % PERIOD_S / PERIOD_S;
  const s = fr * SKEIN.lengthKm;
  const { pts, cum } = SKEIN;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const seg = Math.max(1e-6, cum[i] - cum[i - 1]);
  const f = THREE.MathUtils.clamp((s - cum[i - 1]) / seg, 0, 1);
  const a = pts[i - 1];
  const b = pts[i];
  lead.x = a.x + (b.x - a.x) * f;
  lead.z = a.z + (b.z - a.z) * f;
  lead.y = a.y + (b.y - a.y) * f;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const inv = 1 / Math.max(1e-6, Math.hypot(dx, dz));
  lead.fx = dx * inv;
  lead.fz = dz * inv;
  return fr;
}

const COUNT = PROFILE.birdCount;
const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();

// Deterministic per-bird formation slot (no Math.random — reloads identical):
// a vee strung behind the lead, alternating sides, each row a little further
// back and wider, with a touch of altitude and size scatter so the skein
// isn't a rigid stencil.
interface Slot {
  back: number; // km behind the lead, along -heading
  side: number; // km to the side, along the perpendicular
  yLift: number; // km of altitude jitter
  size: number; // billboard footprint, km
  phase: number; // wingbeat offset
}
const SLOTS: Slot[] = Array.from({ length: COUNT }, (_, i) => {
  const row = Math.ceil(i / 2);
  const s = i === 0 ? 0 : i % 2 === 1 ? 1 : -1;
  const wobble = ((i * 12.9898) % 1) - 0.5;
  return {
    back: row * 0.26 + wobble * 0.06,
    side: s * row * 0.2,
    yLift: wobble * 0.08,
    size: 0.16 + (((i * 7.37) % 1) - 0.5) * 0.06,
    phase: (i * 1.7) % (Math.PI * 2),
  };
});

export function Birds() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    const phase = new Float32Array(COUNT);
    const size = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      phase[i] = SLOTS[i].phase;
      size[i] = SLOTS[i].size;
    }
    g.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phase, 1));
    g.setAttribute("aSize", new THREE.InstancedBufferAttribute(size, 1));
    return g;
  }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;

    // Birds are creatures of the twilight: a broad hump over the golden hours,
    // ~0 in the deep night and under a bright midday sun. sunPhase is
    // symmetric across noon, so the SAME gate lifts the skein at dawn AND at
    // dusk — the honest read of "morning" and "evening".
    const p = sunPhase();
    const dawn = THREE.MathUtils.smoothstep(p, 0.05, 0.22);
    const dusk = 1 - THREE.MathUtils.smoothstep(p, 0.45, 0.72);
    const twilight = Math.min(0.9, dawn * dusk);

    const fr = leadAt(CLOCK.t);
    // Enter from the south, exit to the north — no visible loop-around.
    const env =
      THREE.MathUtils.smoothstep(fr, 0.0, 0.08) * (1 - THREE.MathUtils.smoothstep(fr, 0.9, 1.0));

    m.uniforms.uFade.value = twilight * env;
    m.uniforms.uTime.value = CLOCK.t;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;

    const { x, z, y, fx, fz } = lead;
    // Perpendicular to the heading, in the XZ plane.
    const px = -fz;
    const pz = fx;
    for (let i = 0; i < COUNT; i++) {
      const s = SLOTS[i];
      position.set(
        x - fx * s.back + px * s.side,
        y + s.yLift,
        z - fz * s.back + pz * s.side
      );
      matrix.makeTranslation(position.x, position.y, position.z);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
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
          uInk: { value: LIVE.landmark }, // palette-by-reference: warm sepia ink
          uTime: { value: 0 },
          uBeat: { value: BEAT },
          uFade: { value: 0 },
          uOpacity: { value: 0.9 },
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
