// Orcas on the Sound: a Southern Resident matriline — the icon of the Salish
// Sea — foraging the central basin west of Elliott Bay, porpoising through
// the Prussian water in sequence. Dorsal fins as sumi strokes cutting the
// seigaiha waves, foam-white eyepatch and saddle, a puff of blow at each
// surfacing. Whale-among-waves is a canonical woodblock composition; here it
// is also the truest thing the water can show.
//
// Background paint, not data — like Rainier and the ferries the pod belongs
// to the page: real geography (the shipping-lane basin the resident pods
// really travel), a real cruising pace and a real surface-and-dive rhythm,
// deterministic from the scene clock. It is NOT a live sighting feed and
// never claims to be one — the honesty rule holds; this is the ferry tier.
// ?orcas=off hides the pod (?orcas=on / any other value forces it on).
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
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

function parseOverride(): boolean | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("orcas");
  if (raw == null) return null;
  return raw !== "off" && raw !== "0";
}
const OVERRIDE = parseOverride();

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

// A north–south foraging line down the central basin, well west of Elliott
// Bay and parallel to the Bainbridge ferry's mid-Sound reach — open water at
// every point, bowed like a hand-drawn stroke.
const BASIN = track([
  [47.69, -122.445], // north basin, off Shilshole
  [47.66, -122.44],
  [47.625, -122.435], // abeam the mouth of Elliott Bay
  [47.595, -122.43],
  [47.565, -122.4245], // south toward Blake Island
]);

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

// The pod cruises ~11 km/h and forages back and forth along the basin rather
// than transiting straight through — resident pods mill in the food, so they
// stay reliably on the page. You read orcas by their surfacing blows, not
// their lateral speed, so the cruise is deliberately slow and the porpoising
// carries the life. A start offset seats the pod mid-basin at session open,
// well inside the drift framing, instead of parked at the north end.
const CRUISE_KM_S = 0.003;

interface WhalePose {
  x: number;
  z: number;
  yaw: number;
  y: number; // vertical offset — dips under the wash between breaches
  pitch: number; // nose-down on the dive, up on the rise
  surf: number; // 0..1 surfacing burst (foam + blow) at the peak of the arc
  fade: number; // submersion alpha — a ghost under water, solid at the breach
}

const pose: WhalePose = { x: 0, z: 0, yaw: 0, y: 0, pitch: 0, surf: 0, fade: 1 };
const nrm = new THREE.Vector2();

/** Where a whale is at clock time t: the pod's lead ping-pongs along the
 *  basin, each member trailing by its lag and spread onto its lane offset;
 *  the porpoising arc drives y, pitch, the surfacing burst and the submersion
 *  fade off a shaped breathing pulse. */
function whalePoseAt(w: Whale, t: number, out: WhalePose = pose): WhalePose {
  // The pod's lead ping-pongs the basin (forage down, turn, forage back);
  // triangle-wave the distance travelled into a position on the line. The
  // 0.45-length seed opens the session with the pod already mid-Sound.
  const travelled = t * CRUISE_KM_S + BASIN.lengthKm * 0.45;
  const lead = travelled % (2 * BASIN.lengthKm);
  const outbound = lead < BASIN.lengthKm;
  const leadDist = outbound ? lead : 2 * BASIN.lengthKm - lead;
  // Each member trails the lead by its lag (behind along the travel dir).
  const dist = THREE.MathUtils.clamp(leadDist - w.lagKm * (outbound ? 1 : -1), 0, BASIN.lengthKm);

  const { pts, cum } = BASIN;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < dist) i++;
  const f = THREE.MathUtils.clamp((dist - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]), 0, 1);
  const a = pts[i - 1];
  const b = pts[i];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  nrm.set(-dz, dx).normalize().multiplyScalar(w.offsetKm);
  out.x = a.x + dx * f + nrm.x;
  out.z = a.z + dz * f + nrm.y;
  const dir = outbound ? 1 : -1;
  out.yaw = Math.atan2(-dz * dir, dx * dir);

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

    for (let i = 0; i < POD.length; i++) {
      const w = POD[i];
      const { x, z, yaw, y, pitch, surf, fade } = whalePoseAt(w, CLOCK.t);
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
