// Orcas on the Sound: a Southern Resident matriline — the icon of the Salish
// Sea — ranging the central basin west of Elliott Bay, porpoising through
// the Prussian water in sequence. Dorsal fins as sumi strokes cutting the
// seigaiha waves, foam-white eyepatch and saddle, a puff of blow at each
// surfacing. Whale-among-waves is a canonical woodblock composition; here it
// is also the truest thing the water can show.
//
// Background paint, not data — like Rainier and the ferries the pod belongs
// to the page: real geography (the shipping-lane basin the resident pods
// really travel) and a real surface-and-dive rhythm. And like the residents,
// it MOVES with the day: the foraging ground migrates around a loop of the
// Sound keyed to the real Seattle hour (north through the small hours, west
// off Bainbridge by morning, south past Blake at midday, back up the Elliott
// Bay side by evening), milling as it goes. Deterministic from the clock; it
// is NOT a live sighting feed and never claims to be one — the honesty rule
// holds; this is the ferry tier.
// ?orcas=off hides the pod (?orcas=on / any other value forces it on);
// ?tod= pins the time of day (see below).
//
// ONE InstancedMesh (one draw call, matching the instanced-everything rule):
// matrices, a submersion fade and a surfacing burst written imperatively in
// useFrame — the hot path never touches React. Watercolor wash + fog contract
// like every normal-blended layer, renderOrder 6 (beside the ferries, riding
// the surface), depthWrite false. Body, patch and blow are painted by MIX,
// never ADD, so the foam-white can't cross the bright-paper bloom line.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { projectLatLng } from "./network";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { localHour } from "../world/traffic";
import { observeDayFrac } from "../world/observe";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

function parseOverride(): boolean | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("orcas");
  if (raw == null) return null;
  return raw !== "off" && raw !== "0";
}
const OVERRIDE = parseOverride();

// Time of day drives WHERE the pod is. Southern Residents range the whole
// central Sound over a day — north on one tide, milling off Alki the next —
// so the foraging ground the pod works migrates around a loop keyed to the
// real Seattle hour. Honesty rule holds: true to the clock, deterministic,
// never a live sighting feed.
//
// ?tod= pins it for demos, tests and screenshots (matching ?phase= / ?weather=
// / ?traffic=): a 0..1 fraction of the day, an hour 0..24, or a named beat
// (dawn|morning|noon|afternoon|dusk|night). Observe mode sweeps it with the
// sun so the pod migrates through the day during a sweep.
const TOD_NAMED: Record<string, number> = {
  night: 0.0,
  midnight: 0.0,
  dawn: 6 / 24,
  morning: 9 / 24,
  noon: 0.5,
  afternoon: 15 / 24,
  dusk: 20 / 24,
};
function parseTodOverride(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("tod");
  if (raw == null) return null;
  if (raw in TOD_NAMED) return TOD_NAMED[raw];
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  // Accept either a 0..1 day fraction or a 0..24 clock hour.
  return n > 1 ? (n % 24) / 24 : Math.max(0, Math.min(1, n));
}
const TOD_OVERRIDE = parseTodOverride();

// Recomputing the Seattle hour every frame is wasteful (Intl.formatToParts
// costs a little) and the pod's ground crawls; cache it and refresh every ~8s,
// the same way traffic.ts throttles its hour read.
const todCache = { at: -1e9, value: 0 };

/** The pod's time-of-day, 0..1 across midnight→midnight. Pinned by ?tod=,
 *  else the observe-mode sweep, else the real local Seattle hour. */
function podTimeOfDay(): number {
  if (TOD_OVERRIDE != null) return TOD_OVERRIDE;
  const obs = observeDayFrac();
  if (obs != null) return obs;
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  if (now - todCache.at < 8000) return todCache.value;
  todCache.at = now;
  todCache.value = (localHour(new Date()) / 24) % 1;
  return todCache.value;
}

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aFade;
  attribute float aSurf;
  varying vec3 vLocal;
  varying float vFade;
  varying float vSurf;
  void main() {
    vLocal = position;
    vFade = aFade;
    vSurf = aSurf;
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
  varying vec3 vLocal;
  varying float vFade;
  varying float vSurf;
  uniform vec3 uBody;
  uniform vec3 uPatch;
  uniform vec3 uFoam;
  uniform float uOpacity;
  void main() {
    if (vFade < 0.004) discard;
    float wash = wcFbm(vWorld * 1.6 + vLocal.x * 2.2);
    // The sumi body: dense ink, pigment pooling toward the waterline.
    vec3 c = uBody * (0.72 + 0.3 * wash);
    c *= mix(1.12, 0.82, smoothstep(-0.02, 0.14, vLocal.y));
    // Foam-white eyepatch (an oval by the head, +X side) and the grey saddle
    // behind the fin — the marks that make an orca read as an orca.
    float eyePatch = smoothstep(0.09, 0.06, length((vLocal.xz - vec2(0.19, 0.05)) * vec2(1.0, 1.7)));
    float saddle = smoothstep(0.11, 0.07, length((vLocal.xz - vec2(-0.12, 0.0)) * vec2(0.7, 1.3)))
                 * step(0.12, vLocal.y);
    c = mix(c, uPatch, eyePatch * 0.92);
    c = mix(c, uPatch * 0.85, saddle * 0.5);
    // The blow + the foam of the surfacing arc: a wash of seigaiha white
    // pooled along the waterline, strongest at the peak of the breach.
    float foam = (1.0 - smoothstep(0.0, 0.06, abs(vLocal.y))) * vSurf;
    c = mix(c, uFoam, foam * 0.7);
    float a = uOpacity * vFade * (0.9 + 0.18 * wash);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a);
  }
`;

interface Track {
  pts: { x: number; z: number }[];
  cum: number[];
  lengthKm: number;
}

function track(latlngs: [number, number][]): Track {
  const pts = latlngs.map(([lat, lng]) => projectLatLng(lat, lng));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  }
  return { pts, cum, lengthKm: cum[cum.length - 1] };
}

// The day's foraging grounds: a closed loop around the central basin the pod
// works its way around over 24 hours, keyed to the Seattle hour. Every anchor
// is open water — the main-basin channel between the Seattle shore and
// Bainbridge, never onto a drawn island. The pod's centre rides this ring as
// time of day advances (north through the small hours, west off Bainbridge by
// morning, south past Blake toward Vashon at midday, back up the Elliott Bay
// side through the evening), so at any hour it is somewhere different on the
// Sound — the way the residents really range with the tide.
const GROUNDS = track([
  [47.695, -122.44], // ~midnight: north basin, off Shilshole / Meadow Point
  [47.665, -122.462], // NW toward West Point / the Bainbridge shore
  [47.625, -122.468], // W, mid-channel abeam Bainbridge
  [47.59, -122.46], // SW, Rich Passage approach
  [47.565, -122.438], // S, the Blake Island / Vashon channel
  [47.575, -122.415], // SE, off Alki Point
  [47.61, -122.408], // E, off the mouth of Elliott Bay
  [47.655, -122.425], // NE, off West Point
  [47.695, -122.44], // close the ring back to the north basin
]);

// Where the pod's foraging centre sits at day fraction f (0..1): a point
// travelled f of the way around the closed GROUNDS ring by arc length.
function groundAt(f: number, out: { x: number; z: number }): { x: number; z: number } {
  const L = GROUNDS.lengthKm;
  const target = (((f % 1) + 1) % 1) * L;
  const { pts, cum } = GROUNDS;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < target) i++;
  const seg = Math.max(1e-6, cum[i] - cum[i - 1]);
  const t = THREE.MathUtils.clamp((target - cum[i - 1]) / seg, 0, 1);
  out.x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t;
  out.z = pts[i - 1].z + (pts[i].z - pts[i - 1].z) * t;
  return out;
}

interface Whale {
  toyLengthKm: number; // storybook-large, like the ferries
  lagKm: number; // how far back in the pod it swims
  offsetKm: number; // lateral spread abreast the lead
  dorsalK: number; // dorsal height multiplier — the bull stands tallest
  surfPeriodS: number; // seconds between surfacings (the bull breathes slower)
  surfPhase: number; // where in its breathing cycle at t = 0
}

// A matriline of four: a big bull with a tall straight fin leading, two
// females/juveniles abreast and behind, a calf tucked close. Their surfacings
// are staggered, so at any moment one or two fins are up — the pod breathes in
// sequence the way a real one does.
const POD: Whale[] = [
  { toyLengthKm: 0.13, lagKm: 0.0, offsetKm: 0.0, dorsalK: 1.0, surfPeriodS: 11, surfPhase: 0.0 },
  { toyLengthKm: 0.11, lagKm: 0.16, offsetKm: 0.07, dorsalK: 0.62, surfPeriodS: 8, surfPhase: 0.35 },
  { toyLengthKm: 0.11, lagKm: 0.2, offsetKm: -0.06, dorsalK: 0.6, surfPeriodS: 8.5, surfPhase: 0.68 },
  { toyLengthKm: 0.075, lagKm: 0.31, offsetKm: 0.02, dorsalK: 0.42, surfPeriodS: 6.5, surfPhase: 0.5 },
];

// Foraging never sits still: over the slow daily drift around GROUNDS the pod
// mills — a leisurely lissajous wander around its current ground so it works
// the food rather than parking on it. WANDER_R is the mill radius (in the
// projected km the tracks use), the two slow rates give an unrepeating path.
const WANDER_R = 0.32;
const WANDER_RATE_X = 0.09; // ~70 s
const WANDER_RATE_Z = 0.063; // ~100 s
// Finite-difference step (clock seconds) used to read the pod's heading off
// its own motion, so the whales face where they are actually swimming.
const HEAD_EPS = 1.5;

interface PodCenter {
  x: number;
  z: number;
}

/** The pod's foraging centre at time of day `tod` and clock time `t`: the
 *  slow daily migration around GROUNDS plus the local milling wander. */
function podCenterAt(tod: number, t: number, out: PodCenter): PodCenter {
  groundAt(tod, out); // slow migration around the Sound, by the hour
  out.x += WANDER_R * Math.sin(t * WANDER_RATE_X); // local foraging mill
  out.z += WANDER_R * Math.sin(t * WANDER_RATE_Z + 1.7);
  return out;
}

interface Breath {
  y: number; // vertical offset — dips under the wash between leaps
  pitch: number; // nose-down on the dive, up on the rise
  surf: number; // 0..1 surfacing burst (foam + blow) at the peak of the arc
  fade: number; // submersion alpha — a ghost under water, solid at the breach
}

const breath: Breath = { y: 0, pitch: 0, surf: 0, fade: 1 };

/** The porpoising breathing arc for one whale at clock time t — independent of
 *  where on the Sound the pod is; drives y, pitch, the surfacing burst and the
 *  submersion fade off a shaped breathing pulse. */
function breathAt(w: Whale, t: number, out: Breath = breath): Breath {
  // The porpoising leap: a dolphin-like arc that drives the body clear of the
  // water, hangs level at the apex, then knifes back in nose-first before a
  // long submerged glide. A wide gaussian shapes the rise so the emergence and
  // re-entry stay graceful rather than a spiky pop.
  const u = (t / w.surfPeriodS + w.surfPhase) % 1;
  const bodyUp = Math.exp(-Math.pow((u - 0.5) / 0.2, 2)); // gaussian leap
  out.y = -0.06 + 0.15 * bodyUp; // glides under the wash, then arcs above it
  // Pitch rides tangent to the arc: proportional to the leap's vertical
  // velocity (dy/du of the gaussian), so the nose lifts on the climb, levels
  // at the apex, and angles down on re-entry — the rolling swoop of a
  // porpoising dolphin rather than a flat bob.
  const climb = -(u - 0.5) * bodyUp; // dy/du shape: + rising, − diving
  out.pitch = THREE.MathUtils.clamp(climb * 8.0, -0.85, 0.85);
  out.surf = THREE.MathUtils.smoothstep(bodyUp, 0.5, 0.92);
  // A ghost of the dark body glides just under the surface between leaps.
  out.fade = 0.16 + 0.84 * THREE.MathUtils.smoothstep(bodyUp, 0.06, 0.42);
  return out;
}

/** Unit-length orca along +X, waterline y = 0: a tapered back that breaks the
 *  surface, a tall dorsal fin raked back at mid-body, a tail stock. White
 *  markings are painted in the shader from local position. */
function buildOrca(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const back = new THREE.BoxGeometry(0.6, 0.09, 0.14);
  back.translate(0.02, 0.03, 0);
  parts.push(back);
  const head = new THREE.BoxGeometry(0.16, 0.08, 0.11);
  head.rotateY(Math.PI / 4);
  head.translate(0.3, 0.03, 0);
  parts.push(head);
  const stock = new THREE.BoxGeometry(0.22, 0.05, 0.07);
  stock.translate(-0.34, 0.03, 0);
  parts.push(stock);
  // The fin: a thin slab raked back, unit height — the pose scales it and the
  // per-whale dorsalK stretches the bull's tall.
  const fin = new THREE.BoxGeometry(0.09, 0.2, 0.02);
  fin.translate(-0.02, 0.14, 0);
  fin.applyMatrix4(new THREE.Matrix4().makeShear(0, 0, -0.35, 0, 0, 0)); // rake x back as y rises
  parts.push(fin);
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const euler = new THREE.Euler();
const scale = new THREE.Vector3();
const centerNow: PodCenter = { x: 0, z: 0 };
const centerAhead: PodCenter = { x: 0, z: 0 };

export function Orcas() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { geometry, fadeAttr, surfAttr } = useMemo(() => {
    const geometry = buildOrca();
    const fadeAttr = new THREE.InstancedBufferAttribute(new Float32Array(POD.length).fill(1), 1);
    const surfAttr = new THREE.InstancedBufferAttribute(new Float32Array(POD.length), 1);
    fadeAttr.setUsage(THREE.DynamicDrawUsage);
    surfAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aFade", fadeAttr);
    geometry.setAttribute("aSurf", surfAttr);
    return { geometry, fadeAttr, surfAttr };
  }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;
    m.uniforms.uOpacity.value = LIVE.ferryOpacity;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;

    const t = CLOCK.t;
    // The whole pod shares one foraging centre (migrating around the Sound by
    // the hour) and one heading, read off the centre's own motion by finite
    // difference so the pod faces where it is swimming.
    const tod = podTimeOfDay();
    podCenterAt(tod, t, centerNow);
    podCenterAt(tod, t + HEAD_EPS, centerAhead);
    let hx = centerAhead.x - centerNow.x;
    let hz = centerAhead.z - centerNow.z;
    const hlen = Math.hypot(hx, hz) || 1;
    hx /= hlen;
    hz /= hlen;
    const yaw = Math.atan2(-hz, hx);
    const perpX = -hz; // unit normal, for the pod's abreast spread
    const perpZ = hx;

    for (let i = 0; i < POD.length; i++) {
      const w = POD[i];
      // Formation: each member trails the centre by its lag along the heading
      // and spreads onto its lane by its lateral offset.
      const x = centerNow.x - hx * w.lagKm + perpX * w.offsetKm;
      const z = centerNow.z - hz * w.lagKm + perpZ * w.offsetKm;
      const { y, pitch, surf, fade } = breathAt(w, t);
      euler.set(0, yaw, pitch, "YZX");
      quaternion.setFromEuler(euler);
      // Non-uniform scale: uniform length, but the bull's dorsal stands taller
      // (the fin's height lives in local +Y, so scaling Y raises it).
      matrix.compose(
        position.set(x, y, z),
        quaternion,
        scale.set(w.toyLengthKm, w.toyLengthKm * w.dorsalK, w.toyLengthKm)
      );
      mesh.setMatrixAt(i, matrix);
      fadeAttr.setX(i, fade);
      surfAttr.setX(i, surf);
    }
    mesh.instanceMatrix.needsUpdate = true;
    fadeAttr.needsUpdate = true;
    surfAttr.needsUpdate = true;
  });

  if (OVERRIDE === false) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, POD.length]}
      geometry={geometry}
      renderOrder={6}
      frustumCulled={false}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uBody: { value: LIVE.label }, // sumi ink — palette-by-reference
          uPatch: { value: LIVE.ferry }, // pale washi eyepatch + saddle
          uFoam: { value: LIVE.seigaiha }, // foam-white blow (gold-thread at night)
          uOpacity: { value: LIVE.ferryOpacity },
          uFog: { value: LIVE.fog },
          uFogDensity: { value: LIVE.fogDensity },
        }}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
      />
    </instancedMesh>
  );
}
