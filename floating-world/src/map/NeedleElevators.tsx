// The Space Needle's elevator beads: two little gold cars climbing and
// descending the outside of the shaft all day, the way the real elevators
// ride the tower's face. The piece's single named landmark was the one big
// silhouette with no motion of its own — the Great Wheel turns, the monorail
// bobs, the Needle just stood there. Now it breathes at every zoom for one
// tiny instanced draw call.
//
// Ambient paint at the Great Wheel's honesty tier: deterministic from the
// scene clock (a cadence shaped like the real ride — load at the base, the
// ~40 s climb, a longer dwell at the observation deck while visitors trade
// places, the glide back down), never presented as a live position. The cars
// are warm gold pigment with a sumi keyline top and bottom, normal-blended,
// held well under the bright-paper bloom ceiling — lantern-warm sparks by
// day, kin to the woodblock moon's pale gold after dark, NEVER igniting the
// composer. Drawn after the depth-writing landmark merge (renderOrder 6.01)
// so a bead correctly hides behind the shaft on its far side and rides in
// front on the near one.
//
// ONE InstancedMesh, two instances, matrices written imperatively in
// useFrame — the hot path never touches React. The shaft profile constants
// are shared with Landmarks.tsx (NEEDLE_*) so the beads always hug the
// painted tower.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { projectLatLng } from "./network";
import {
  NEEDLE_LAT,
  NEEDLE_LNG,
  NEEDLE_SHAFT_H,
  NEEDLE_R_TOP,
  NEEDLE_R_BASE,
} from "./Landmarks";
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
  uniform vec3 uGold;
  uniform vec3 uInk;
  uniform float uOpacity;
  void main() {
    // A warm gold bead with a sumi keyline seating its top and bottom edges —
    // the ink outline is what keeps a mark this small legible on bright paper.
    float wash = wcFbm(vWorld * 3.0 + vLocal.y * 8.0);
    // vLocal.y spans ±0.018 (the bead box's half-height).
    float edge = smoothstep(0.55, 0.95, abs(vLocal.y) / 0.018);
    vec3 c = mix(uGold * (0.86 + 0.26 * wash), uInk, edge * 0.55);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), uOpacity);
  }
`;

// The ride, shaped like the real one but at storybook pace: load at the base,
// climb, a longer trade-places dwell at the observation deck, descend. The
// two cars run counter-phased so one is usually somewhere on the shaft.
const LOAD_S = 16;
const CLIMB_S = 24;
const DECK_S = 24;
const PERIOD_S = LOAD_S + CLIMB_S + DECK_S + CLIMB_S;

// The beads travel the shaft face between the base plinth and the underside
// of the saucer.
const Y_LO = 0.06;
const Y_HI = 0.7;

// Each car keeps its own face of the shaft, like the real elevator tracks.
const AZIMUTHS = [2.4, 5.1];

const ease = (t: number) => t * t * (3 - 2 * t);

/** Height fraction 0..1 of car i at clock time t. */
function rideAt(i: number, t: number): number {
  const p = (t + (i * PERIOD_S) / 2) % PERIOD_S;
  if (p < LOAD_S) return 0;
  if (p < LOAD_S + CLIMB_S) return ease((p - LOAD_S) / CLIMB_S);
  if (p < LOAD_S + CLIMB_S + DECK_S) return 1;
  return 1 - ease((p - LOAD_S - CLIMB_S - DECK_S) / CLIMB_S);
}

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3(1, 1, 1);

// Fixed pigments: pale gold under the bloom ceiling, warm sumi keyline.
const GOLD = new THREE.Color("#c9963f");
const INK = new THREE.Color("#42311f");

export function NeedleElevators() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(0.02, 0.036, 0.014), []);
  const base = useMemo(() => projectLatLng(NEEDLE_LAT, NEEDLE_LNG), []);

  useFrame(() => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;
    m.uniforms.uOpacity.value = LIVE.landmarkOpacity;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
    for (let i = 0; i < AZIMUTHS.length; i++) {
      const h = rideAt(i, CLOCK.t);
      const y = Y_LO + (Y_HI - Y_LO) * h;
      // Hug the tapering shaft: its radius at this height, plus half a bead.
      const r = NEEDLE_R_BASE + (NEEDLE_R_TOP - NEEDLE_R_BASE) * (y / NEEDLE_SHAFT_H) + 0.014;
      const a = AZIMUTHS[i];
      matrix.compose(
        position.set(base.x + Math.cos(a) * r, y, base.z + Math.sin(a) * r),
        quaternion,
        scale
      );
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, AZIMUTHS.length]}
      geometry={geometry}
      // Just after the depth-writing landmark merge (6): the beads depth-test
      // against the painted shaft, so the far car ducks behind the tower.
      renderOrder={6.01}
      frustumCulled={false}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uGold: { value: GOLD },
          uInk: { value: INK },
          uOpacity: { value: 1 },
          uFog: { value: LIVE.fog }, // palette-by-reference
          uFogDensity: { value: LIVE.fogDensity },
        }}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
      />
    </instancedMesh>
  );
}
