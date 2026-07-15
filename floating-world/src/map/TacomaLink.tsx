// The little T Line: one toy Sound Transit streetcar shuttling the REAL Tacoma
// Link alignment, ~45 km south of the city on the far horizon — past Rainier's
// flank, threading the downtown-Tacoma silhouette and the Tacoma Dome in
// map/Landmarks.tsx. Background paint, not data — like the ferries and Rainier
// it belongs to the page, never presented as live: it is NOT in network.json,
// carries no honesty badge, and does not move the camera home. Its route is the
// real GTFS-shaped T Line (Tacoma Dome → Union Station → Theater District → Old
// City Hall → the Stadium District bend → down Martin Luther King Jr Way to St
// Joseph), hand-lifted to lat/lng so it lands exactly over the accurately-built
// city below.
//
// ONE InstancedMesh (one draw call, matching the instanced-everything rule);
// the pose is deterministic from the scene clock and written imperatively in
// useFrame — the hot path never touches React. Watercolor wash + fog contract
// like every other normal-blended layer (renderOrder 6, beside the ferries and
// landmarks, depthWrite false). The identity is painted, not modelled: a navy
// skirt under the Sound Transit teal/green wave, a glass band, warm-lit windows
// by MIX (never ADD) so the little car can't cross the bloom line.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { projectLatLng } from "./network";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  varying vec3 vLocal;
  void main() {
    vLocal = position;
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
  uniform vec3 uColor;   // washi body
  uniform vec3 uWave;    // teal identity wave
  uniform vec3 uSkirt;   // navy under-body
  uniform vec3 uWindow;
  uniform float uWindowIntensity;
  uniform float uOpacity;
  void main() {
    // vLocal spans roughly x in [-0.5,0.5] (length), y in [0,~0.22] (height).
    float wash = wcFbm(vWorld * 1.5 + vLocal.y * 3.0);
    vec3 c = uColor * (0.82 + 0.36 * wash);

    // Navy skirt along the bottom of the car body.
    float skirt = 1.0 - smoothstep(0.055, 0.075, vLocal.y);
    c = mix(c, uSkirt, skirt * 0.9);

    // The Sound Transit double wave riding just above the skirt: a teal band
    // whose top edge crests on a low-frequency ripple along the car's length.
    float crest = 0.092 + 0.014 * sin(vLocal.x * 42.0);
    float wave = smoothstep(0.06, 0.072, vLocal.y) * (1.0 - smoothstep(crest, crest + 0.014, vLocal.y));
    c = mix(c, uWave, wave * 0.95);

    // The glass band: a dashed run of windows along the upper body, lit warm
    // by MIX so they never bloom (same contract as the ferries).
    float band = smoothstep(0.135, 0.15, vLocal.y) * (1.0 - smoothstep(0.2, 0.212, vLocal.y));
    float dash = step(0.4, wcHash(vec2(floor(vLocal.x * 34.0), 4.1)));
    c = mix(c, uWindow * (0.15 + uWindowIntensity), band * dash * 0.85);

    float a = uOpacity * (0.9 + 0.2 * wash);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a);
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

// The real T Line, Tacoma Dome → St Joseph (~6.4 km, 12 stations). Coordinates
// are the true station locations along Pacific Ave, Commerce St, Stadium Way,
// Division Ave and Martin Luther King Jr Way — the characteristic hook up the
// east side of downtown and back down the Hilltop on the west. A couple of
// bend points round the Stadium District and Division/MLK corners so the car
// follows the streets instead of cutting across the blocks.
const T_LINE = route([
  [47.2394, -122.4282], // Tacoma Dome Station
  [47.2417, -122.431], //  S 25th St (Pacific Ave)
  [47.2448, -122.4366], // Union Station
  [47.2466, -122.4381], // Convention Center (Commerce St)
  [47.2506, -122.44], //   Theater District (Commerce / Broadway)
  [47.2519, -122.4406], // Old City Hall
  [47.2544, -122.4419], // S 4th St (Stadium Way)
  [47.2569, -122.4435], // Stadium District (N 1st & Tacoma Ave)
  [47.2575, -122.4462], // bend onto Division Ave
  [47.2552, -122.4488], // Tacoma General (Division / MLK Jr Way)
  [47.2528, -122.4489], // 6th Ave (MLK Jr Way)
  [47.2511, -122.4489], // Hilltop District (S 11th)
  [47.2484, -122.4488], // St Joseph (S 19th)
]);

interface Streetcar {
  route: Route;
  toyLengthKm: number; // storybook-large, like the trains and ferries
  speedKmS: number; // storybook cruising pace — brisk enough to read as gliding
  dwellS: number; // held at each terminus between runs
  phase: number; // fraction of the round trip already run at t = 0
}

// Two cars working the line in counter-phase, so one is usually somewhere in
// the middle of downtown — a live little service, not a lone toy. Speeds are
// tuned for the scene like the ferries (real streetcar pace creeps a pixel a
// second at this distance and reads as frozen).
const STREETCARS: Streetcar[] = [
  { route: T_LINE, toyLengthKm: 0.11, speedKmS: 0.03, dwellS: 20, phase: 0.0 },
  { route: T_LINE, toyLengthKm: 0.11, speedKmS: 0.03, dwellS: 20, phase: 0.52 },
];

interface Pose {
  x: number;
  z: number;
  yaw: number;
}

const pose: Pose = { x: 0, z: 0, yaw: 0 };

/** Where a car is at clock time t: ping-pong along the alignment with a short
 *  dwell at each terminus. Heading is the forward tangent — a streetcar is
 *  single-ended, but at drift distance the reversed return leg reads fine and
 *  matches how the real cars run back the other way. */
function streetcarPoseAt(v: Streetcar, t: number, out: Pose = pose): Pose {
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

/** Unit-length streetcar along +X, floor at y = 0: a slim low-floor car body
 *  with a shallow-arched roof — the Škoda/Artic streetcar silhouette, kept
 *  simple because the paint (skirt + wave + glass) carries the identity. */
function buildStreetcar(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const body = new THREE.BoxGeometry(0.92, 0.2, 0.16);
  body.translate(0, 0.11, 0);
  parts.push(body);
  // A slightly narrower, lower roof cap so the top reads rounded, not a slab.
  const roof = new THREE.BoxGeometry(0.86, 0.03, 0.13);
  roof.translate(0, 0.215, 0);
  parts.push(roof);
  // The pantograph nub — a hint of the overhead-wire pickup, like the photo.
  const pan = new THREE.BoxGeometry(0.06, 0.03, 0.02);
  pan.translate(0.12, 0.245, 0);
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
// A fixed navy skirt pigment — small identity band, held well under the bloom
// ceiling so it never ignites; it does not need the day/night lerp.
const SKIRT = new THREE.Color("#22314f");

export function TacomaLink() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(buildStreetcar, []);

  useFrame(() => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;
    m.uniforms.uOpacity.value = LIVE.ferryOpacity;
    m.uniforms.uWindowIntensity.value = LIVE.windowIntensity;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
    for (let i = 0; i < STREETCARS.length; i++) {
      const v = STREETCARS[i];
      const { x, z, yaw } = streetcarPoseAt(v, CLOCK.t);
      quaternion.setFromAxisAngle(UP, yaw);
      matrix.compose(position.set(x, 0, z), quaternion, scale.setScalar(v.toyLengthKm));
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, STREETCARS.length]}
      geometry={geometry}
      renderOrder={6}
      frustumCulled={false}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uColor: { value: LIVE.tline }, // palette-by-reference
          uWave: { value: LIVE.tlineWave },
          uSkirt: { value: SKIRT },
          uWindow: { value: LIVE.trainWindow },
          uWindowIntensity: { value: LIVE.windowIntensity },
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
