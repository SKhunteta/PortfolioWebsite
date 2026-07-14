// The water remembers the hulls: a foam wake spreading behind every moving
// boat and float. The still Prussian sheet is the strongest "alive" cue in the
// whole print when something finally disturbs it. Ambient paint like the
// ferries and floatplanes that cut it, reading their live pose straight from
// Ferries.tsx / Seaplanes.tsx so a wake can never drift free of its boat.
//
// The foam is the spreading vee, NORMAL-blended foam-white (LIVE.seigaiha, the
// Great Wave register — gold-thread by lantern light after dark, the same
// day/night move the seigaiha water already makes), fading with the hull's
// speed. A float only foams while it is ON the water, and its wake dissolves
// with the daylight fade that carries the plane itself.
//
// The lit-cabin reflection a moving or docked ferry used to pour here now lives
// in the unified watercolor-reflection layer (map/Reflections.tsx), alongside
// the trains' and the city lights', all riding the same shoreline-breath.
//
// Matrices + per-instance strengths are written imperatively in useFrame; the
// hot path never touches React. renderOrder sits just over the water
// over-print and under the hulls, depthWrite false.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { sunPhase } from "../world/sun";
import { CONFIG } from "../world/config";
import { FERRY_VESSELS, ferryPoseAt, VesselPose } from "./Ferries";
import { SEAPLANE_FLIGHTS, seaplanePoseAt, FlightPose } from "./Seaplanes";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

// A flat unit quad in the XZ plane (y = 0). xRange lets the foam trail sit
// entirely BEHIND the stern (−1..0) while the reflection straddles the hull
// (−0.6..0.6); vAlong/vAcross carry the unit coords to the fragment.
function flatQuad(x0: number, x1: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  // two triangles
  const xs = [x0, x1];
  const zs = [-0.5, 0.5];
  const pos: number[] = [];
  const quad = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 0],
    [1, 1],
    [0, 1],
  ];
  for (const [xi, zi] of quad) pos.push(xs[xi], 0, zs[zi]);
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

const FOAM_VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aStr;
  varying float vStr;
  varying float vAlong;  // 0 at the stern → 1 at the tail
  varying float vAcross; // −0.5 .. 0.5 across the wake
  void main() {
    vStr = aStr;
    vAlong = -position.x; // local x runs 0 → −1 behind the hull
    vAcross = position.z;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FOAM_FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying float vStr;
  varying float vAlong;
  varying float vAcross;
  uniform vec3 uFoam;
  uniform float uOpacity;
  void main() {
    if (vStr < 0.01) discard;
    float along = vAlong;
    float across = abs(vAcross);
    // The wake opens into a vee behind the hull: the spreading bow waves ride
    // the arms, the churn fills between them, both dying toward the tail.
    float halfW = 0.06 + along * 0.42;
    float arms = 1.0 - smoothstep(0.0, 0.11, abs(across - halfW));
    float inside = 1.0 - smoothstep(halfW - 0.06, halfW + 0.03, across);
    float churn = wcNoise(vec2(along * 20.0, vAcross * 26.0) + vWorld * 3.0);
    // Strongest just behind the stern, feathered to nothing at the far tail
    // (and eased off the very stern so there's no hard leading edge).
    float lengthFade = (1.0 - along) * smoothstep(0.0, 0.08, along);
    float foam = (arms * 0.85 + inside * 0.22) * lengthFade * (0.55 + 0.6 * churn);
    float a = foam * vStr * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(mix(uFoam, uFog, fogFactor()), a);
  }
`;

const FERRY_COUNT = FERRY_VESSELS.length;
const PLANE_COUNT = SEAPLANE_FLIGHTS.length;
const FOAM_COUNT = FERRY_COUNT + PLANE_COUNT; // every moving hull foams
const WAKE_Y = CONFIG.basemap.waterY + 0.05; // just proud of the water over-print, under the hulls

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const fPose: VesselPose = { x: 0, z: 0, yaw: 0, speed: 0 };
const pPose: FlightPose = { x: 0, z: 0, y: 0, yaw: 0, pitch: 0, speed: 0 };

/** Any real way-on lights the foam; sitting at the dock kills it. */
function speedStrength(speed: number): number {
  return THREE.MathUtils.smoothstep(speed, 0.0, 0.006);
}

export function Wakes() {
  const foamRef = useRef<THREE.InstancedMesh>(null);

  const foam = useMemo(() => {
    const geometry = flatQuad(-1, 0);
    const str = new THREE.InstancedBufferAttribute(new Float32Array(FOAM_COUNT), 1);
    str.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aStr", str);
    return { geometry, str };
  }, []);

  useFrame(() => {
    const foamMesh = foamRef.current;
    if (!foamMesh) return;

    const foamMat = foamMesh.material as THREE.ShaderMaterial;
    foamMat.uniforms.uFogDensity.value = LIVE.fogDensity;
    // Foam eases off with the water opacity so it never out-shouts a pale
    // wash; the seigaiha foam-white/gold ref carries the day/night colour.
    foamMat.uniforms.uOpacity.value = 0.5 * LIVE.waterOpacity + 0.35;

    // Floatplanes are daylight VFR — their wake fades with the same ramp that
    // fades the plane (Seaplanes.tsx), so foam never lingers under a vanished
    // aircraft at dusk.
    const daylight = THREE.MathUtils.smoothstep(sunPhase(), 0.12, 0.3);

    // Ferry hulls: always on the water, day and night.
    for (let i = 0; i < FERRY_COUNT; i++) {
      const v = FERRY_VESSELS[i];
      ferryPoseAt(v, CLOCK.t, fPose);
      quaternion.setFromAxisAngle(UP, fPose.yaw);
      const len = v.toyLengthKm * 6.0;
      const wid = v.toyLengthKm * 3.4;
      matrix.compose(position.set(fPose.x, WAKE_Y, fPose.z), quaternion, scale.set(len, 1, wid));
      foamMesh.setMatrixAt(i, matrix);
      foam.str.setX(i, speedStrength(fPose.speed));
    }

    // Floatplane floats: foam only while on the water, and only by day.
    for (let j = 0; j < PLANE_COUNT; j++) {
      const f = SEAPLANE_FLIGHTS[j];
      seaplanePoseAt(f, CLOCK.t, pPose);
      const idx = FERRY_COUNT + j;
      quaternion.setFromAxisAngle(UP, pPose.yaw);
      const len = f.toyLengthKm * 5.0;
      const wid = f.toyLengthKm * 2.2;
      matrix.compose(position.set(pPose.x, WAKE_Y, pPose.z), quaternion, scale.set(len, 1, wid));
      foamMesh.setMatrixAt(idx, matrix);
      const onWater = 1 - THREE.MathUtils.smoothstep(pPose.y, 0.02, 0.12);
      foam.str.setX(idx, speedStrength(pPose.speed) * onWater * daylight);
    }
    foamMesh.instanceMatrix.needsUpdate = true;
    foam.str.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={foamRef}
      args={[undefined, undefined, FOAM_COUNT]}
      geometry={foam.geometry}
      renderOrder={4.7}
      frustumCulled={false}
    >
      <shaderMaterial
        vertexShader={FOAM_VERT}
        fragmentShader={FOAM_FRAG}
        uniforms={{
          uFoam: { value: LIVE.seigaiha }, // palette-by-reference: foam-white by day, gold by night
          uOpacity: { value: 0.6 },
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
