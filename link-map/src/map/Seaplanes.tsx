// The seaplanes: two toy Kenmore Air floatplanes flying the Lake Union
// circuit — taxi out from the south-lake terminal, takeoff run up the lake,
// climb over the Fremont cut and Ballard, a wide turn out over the Sound off
// Carkeek, then back down the Green Lake line to flare over Gas Works and
// taxi home. Ambient paint like the ferries and Rainier, NOT data: a real
// route at a real Otter's pace, deterministic from the scene clock, never
// presented as live. Two more planes stay moored at the dock (the fleet at
// rest), and because floatplanes fly VFR by daylight only, the flying pair
// dissolves out of the sky through dusk (sun-phase crossfade — the twilight
// ramp takes half an hour, so the fade IS the schedule) while the moored
// pair holds the dock all night.
//
// ONE InstancedMesh (one draw call): 2 flying + 2 moored, matrices and
// per-instance fade written imperatively in useFrame — the hot path never
// touches React. Watercolor wash + fog contract like every other
// normal-blended layer, renderOrder 6 (beside the ferries), depthWrite false.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { projectLatLng } from "./network";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { sunPhase } from "../world/sun";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aFade;
  varying vec3 vLocal;
  varying float vFade;
  void main() {
    vLocal = position;
    vFade = aFade;
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
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    if (vFade < 0.004) discard;
    float wash = wcFbm(vWorld * 1.6 + vLocal.y * 3.0);
    // The ferries' pale hull family, warmed a touch — Kenmore's white-and-
    // yellow birds against the dark water.
    vec3 c = uColor * vec3(1.07, 1.02, 0.9) * (0.82 + 0.36 * wash);
    // Pigment pools under the floats; the page shows through up top.
    c *= mix(1.08, 0.92, smoothstep(0.0, 0.24, vLocal.y));
    float a = uOpacity * vFade * (0.9 + 0.2 * wash);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a);
  }
`;

interface Waypoint {
  x: number;
  z: number;
  alt: number; // km above the paper
}

interface Circuit {
  pts: Waypoint[];
  cum: number[]; // horizontal arc length, km
  lengthKm: number;
}

function circuit(latLngAlt: [number, number, number][]): Circuit {
  const pts = latLngAlt.map(([lat, lng, alt]) => ({ ...projectLatLng(lat, lng), alt }));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  }
  return { pts, cum, lengthKm: cum[cum.length - 1] };
}

// The circuit, dock to dock. Altitudes are the storybook version of a real
// Otter's day: on the water for the taxi and takeoff run, ~800 m over the
// Sound, a long sink back down the Green Lake line.
const LAKE_UNION_CIRCUIT = circuit([
  [47.6288, -122.339, 0], // Kenmore Air terminal, south Lake Union
  [47.6335, -122.3383, 0], // taxi out
  [47.6398, -122.3372, 0], // takeoff run up the lake — rotate
  [47.6478, -122.341, 0.16], // climbing past the north shore
  [47.656, -122.365, 0.38], // over the Fremont cut
  [47.666, -122.405, 0.62], // Ballard
  [47.69, -122.442, 0.78], // out over the Sound
  [47.712, -122.418, 0.8], // the turn off Carkeek
  [47.702, -122.366, 0.72], // inland over Greenwood
  [47.676, -122.338, 0.5], // down the Green Lake line
  [47.656, -122.3345, 0.22], // sinking over Wallingford
  [47.647, -122.3358, 0.06], // flaring over Gas Works
  [47.6395, -122.3372, 0], // touchdown
  [47.633, -122.3384, 0], // taxi home
  [47.6288, -122.339, 0], // the dock again
]);

interface Flight {
  toyLengthKm: number;
  speedKmS: number; // ~160 km/h — an Otter's honest working pace
  dwellS: number; // held at the dock between circuits
  phase: number; // fraction of the cycle already flown at t = 0
}

const FLIGHTS: Flight[] = [
  { toyLengthKm: 0.13, speedKmS: 0.044, dwellS: 210, phase: 0.12 },
  { toyLengthKm: 0.13, speedKmS: 0.044, dwellS: 210, phase: 0.62 },
];

// The rest of the fleet, moored off the terminal — always there, day and
// night, slightly askew the way rafted floatplanes sit.
const MOORED = [
  { lat: 47.6285, lng: -122.3398, yaw: 2.3 },
  { lat: 47.6291, lng: -122.3399, yaw: 2.65 },
];

const pose = { x: 0, z: 0, y: 0, yaw: 0, pitch: 0 };

/** Where a flight is at clock time t: arc-length along the circuit with a
 *  dock dwell, altitude and pitch from the waypoint profile. */
function poseAt(f: Flight, t: number) {
  const flightS = LAKE_UNION_CIRCUIT.lengthKm / f.speedKmS;
  const period = flightS + f.dwellS;
  const p = (t + f.phase * period) % period;
  const s = p < flightS ? p * f.speedKmS : 0; // dwell parks it at the dock

  const { pts, cum } = LAKE_UNION_CIRCUIT;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const seg = Math.max(1e-6, cum[i] - cum[i - 1]);
  const fr = THREE.MathUtils.clamp((s - cum[i - 1]) / seg, 0, 1);
  const a = pts[i - 1];
  const b = pts[i];
  pose.x = a.x + (b.x - a.x) * fr;
  pose.z = a.z + (b.z - a.z) * fr;
  pose.y = a.alt + (b.alt - a.alt) * fr;
  pose.yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
  pose.pitch = THREE.MathUtils.clamp(Math.atan2(b.alt - a.alt, seg), -0.38, 0.38);
  return pose;
}

/** Unit-length floatplane along +X, float keels at y = 0: fuselage on twin
 *  floats, high wing, tail fin + tailplane — the de Havilland silhouette. */
function buildPlane(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const fuselage = new THREE.BoxGeometry(0.68, 0.1, 0.1);
  fuselage.translate(0.02, 0.16, 0);
  parts.push(fuselage);
  const nose = new THREE.BoxGeometry(0.1, 0.08, 0.08);
  nose.rotateY(Math.PI / 4);
  nose.translate(0.37, 0.155, 0);
  parts.push(nose);
  const wing = new THREE.BoxGeometry(0.17, 0.016, 0.64);
  wing.translate(0.07, 0.222, 0);
  parts.push(wing);
  const fin = new THREE.BoxGeometry(0.1, 0.12, 0.016);
  fin.translate(-0.3, 0.24, 0);
  parts.push(fin);
  const tailplane = new THREE.BoxGeometry(0.08, 0.012, 0.24);
  tailplane.translate(-0.31, 0.2, 0);
  parts.push(tailplane);
  for (const side of [-1, 1]) {
    const float = new THREE.BoxGeometry(0.52, 0.045, 0.055);
    float.translate(0.04, 0.0225, side * 0.08);
    parts.push(float);
  }
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

const COUNT = FLIGHTS.length + MOORED.length;
const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const euler = new THREE.Euler();
const scale = new THREE.Vector3();

export function Seaplanes() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { geometry, fadeAttr } = useMemo(() => {
    const geometry = buildPlane();
    const fadeAttr = new THREE.InstancedBufferAttribute(new Float32Array(COUNT).fill(1), 1);
    fadeAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aFade", fadeAttr);
    return { geometry, fadeAttr };
  }, []);

  const mooredWritten = useRef(false);

  useFrame(() => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;
    m.uniforms.uOpacity.value = LIVE.ferryOpacity;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;

    // Daylight VFR: the flying pair exists only when the sun does. The
    // twilight ramp is ~half an hour of real time, so this crossfade reads
    // as the evening's last flight dissolving into the dusk.
    const daylight = THREE.MathUtils.smoothstep(sunPhase(), 0.12, 0.3);

    for (let i = 0; i < FLIGHTS.length; i++) {
      const f = FLIGHTS[i];
      const { x, y, z, yaw, pitch } = poseAt(f, CLOCK.t);
      euler.set(0, yaw, pitch, "YZX");
      quaternion.setFromEuler(euler);
      matrix.compose(position.set(x, y, z), quaternion, scale.setScalar(f.toyLengthKm));
      mesh.setMatrixAt(i, matrix);
      fadeAttr.setX(i, daylight);
    }
    fadeAttr.needsUpdate = true;

    // The moored pair never moves — write those matrices once.
    if (!mooredWritten.current) {
      mooredWritten.current = true;
      for (let i = 0; i < MOORED.length; i++) {
        const s = MOORED[i];
        const { x, z } = projectLatLng(s.lat, s.lng);
        quaternion.setFromAxisAngle(position.set(0, 1, 0), s.yaw);
        matrix.compose(
          new THREE.Vector3(x, 0, z),
          quaternion,
          scale.setScalar(FLIGHTS[0].toyLengthKm)
        );
        mesh.setMatrixAt(FLIGHTS.length + i, matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, COUNT]}
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
