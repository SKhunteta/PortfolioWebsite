// The ferries: two toy WSF boats trading the Colman Dock ↔ Bainbridge
// crossing (they pass mid-Sound, like the real pair), and the little West
// Seattle water taxi darting out to Seacrest. Background paint, not data —
// like Rainier they belong to the page: real routes, real crossing speeds,
// deterministic from the scene clock, never presented as live. Double-ended
// boats never turn around; the return leg simply sails "backwards", exactly
// like the real ones.
//
// ONE InstancedMesh (one draw call, matching the instanced-everything rule);
// matrices are written imperatively in useFrame — the hot path never touches
// React. Watercolor wash + fog contract like every other normal-blended
// layer, renderOrder 6 (above the paper, beside the landmarks), depthWrite
// false. Cabin windows reuse the train-window palette, so night lights them
// warm and day turns them to dark glass for free — and they are painted by
// MIX, never ADD, so they can't cross the bloom line.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { projectLatLng } from "./network";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { pushShadow } from "../world/shadows";
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
  uniform vec3 uColor;
  uniform vec3 uWindow;
  uniform float uWindowIntensity;
  uniform float uOpacity;
  void main() {
    float wash = wcFbm(vWorld * 1.4 + vLocal.y * 3.0);
    vec3 c = uColor * (0.8 + 0.4 * wash);
    // Pigment pools at the waterline; the page shows through up top.
    c *= mix(1.1, 0.9, smoothstep(0.0, 0.16, vLocal.y));
    // The cabin deck: a dashed run of windows along the superstructure.
    float band = smoothstep(0.075, 0.09, vLocal.y) * (1.0 - smoothstep(0.13, 0.145, vLocal.y));
    float dash = step(0.45, wcHash(vec2(floor(vLocal.x * 30.0), 7.3)));
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

const BAINBRIDGE = route([
  [47.6023, -122.3387], // Colman Dock
  [47.6106, -122.4278], // the long open reach, bowed like a hand-drawn arc
  [47.6199, -122.5089], // Eagle Harbor, Bainbridge
]);

const WATER_TAXI = route([
  [47.6018, -122.3372], // Pier 50
  [47.5972, -122.3625], // out into Elliott Bay, clearing Duwamish Head
  [47.5907, -122.3808], // Seacrest Park, West Seattle
]);

interface Vessel {
  route: Route;
  toyLengthKm: number; // storybook-large, like the trains
  speedKmS: number; // real crossing pace — ferries keep the trains' honesty
  dwellS: number; // held at the dock between runs
  phase: number; // fraction of the round trip already sailed at t = 0
}

const VESSELS: Vessel[] = [
  { route: BAINBRIDGE, toyLengthKm: 0.21, speedKmS: 0.0095, dwellS: 150, phase: 0.18 },
  { route: BAINBRIDGE, toyLengthKm: 0.21, speedKmS: 0.0095, dwellS: 150, phase: 0.68 },
  { route: WATER_TAXI, toyLengthKm: 0.1, speedKmS: 0.0135, dwellS: 110, phase: 0.42 },
];

const pose = { x: 0, z: 0, yaw: 0 };

/** Where a vessel is at clock time t: ping-pong along its route with a dock
 *  dwell at each end. Heading is always the forward tangent — double-ended. */
function poseAt(v: Vessel, t: number) {
  const crossS = v.route.lengthKm / v.speedKmS;
  const period = 2 * (crossS + v.dwellS);
  const p = (t + v.phase * period) % period;
  let s: number;
  if (p < crossS) s = p * v.speedKmS;
  else if (p < crossS + v.dwellS) s = v.route.lengthKm;
  else if (p < 2 * crossS + v.dwellS) s = v.route.lengthKm - (p - crossS - v.dwellS) * v.speedKmS;
  else s = 0;

  const { pts, cum } = v.route;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const f = THREE.MathUtils.clamp((s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]), 0, 1);
  const a = pts[i - 1];
  const b = pts[i];
  pose.x = a.x + (b.x - a.x) * f;
  pose.z = a.z + (b.z - a.z) * f;
  pose.yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
  return pose;
}

/** Unit-length boat along +X, waterline at y = 0: hull with diamond points
 *  at both ends, cabin deck, twin pilothouses, one broad stack. */
function buildBoat(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const hull = new THREE.BoxGeometry(0.78, 0.07, 0.19);
  hull.translate(0, 0.035, 0);
  parts.push(hull);
  for (const end of [-1, 1]) {
    const point = new THREE.BoxGeometry(0.135, 0.07, 0.135);
    point.rotateY(Math.PI / 4);
    point.translate(end * 0.39, 0.035, 0);
    parts.push(point);
    const house = new THREE.BoxGeometry(0.07, 0.04, 0.09);
    house.translate(end * 0.31, 0.165, 0);
    parts.push(house);
  }
  const cabin = new THREE.BoxGeometry(0.6, 0.075, 0.15);
  cabin.translate(0, 0.1075, 0);
  parts.push(cabin);
  const stack = new THREE.BoxGeometry(0.05, 0.07, 0.035);
  stack.translate(0, 0.18, 0);
  parts.push(stack);
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export function Ferries() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(buildBoat, []);

  useFrame(() => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;
    m.uniforms.uOpacity.value = LIVE.ferryOpacity;
    m.uniforms.uWindowIntensity.value = LIVE.windowIntensity;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
    for (let i = 0; i < VESSELS.length; i++) {
      const v = VESSELS[i];
      const { x, z, yaw } = poseAt(v, CLOCK.t);
      quaternion.setFromAxisAngle(UP, yaw);
      matrix.compose(
        position.set(x, 0, z),
        quaternion,
        scale.setScalar(v.toyLengthKm)
      );
      mesh.setMatrixAt(i, matrix);
      // A faint shade on the water beneath the hull.
      pushShadow(x, z, 0, v.toyLengthKm * 0.5, 0.8);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, VESSELS.length]}
      geometry={geometry}
      renderOrder={6}
      frustumCulled={false}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uColor: { value: LIVE.ferry }, // palette-by-reference
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
