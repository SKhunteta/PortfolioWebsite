// The Seattle Streetcar — the city's OWN two little lines, the last real rail
// transit missing from the print: South Lake Union (McGraw Square up Westlake
// Avenue to the lake) and First Hill (Pioneer Square out Jackson Street and up
// Broadway to Capitol Hill Station). Ambient paint at the monorail's / T Line's
// honesty tier — NOT data: deterministic from the scene clock, no honesty
// badge, never presented as live. Alignments are the real streets, block
// corners hand-lifted to lat/lng like the monorail's Fifth Avenue so the cars
// land on the accurately-built city below.
//
// The fleet is the famous "skittles": each real car wears ONE saturated solid
// coat (orange, purple, lime — SDOT's mixed-color fleet, not a uniform
// livery), so the identity here is painted per instance — a per-instance
// `aCoat` flag picks the pigment in the shader, the airliners' Delta/Alaska
// move. Pigments sit a shade past photo-literal (the bus fleet's lesson: muted
// coats render as mush under the print's pale washes) and stay well under the
// bright-paper bloom ceiling. Body reads as the real Inekon low-floor tram:
// pale roof cap with the center pantograph, black-belt window run lit warm by
// MIX (never bloom), dark skirt seating the car on its rails.
//
// TWO draw calls: ONE merged track ribbon under both lines (a thin warm-umber
// ink stroke beside the sumi streets, renderOrder 5 with the roads) and ONE
// InstancedMesh for all four cars (two per line in counter-phase, ping-ponging
// with a dwell at each terminus — the T Line pattern). Poses are written
// imperatively in useFrame; the hot path never touches React. renderOrder 5.63
// with the street traffic (cars 5.6, buses 5.62): street-running vehicles duck
// behind the downtown building fabric exactly like the bus fleet does.
// ?streetcars=off hides the layer.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { projectLatLng } from "./network";
import { buildStrip } from "./ribbon";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";
import { PAPER_CUT_GLSL } from "./paperCutGlsl";
import { PAPER_CUT_VEC } from "./paperCut";

// South Lake Union line: McGraw Square (Westlake & Olive) up Westlake Avenue,
// the Valley Street bend at the lake, east to the Fairview & Campus Drive
// terminus by Fred Hutch.
export const SLU_LATLNGS: [number, number][] = [
  [47.6125, -122.3383], // McGraw Square terminus (Westlake & Olive)
  [47.6144, -122.339], //  Westlake & Virginia
  [47.6183, -122.3387], // Westlake & 9th / Denny
  [47.6207, -122.3388], // Westlake & Thomas
  [47.625, -122.339], //   Westlake & Mercer
  [47.6266, -122.3388], // the Valley St bend at the lake
  [47.6262, -122.3363], // Valley & Terry (Lake Union Park)
  [47.627, -122.3341], //  Fairview & Ward
  [47.6277, -122.3327], // Fairview & Campus Drive terminus
];

// First Hill line: Occidental Mall out S Jackson Street through Chinatown and
// Little Saigon, the 14th Avenue jog to Yesler, then up Broadway past Swedish
// to Capitol Hill Station.
export const FIRST_HILL_LATLNGS: [number, number][] = [
  [47.5993, -122.3332], // Occidental Mall terminus (Occidental & Jackson)
  [47.5989, -122.3273], // 5th & Jackson (beside King Street Station)
  [47.5993, -122.317], //  12th & Jackson (Little Saigon)
  [47.5993, -122.3145], // 14th & Jackson — the turn north
  [47.6015, -122.3147], // 14th & Yesler — the turn west
  [47.6019, -122.321], //  Yesler & Broadway — the turn north
  [47.6047, -122.3208], // Broadway & Terrace (Swedish)
  [47.6062, -122.321], //  Broadway & Marion
  [47.6142, -122.3208], // Broadway & Pike
  [47.6187, -122.3211], // Capitol Hill Station terminus (Broadway & Denny)
];

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aCoat; // 0 persimmon, 1 plum, 2 matcha — the skittles fleet
  varying vec3 vLocal;
  varying float vCoat;
  void main() {
    vLocal = position;
    vCoat = aCoat;
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
  ${PAPER_CUT_GLSL}
  varying vec3 vLocal;
  varying float vCoat;
  uniform vec3 uCoatA;   // persimmon orange
  uniform vec3 uCoatB;   // plum purple
  uniform vec3 uCoatC;   // matcha lime
  uniform vec3 uRoof;    // pale washi roof cap
  uniform vec3 uSkirt;   // dark under-body seating the car on its rails
  uniform vec3 uWindow;
  uniform float uWindowIntensity;
  uniform float uOpacity;
  void main() {
    // vLocal spans x in [-0.5,0.5] (length), y in [0,~0.26] (height).
    float wash = wcFbm(vWorld * 1.5 + vLocal.y * 3.0);

    // One solid coat per car — the whole point of the skittles fleet.
    vec3 coat = mix(uCoatA, uCoatB, clamp(vCoat, 0.0, 1.0));
    coat = mix(coat, uCoatC, clamp(vCoat - 1.0, 0.0, 1.0));
    vec3 c = coat * (0.82 + 0.3 * wash);

    // Dark skirt along the rail line.
    float skirt = 1.0 - smoothstep(0.05, 0.068, vLocal.y);
    c = mix(c, uSkirt, skirt * 0.9);

    // The black-belt window run: a dark band with warm dashed glass, broken at
    // the three section joints (the Inekon tram is articulated in three).
    float band = smoothstep(0.125, 0.14, vLocal.y) * (1.0 - smoothstep(0.195, 0.207, vLocal.y));
    // The two articulation joints framing the short center section.
    float joint = step(0.025, abs(abs(vLocal.x) - 0.14));
    float dash = step(0.35, wcHash(vec2(floor(vLocal.x * 30.0), 5.7)));
    c = mix(c, uSkirt * 0.7, band * 0.85);
    c = mix(c, uWindow * (0.16 + uWindowIntensity), band * dash * joint * 0.85);

    // Pale roof cap over everything above the belt.
    c = mix(c, uRoof, smoothstep(0.215, 0.228, vLocal.y) * 0.92);

    // A streetcar can't ride over the dive incision (the SLU terminus sits
    // at Westlake's hall): carved away with its street.
    float a = uOpacity * (0.9 + 0.2 * wash) * cutKeep(vWorld);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a);
  }
`;

const TRACK_VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vWorld = position.xz;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const TRACK_FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  ${PAPER_CUT_GLSL}
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uIntensity;
  void main() {
    float across = abs(vUv.y * 2.0 - 1.0);
    float core = pow(smoothstep(1.0, 0.0, across), 1.5);
    float dapple = 0.75 + 0.25 * wcNoise(vWorld * 4.0);
    vec3 c = mix(uColor, uFog, fogFactor());
    // Rail ink stamped on the sheet is carved away with it (dive incision).
    gl_FragColor = vec4(c, core * dapple * uIntensity * cutKeep(vWorld));
  }
`;

interface Route {
  pts: { x: number; z: number }[];
  cum: number[];
  lengthKm: number;
}

function route(latlngs: [number, number][]): Route {
  const pts = latlngs.map(([lat, lng]) => projectLatLng(lat, lng));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  }
  return { pts, cum, lengthKm: cum[cum.length - 1] };
}

const SLU = route(SLU_LATLNGS);
const FIRST_HILL = route(FIRST_HILL_LATLNGS);

interface Car {
  route: Route;
  toyLengthKm: number; // the bus fleet's register — these share its streets
  speedKmS: number; // an honest city-tram crawl with a storybook nudge
  dwellS: number; // held at each terminus between runs
  phase: number; // fraction of the round trip already run at t = 0
  coat: number; // which skittle this car is (aCoat)
}

// Two cars per line in counter-phase — a live little service, not a lone toy —
// with the coats spread so no two neighbors match. Slightly different dwells
// keep the two lines from ever falling into lockstep.
const CARS: Car[] = [
  { route: SLU, toyLengthKm: 0.2, speedKmS: 0.014, dwellS: 24, phase: 0.0, coat: 0 },
  { route: SLU, toyLengthKm: 0.2, speedKmS: 0.014, dwellS: 24, phase: 0.5, coat: 2 },
  { route: FIRST_HILL, toyLengthKm: 0.2, speedKmS: 0.014, dwellS: 30, phase: 0.15, coat: 1 },
  { route: FIRST_HILL, toyLengthKm: 0.2, speedKmS: 0.014, dwellS: 30, phase: 0.65, coat: 0 },
];

interface Pose {
  x: number;
  z: number;
  yaw: number;
}

const pose: Pose = { x: 0, z: 0, yaw: 0 };

/** Ping-pong along the alignment with a dwell at each terminus — the T Line
 *  pattern, which is also how the real single-track-loop service reads from
 *  a map: cars shuttling their street, pausing at the ends. */
function carPoseAt(v: Car, t: number, out: Pose = pose): Pose {
  const runS = v.route.lengthKm / v.speedKmS;
  const period = 2 * (runS + v.dwellS);
  const p = (t + v.phase * period) % period;
  let s: number;
  let fwd = true;
  if (p < runS) {
    s = p * v.speedKmS;
  } else if (p < runS + v.dwellS) {
    s = v.route.lengthKm;
  } else if (p < 2 * runS + v.dwellS) {
    s = v.route.lengthKm - (p - runS - v.dwellS) * v.speedKmS;
    fwd = false;
  } else {
    s = 0;
    fwd = false;
  }

  const { pts, cum } = v.route;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const f = THREE.MathUtils.clamp((s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]), 0, 1);
  const a = pts[i - 1];
  const b = pts[i];
  out.x = a.x + (b.x - a.x) * f;
  out.z = a.z + (b.z - a.z) * f;
  const dirX = fwd ? b.x - a.x : a.x - b.x;
  const dirZ = fwd ? b.z - a.z : a.z - b.z;
  out.yaw = Math.atan2(-dirZ, dirX);
  return out;
}

/** Unit-length low-floor tram along +X, floor at y = 0: the slim Inekon
 *  three-section silhouette — kept toy-simple; the solid coat carries the
 *  identity, so the geometry only needs the body, the pale roof cap and the
 *  center-section pantograph nub. */
function buildCar(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const body = new THREE.BoxGeometry(0.94, 0.22, 0.15);
  body.translate(0, 0.12, 0);
  parts.push(body);
  const roof = new THREE.BoxGeometry(0.88, 0.03, 0.12);
  roof.translate(0, 0.24, 0);
  parts.push(roof);
  // The pantograph rides the CENTER section on the real cars.
  const pan = new THREE.BoxGeometry(0.06, 0.03, 0.02);
  pan.translate(0, 0.27, 0);
  parts.push(pan);
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

// The skittles — fixed identity pigments like the monorail's 1962 reds and
// blues, saturated a shade past photo-literal (the bus fleet's lesson) and
// held well under the bloom ceiling.
const PERSIMMON = new THREE.Color("#c05a24");
const PLUM = new THREE.Color("#69497f");
const MATCHA = new THREE.Color("#77943a");
const SKIRT = new THREE.Color("#3a3028");
// The rails: a warm umber ink stroke, its own pigment beside the sumi streets
// (the T Line's ribbon wears agency teal; SDOT's rails just wear steel).
const RAIL_INK = new THREE.Color("#6b4f38");

function hidden(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("streetcars") === "off";
}

export function Streetcars() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const carMatRef = useRef<THREE.ShaderMaterial>(null);
  const trackMatRef = useRef<THREE.ShaderMaterial>(null);
  const off = useMemo(hidden, []);

  const carGeometry = useMemo(() => {
    const geo = buildCar();
    geo.setAttribute(
      "aCoat",
      new THREE.InstancedBufferAttribute(new Float32Array(CARS.map((c) => c.coat)), 1)
    );
    return geo;
  }, []);

  const trackGeometry = useMemo(() => {
    const strips = [SLU_LATLNGS, FIRST_HILL_LATLNGS].map((line) => {
      const pts = line.map(([lat, lng]) => {
        const { x, z } = projectLatLng(lat, lng);
        return [x, z] as [number, number];
      });
      return buildStrip(pts, { widthKm: 0.022, y: 0.011 });
    });
    const merged = mergeGeometries(strips, false)!;
    strips.forEach((g) => g.dispose());
    return merged;
  }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    const m = carMatRef.current;
    if (!mesh || !m) return;
    m.uniforms.uOpacity.value = LIVE.ferryOpacity;
    m.uniforms.uWindowIntensity.value = LIVE.windowIntensity;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
    if (trackMatRef.current) {
      trackMatRef.current.uniforms.uIntensity.value = LIVE.roadIntensity * 0.8;
      trackMatRef.current.uniforms.uFogDensity.value = LIVE.fogDensity;
    }
    for (let i = 0; i < CARS.length; i++) {
      const v = CARS[i];
      const { x, z, yaw } = carPoseAt(v, CLOCK.t);
      quaternion.setFromAxisAngle(UP, yaw);
      matrix.compose(position.set(x, 0.002, z), quaternion, scale.setScalar(v.toyLengthKm));
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (off) return null;

  return (
    <>
      {/* The rails: with the road ink (5), under the traffic riding them. */}
      <mesh geometry={trackGeometry} renderOrder={5} frustumCulled={false}>
        <shaderMaterial
          ref={trackMatRef}
          vertexShader={TRACK_VERT}
          fragmentShader={TRACK_FRAG}
          uniforms={{
            uColor: { value: RAIL_INK },
            uIntensity: { value: 1 },
            uCut: { value: PAPER_CUT_VEC }, // shared cut signal, by reference
            uFog: { value: LIVE.fog }, // palette-by-reference
            uFogDensity: { value: LIVE.fogDensity },
          }}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* The cars: with the street traffic (cars 5.6, buses 5.62) so they duck
          behind the downtown building fabric like every street-running thing. */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, CARS.length]}
        geometry={carGeometry}
        renderOrder={5.63}
        frustumCulled={false}
      >
        <shaderMaterial
          ref={carMatRef}
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={{
            uCoatA: { value: PERSIMMON },
            uCoatB: { value: PLUM },
            uCoatC: { value: MATCHA },
            uRoof: { value: LIVE.ferry }, // pale washi cap, lantern-warm at night
            uSkirt: { value: SKIRT },
            uWindow: { value: LIVE.trainWindow },
            uWindowIntensity: { value: LIVE.windowIntensity },
            uCut: { value: PAPER_CUT_VEC }, // shared cut signal, by reference
            uOpacity: { value: LIVE.ferryOpacity },
            uFog: { value: LIVE.fog },
            uFogDensity: { value: LIVE.fogDensity },
          }}
          transparent
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </instancedMesh>
    </>
  );
}
