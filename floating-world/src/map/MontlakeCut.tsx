// The Montlake Cut: UW crew rowing eights sliding the ship-canal channel
// between Portage Bay and Union Bay, under the Montlake Bridge — the water
// where Windermere Cup and opening-day-of-boating-season really happen. A
// famous view, in the ukiyo-e sense: a named place and a real practice, thin
// needle shells with a fan of vermilion oar-blade flecks catching the paper
// like tiny hanko stamps.
//
// Background paint, not data — like Rainier and the ferries the shells belong
// to the page: real geography, a real ~15 km/h paddle, deterministic from the
// scene clock, never presented as live. Crew rows by daylight, so the fleet
// dissolves out through dusk on the same sun-phase crossfade the seaplanes
// use (VFR by another name) and the cut is bare water after dark.
//
// ONE InstancedMesh (one draw call, matching the instanced-everything rule);
// matrices + per-shell daylight fade written imperatively in useFrame — the
// hot path never touches React. Watercolor wash + fog contract like every
// other normal-blended layer, renderOrder 6 (beside the ferries), depthWrite
// false. The oar blades are painted by MIX, never ADD, so the persimmon
// flecks can't cross the bright-paper bloom line.

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
  uniform vec3 uHull;
  uniform vec3 uBlade;
  uniform float uOpacity;
  void main() {
    if (vFade < 0.004) discard;
    float wash = wcFbm(vWorld * 1.8 + vLocal.x * 2.0);
    // The cedar shell: the ferries' pale washi hull, warmed toward varnished
    // wood, a hair of the water pooling under the hull line.
    vec3 c = uHull * vec3(1.05, 0.98, 0.82) * (0.82 + 0.36 * wash);
    c *= mix(1.08, 0.92, smoothstep(0.0, 0.05, vLocal.y));
    // The oar blades ride out beyond the riggers (|z| past the hull's own
    // half-width): stamp them persimmon, the club-color fleck a rower sweeps.
    float blade = smoothstep(0.05, 0.075, abs(vLocal.z));
    c = mix(c, uBlade, blade * 0.9);
    float a = uOpacity * vFade * (0.88 + 0.22 * wash);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a);
  }
`;

interface Lane {
  pts: { x: number; z: number }[];
  cum: number[];
  lengthKm: number;
}

function lane(latlngs: [number, number][]): Lane {
  const pts = latlngs.map(([lat, lng]) => projectLatLng(lat, lng));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  }
  return { pts, cum, lengthKm: cum[cum.length - 1] };
}

// Portage Bay → under the Montlake Bridge → out into Union Bay: the practice
// water, drawn as a gentle hand-bowed arc so the fleet has room to slide.
const CUT = lane([
  [47.6448, -122.312], // Portage Bay, off the Sailing Center
  [47.6459, -122.3078],
  [47.6467, -122.3042], // under the Montlake Bridge — the Cut proper
  [47.6474, -122.3005], // the mouth at Union Bay
  [47.6489, -122.295], // Union Bay
  [47.6503, -122.2885], // out toward Lake Washington
]);

interface Shell {
  toyLengthKm: number; // storybook-large, like the ferries and cyclists
  speedKmS: number; // ~15 km/h — an eight's honest paddle down the cut
  offsetKm: number; // lateral lane offset — shells abreast, not stacked
  phase: number; // fraction of the round trip already rowed at t = 0
}

// A few crews out at once, spread along the water at different points of the
// stroke — one still turning at the Union Bay end while another slides the
// Cut. Small opposite lane offsets keep them from rowing through each other.
const SHELLS: Shell[] = [
  { toyLengthKm: 0.11, speedKmS: 0.0042, offsetKm: 0.02, phase: 0.05 },
  { toyLengthKm: 0.11, speedKmS: 0.0039, offsetKm: -0.022, phase: 0.44 },
  { toyLengthKm: 0.1, speedKmS: 0.0045, offsetKm: 0.006, phase: 0.72 },
];

interface ShellPose {
  x: number;
  z: number;
  yaw: number;
}

const pose: ShellPose = { x: 0, z: 0, yaw: 0 };
const nrm = new THREE.Vector2();

/** Where a shell is at clock time t: ping-pong along the cut (row down, spin,
 *  row back), nudged onto its lane offset by the local normal. */
function shellPoseAt(s: Shell, t: number, out: ShellPose = pose): ShellPose {
  const legS = CUT.lengthKm / s.speedKmS;
  const period = 2 * legS;
  const p = (t + s.phase * period) % period;
  const outbound = p < legS;
  const dist = outbound ? p * s.speedKmS : CUT.lengthKm - (p - legS) * s.speedKmS;

  const { pts, cum } = CUT;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < dist) i++;
  const f = THREE.MathUtils.clamp((dist - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]), 0, 1);
  const a = pts[i - 1];
  const b = pts[i];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  // Lane offset along the perpendicular; flip the normal on the return leg so
  // a crew always keeps to its own side of the channel.
  nrm.set(-dz, dx).normalize().multiplyScalar(s.offsetKm * (outbound ? 1 : -1));
  out.x = a.x + dx * f + nrm.x;
  out.z = a.z + dz * f + nrm.y;
  const dir = outbound ? 1 : -1;
  out.yaw = Math.atan2(-dz * dir, dx * dir);
  return out;
}

/** Unit-length eight along +X, waterline y = 0: a long thin hull tapered to
 *  bow and stern, with four oar blades a side fanned out past the riggers in
 *  a freeze-frame of the drive. */
function buildShell(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const hull = new THREE.BoxGeometry(0.82, 0.028, 0.03);
  hull.translate(0, 0.02, 0);
  parts.push(hull);
  for (const end of [-1, 1]) {
    const cap = new THREE.BoxGeometry(0.12, 0.028, 0.03);
    cap.rotateY(end * 0.12);
    cap.translate(end * 0.46, 0.02, 0);
    parts.push(cap);
  }
  // Eight seats' worth of oars, staggered down the shell, blades set out past
  // |z| = 0.05 so the shader can tint just the blade tip persimmon.
  for (let k = 0; k < 4; k++) {
    const x = -0.3 + k * 0.2;
    for (const side of [-1, 1]) {
      const oar = new THREE.BoxGeometry(0.03, 0.012, 0.11);
      oar.rotateY(side * 0.5);
      oar.translate(x, 0.028, side * 0.055);
      parts.push(oar);
    }
  }
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export function MontlakeCut() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { geometry, fadeAttr } = useMemo(() => {
    const geometry = buildShell();
    const fadeAttr = new THREE.InstancedBufferAttribute(new Float32Array(SHELLS.length).fill(1), 1);
    fadeAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aFade", fadeAttr);
    return { geometry, fadeAttr };
  }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;
    m.uniforms.uOpacity.value = LIVE.ferryOpacity;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;

    // Crew rows by day: the fleet exists only when the sun does, the same
    // twilight crossfade the floatplanes fly by. Empty water after dark.
    const daylight = THREE.MathUtils.smoothstep(sunPhase(), 0.12, 0.3);

    for (let i = 0; i < SHELLS.length; i++) {
      const s = SHELLS[i];
      const { x, z, yaw } = shellPoseAt(s, CLOCK.t);
      quaternion.setFromAxisAngle(UP, yaw);
      matrix.compose(position.set(x, 0, z), quaternion, scale.setScalar(s.toyLengthKm));
      mesh.setMatrixAt(i, matrix);
      fadeAttr.setX(i, daylight);
    }
    mesh.instanceMatrix.needsUpdate = true;
    fadeAttr.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, SHELLS.length]}
      geometry={geometry}
      renderOrder={6}
      frustumCulled={false}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uHull: { value: LIVE.ferry }, // palette-by-reference (pale washi)
          uBlade: { value: LIVE.station }, // persimmon oar-blade fleck
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
