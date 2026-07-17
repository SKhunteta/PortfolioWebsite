// The canoe crossing: a single high-prowed Coast Salish cedar canoe pulling
// the long crossing of Elliott Bay — out from the mouth of the Duwamish, the
// river of the city's first people, toward the landing beach at Alki, where
// the Denny Party was met in 1851. The city is named for siʔaɫ — Chief
// Seattle of the Duwamish and Suquamish — and canoe families still cross
// these waters every summer during Tribal Canoe Journeys; world/journeys.ts
// keys the season honestly, and the rest of the year the bay is simply bare
// water. It reframes the whole piece: the light rail is only the NEWEST
// layer of a transit tradition thousands of years old on this water.
//
// Treatment is deliberately restrained: a pure sumi-ink silhouette — hull,
// raised prow and stern, a file of paddlers as ink dabs — with no invented
// regalia and no specific tribal design; a respectful mark in the print's own
// language, like the Heroes cast. Background paint, not data: real water,
// a real practice, deterministic from the scene clock, never presented as
// live. Daylight creature on the same sun-phase crossfade the crew shells
// and floatplanes keep.
//
// ONE InstancedMesh (one draw call), matrices written imperatively in
// useFrame — the hot path never touches React. NORMAL-blended ink with the
// fog contract, renderOrder 6 beside the ferries, depthWrite false, and the
// mesh hides itself out of season so 11 months a year it costs nothing.
//
// ?canoe=peak|none pins the season for demos, tests and screenshots.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { projectLatLng } from "./network";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { sunPhase } from "../world/sun";
import { journeysFactor } from "../world/journeys";
import { useUi } from "../trains/store";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const SEASON_POLL_S = 5; // the calendar crawls — never a per-frame cost

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
  uniform vec3 uInk;
  uniform float uFade;
  uniform float uOpacity;
  void main() {
    if (uFade < 0.004) discard;
    // Pure sumi: the ink darkens a touch where pigment pools at the
    // waterline, and the wash breaks the stroke like a dry brush.
    float wash = wcFbm(vWorld * 1.8 + vLocal.x * 2.0);
    vec3 c = uInk * 0.55 * (0.88 + 0.28 * wash);
    c *= mix(1.06, 0.92, smoothstep(0.0, 0.07, vLocal.y));
    float a = uOpacity * uFade * (0.88 + 0.22 * wash);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a);
  }
`;

interface Crossing {
  pts: { x: number; z: number }[];
  cum: number[];
  lengthKm: number;
}

function crossing(latlngs: [number, number][]): Crossing {
  const pts = latlngs.map(([lat, lng]) => projectLatLng(lat, lng));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  }
  return { pts, cum, lengthKm: cum[cum.length - 1] };
}

// Off the Duwamish mouth by Harbor Island, bowing out into the open bay, to
// the beach at Alki — the meeting line, drawn as a gentle hand-bowed arc.
const BAY = crossing([
  [47.5855, -122.357], // off the river mouth, the Duwamish people's own water
  [47.5905, -122.378], // the open reach of Elliott Bay
  [47.5795, -122.402], // the landing at Alki Beach
]);

// A pulling canoe holds a steady paddle all day. Storybook pace like the
// ferries and the crew shells — the honest ~10 km/h reads frozen at drift
// distance — with a long rest at each shore.
const SPEED_KM_S = 0.004;
const DWELL_S = 150;
const TOY_LENGTH_KM = 0.095;

interface CanoePose {
  x: number;
  z: number;
  yaw: number;
}

const pose: CanoePose = { x: 0, z: 0, yaw: 0 };

/** Where the canoe is at clock time t: ping-pong across the bay with a rest
 *  at each shore. Bow always faces the way it pulls. */
function canoePoseAt(t: number, out: CanoePose = pose): CanoePose {
  const crossS = BAY.lengthKm / SPEED_KM_S;
  const period = 2 * (crossS + DWELL_S);
  const p = t % period;
  let s: number;
  let dir = 1;
  if (p < crossS) {
    s = p * SPEED_KM_S;
  } else if (p < crossS + DWELL_S) {
    s = BAY.lengthKm;
  } else if (p < 2 * crossS + DWELL_S) {
    s = BAY.lengthKm - (p - crossS - DWELL_S) * SPEED_KM_S;
    dir = -1;
  } else {
    s = 0;
    dir = -1;
  }
  const { pts, cum } = BAY;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const f = THREE.MathUtils.clamp((s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]), 0, 1);
  const a = pts[i - 1];
  const b = pts[i];
  out.x = a.x + (b.x - a.x) * f;
  out.z = a.z + (b.z - a.z) * f;
  out.yaw = Math.atan2(-(b.z - a.z) * dir, (b.x - a.x) * dir);
  return out;
}

/** Unit canoe along +X, waterline y = 0: a low cedar hull swept up into the
 *  high prow and stern, and a file of paddlers as ink dabs, paddles angled to
 *  the water in a freeze-frame of the pull — alternating sides, the way a
 *  crew actually paddles. */
function buildCanoe(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const hull = new THREE.BoxGeometry(0.88, 0.04, 0.075);
  hull.translate(0, 0.025, 0);
  parts.push(hull);
  for (const end of [-1, 1]) {
    const prow = new THREE.BoxGeometry(0.18, 0.035, 0.05);
    prow.rotateZ(end * 0.55);
    prow.translate(end * 0.46, 0.06, 0);
    parts.push(prow);
  }
  for (let k = 0; k < 5; k++) {
    const x = -0.28 + k * 0.14;
    const paddler = new THREE.BoxGeometry(0.05, 0.07, 0.04);
    paddler.translate(x, 0.06, 0);
    parts.push(paddler);
    const side = k % 2 === 0 ? 1 : -1;
    const paddle = new THREE.BoxGeometry(0.012, 0.09, 0.022);
    paddle.rotateX(side * 0.55);
    paddle.translate(x + 0.03, 0.035, side * 0.05);
    parts.push(paddle);
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

export function Canoe() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(buildCanoe, []);
  const season = useRef(0);
  const lastPollT = useRef(-Infinity);
  const captioned = useRef(false);

  useFrame(() => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;

    if (CLOCK.t - lastPollT.current > SEASON_POLL_S) {
      lastPollT.current = CLOCK.t;
      season.current = journeysFactor();
    }

    // Paddlers cross by daylight — the crew shells' own sun-phase crossfade.
    const daylight = THREE.MathUtils.smoothstep(sunPhase(), 0.12, 0.3);
    const fade = season.current * daylight;
    if (fade < 0.004) {
      mesh.visible = false; // out of season (or after dark) it costs nothing
      return;
    }
    mesh.visible = true;

    // One quiet caption per visit, on first sighting.
    if (!captioned.current && fade > 0.5) {
      captioned.current = true;
      useUi.getState().setCaption("a canoe crossing Elliott Bay — the Sound's first transit");
    }

    m.uniforms.uFade.value = fade;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
    const { x, z, yaw } = canoePoseAt(CLOCK.t);
    quaternion.setFromAxisAngle(UP, yaw);
    matrix.compose(position.set(x, 0, z), quaternion, scale.setScalar(TOY_LENGTH_KM));
    mesh.setMatrixAt(0, matrix);
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, 1]}
      geometry={geometry}
      renderOrder={6}
      frustumCulled={false}
      visible={false}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          // palette-by-reference: the stable sepia landmark ink, pulled deep
          // toward sumi in the shader (the label ink flips to cream after
          // dark — right for HUD text, wrong for a silhouette on the water).
          uInk: { value: LIVE.landmark },
          uFade: { value: 0 },
          uOpacity: { value: 0.95 },
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
