// Seafair weekend on Lake Washington (world/seafair.ts decides WHEN): the
// unlimited hydroplanes thundering around the Stan Sayres log-boom course off
// Genesee Park, each dragging its signature roostertail of spray, while the
// Blue Angels' six-ship delta works a low show line over the lake — the
// city's summer ritual since 1950. Ambient paint like the stadium game
// nights, NOT data: real course, real show line, deterministic from the wall
// clock, never presented as live. Off the festival weekend both meshes hide
// themselves entirely — absence, not invention — so 51 weekends a year this
// file costs two invisible draw calls.
//
// TWO InstancedMeshes (hydro hulls + roostertails merged into one geometry;
// six jets in the other), matrices written imperatively in useFrame — the hot
// path never touches React. Everything is NORMAL-blended pigment with the fog
// contract (the roostertail is seigaiha foam, palette-by-reference, so it
// goes gold-thread by lantern light like every other foam mark — though the
// show window keeps it a daylight creature). Hulls at renderOrder 6 beside
// the ferries; jets at 6.6 beside the birds. depthWrite false, held under
// the bright-paper bloom line.
//
// ?seafair=on pins the festival for demos, tests and screenshots.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { projectLatLng } from "./network";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { seafairFactor } from "../world/seafair";
import { useUi } from "../trains/store";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const GATE_POLL_S = 5; // wall-clock calendar checks — not a per-frame cost

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aPlume;
  varying vec3 vLocal;
  varying float vPlume;
  void main() {
    vLocal = position;
    vPlume = aPlume;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const HYDRO_FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying vec3 vLocal;
  varying float vPlume;
  uniform vec3 uHull;
  uniform vec3 uAccent;
  uniform vec3 uFoam;
  uniform float uTime;
  uniform float uFade;
  uniform float uOpacity;
  void main() {
    if (uFade < 0.004) discard;
    if (vPlume > 0.5) {
      // The roostertail: a wall of spray arcing up and back off the stern —
      // the mark every Seafair photograph hangs on. Brightest along a rising
      // ridge, flickering on the clock, dying toward the tail. Seigaiha foam
      // by MIX, never ADD, so it can't cross the bright-paper bloom line.
      float back = smoothstep(-0.32, -0.95, vLocal.x);
      float lift = clamp(vLocal.y / 0.3, 0.0, 1.0);
      float ridge = 1.0 - smoothstep(0.0, 0.55, abs(lift - back * 0.9));
      float sparkle = 0.7 + 0.5 * wcNoise(vWorld * 55.0 + vec2(uTime * 9.0, vLocal.y * 34.0));
      float a = ridge * (1.0 - back * 0.75) * sparkle * uFade * 0.85;
      if (a < 0.01) discard;
      gl_FragColor = vec4(mix(uFoam, uFog, fogFactor()), a * (1.0 - fogFactor()));
      return;
    }
    // The hull: pale washi like the ferry fleet, a vermilion racing cowl
    // forward — the persimmon fleck that reads "race boat" at toy scale.
    float wash = wcFbm(vWorld * 1.6 + vLocal.y * 3.0);
    vec3 c = uHull * (0.82 + 0.36 * wash);
    c *= mix(1.08, 0.9, smoothstep(0.0, 0.1, vLocal.y));
    c = mix(c, uAccent, smoothstep(0.02, 0.14, vLocal.x) * 0.75);
    float a = uOpacity * uFade * (0.88 + 0.22 * wash);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a);
  }
`;

// The jets carry no plume flag, so they get their own vertex chunk — a
// shader must never expect an attribute the geometry doesn't hold.
const JET_VERT = /* glsl */ `
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

const JET_FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying vec3 vLocal;
  uniform vec3 uBody;
  uniform vec3 uGold;
  uniform float uFade;
  uniform float uOpacity;
  void main() {
    if (uFade < 0.004) discard;
    // Navy over gold — the Blue Angels' two colors, printed: the body rides
    // the live Prussian water pigment (the show flies by day, when it reads
    // navy), the gold held to a trim flash on the tail, far under bloom.
    float wash = wcFbm(vWorld * 2.0 + vLocal.y * 3.0);
    vec3 c = uBody * 0.72 * (0.85 + 0.3 * wash);
    c = mix(c, uGold, smoothstep(-0.13, -0.24, vLocal.x) * 0.4);
    float a = uOpacity * uFade * (0.9 + 0.2 * wash);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a);
  }
`;

interface Loop {
  pts: { x: number; z: number; y: number }[];
  cum: number[];
  lengthKm: number;
}

function loopFrom(pts: { x: number; z: number; y: number }[]): Loop {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  }
  return { pts, cum, lengthKm: cum[cum.length - 1] };
}

interface LoopPose {
  x: number;
  z: number;
  y: number;
  yaw: number;
  pitch: number;
}

const scratchPose: LoopPose = { x: 0, z: 0, y: 0, yaw: 0, pitch: 0 };

function loopPoseAt(loop: Loop, s: number, out: LoopPose = scratchPose): LoopPose {
  const len = loop.lengthKm;
  s = ((s % len) + len) % len;
  const { pts, cum } = loop;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const seg = Math.max(1e-6, cum[i] - cum[i - 1]);
  const f = THREE.MathUtils.clamp((s - cum[i - 1]) / seg, 0, 1);
  const a = pts[i - 1];
  const b = pts[i];
  out.x = a.x + (b.x - a.x) * f;
  out.z = a.z + (b.z - a.z) * f;
  out.y = a.y + (b.y - a.y) * f;
  out.yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
  out.pitch = THREE.MathUtils.clamp(Math.atan2(b.y - a.y, seg), -0.3, 0.3);
  return out;
}

const wrapPi = (a: number) => {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
};

// ---------------------------------------------------------------------------
// The hydro course: an oval of log booms off Stan Sayres Memorial Park — the
// real pits since 1951 — long axis up the lake, rotated a touch to follow the
// Genesee shore. Built parametrically around the projected center so the
// ellipse is honest in km, not in degrees.
const COURSE: Loop = (() => {
  const center = projectLatLng(47.5725, -122.271);
  const A = 1.05; // half-length, km — a storybook 2-mile course
  const B = 0.33; // half-width, km
  const ROT = 0.24; // the shore's slight NNW trend
  const pts = [];
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const th = (i / N) * Math.PI * 2;
    const ex = Math.cos(th) * B;
    const ez = Math.sin(th) * A;
    pts.push({
      x: center.x + ex * Math.cos(ROT) - ez * Math.sin(ROT),
      z: center.z + ex * Math.sin(ROT) + ez * Math.cos(ROT),
      y: 0,
    });
  }
  return loopFrom(pts);
})();

// Three boats in a chase pack — phase-spread like a real heat, close enough
// that the lead's roostertail hangs over the chasers' bows.
const HYDROS = [
  { phase: 0.0, speedKmS: 0.055, toyLengthKm: 0.12 },
  { phase: 0.055, speedKmS: 0.055, toyLengthKm: 0.115 },
  { phase: 0.125, speedKmS: 0.055, toyLengthKm: 0.12 },
];

/** Unit hydro along +X, waterline y = 0: pickle-fork sponsons forward, low
 *  cowling, tail fin — and the roostertail itself, two crossed quads flagged
 *  aPlume so the shader paints them as spray instead of hull. */
function buildHydro(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const plumeFlag: number[] = [];
  const push = (g: THREE.BufferGeometry, plume: number) => {
    parts.push(g);
    plumeFlag.push(plume);
  };
  const hull = new THREE.BoxGeometry(0.55, 0.045, 0.14);
  hull.translate(-0.02, 0.028, 0);
  push(hull, 0);
  for (const side of [-1, 1]) {
    const sponson = new THREE.BoxGeometry(0.2, 0.04, 0.045);
    sponson.translate(0.3, 0.025, side * 0.05);
    push(sponson, 0);
  }
  const cowl = new THREE.BoxGeometry(0.16, 0.045, 0.07);
  cowl.translate(0.0, 0.072, 0);
  push(cowl, 0);
  const fin = new THREE.BoxGeometry(0.08, 0.11, 0.012);
  fin.translate(-0.24, 0.09, 0);
  push(fin, 0);
  // The roostertail: crossed vertical quads trailing the stern, so the spray
  // reads from every drift azimuth.
  for (const rot of [0, Math.PI / 2]) {
    const plume = new THREE.PlaneGeometry(0.7, 0.32);
    plume.rotateY(rot);
    plume.translate(-0.65, 0.14, 0);
    push(plume, 1);
  }
  for (let i = 0; i < parts.length; i++) {
    const n = parts[i].attributes.position.count;
    parts[i].setAttribute(
      "aPlume",
      new THREE.BufferAttribute(new Float32Array(n).fill(plumeFlag[i]), 1)
    );
  }
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

// ---------------------------------------------------------------------------
// The Blue Angels' show line: a low pass up the lake over the race course,
// pulling up past the 520 bridge into a wide right-hand sweep over the
// Bellevue shore, down the east side and back around over the south end —
// the real display box between the two floating bridges.
const SHOW_LINE: Loop = loopFrom(
  (
    [
      [47.535, -122.272, 0.55], // rolling in from the south, descending
      [47.558, -122.269, 0.38], // on the deck approaching the course
      [47.582, -122.265, 0.34], // the low pass over the log booms
      [47.605, -122.26, 0.42], // holding low up the lake
      [47.63, -122.252, 0.9], // pulling up short of 520
      [47.645, -122.225, 1.4], // climbing right over the water
      [47.635, -122.19, 1.7], // the wide sweep over the Bellevue shore
      [47.59, -122.175, 1.8], // downwind, high over the east side
      [47.545, -122.185, 1.7], // continuing south
      [47.51, -122.215, 1.4], // around the south turn off Renton
      [47.505, -122.255, 1.0], // rolling out, descending
      [47.535, -122.272, 0.55], // close the loop
    ] as [number, number, number][]
  ).map(([lat, lng, y]) => ({ ...projectLatLng(lat, lng), y }))
);

const JET_SPEED_KMS = 0.22; // faster than the SeaTac pattern — a display pace
const JET_TOY_KM = 0.1;

// The six-ship delta: lead, two wingmen, the slot, two outer — offsets in km
// behind/beside the lead, tight the way the team actually flies.
const DELTA: { back: number; side: number }[] = [
  { back: 0, side: 0 },
  { back: 0.09, side: 0.11 },
  { back: 0.09, side: -0.11 },
  { back: 0.18, side: 0 },
  { back: 0.18, side: 0.22 },
  { back: 0.18, side: -0.22 },
];

/** Unit delta-jet along +X: fuselage, diamond nose, swept delta wings, fin. */
function buildJet(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const fuselage = new THREE.BoxGeometry(0.5, 0.05, 0.06);
  fuselage.translate(0, 0, 0);
  parts.push(fuselage);
  const nose = new THREE.BoxGeometry(0.1, 0.04, 0.1);
  nose.rotateY(Math.PI / 4);
  nose.translate(0.25, 0, 0);
  parts.push(nose);
  for (const side of [-1, 1]) {
    const wing = new THREE.BoxGeometry(0.3, 0.012, 0.07);
    wing.rotateY(side * 0.6);
    wing.translate(-0.08, 0, side * 0.14);
    parts.push(wing);
  }
  const fin = new THREE.BoxGeometry(0.1, 0.1, 0.012);
  fin.translate(-0.2, 0.06, 0);
  parts.push(fin);
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();
const euler = new THREE.Euler(0, 0, 0, "YZX"); // yaw, then pitch, then roll
const GOLD = new THREE.Color("#c9a227"); // the trim flash, held under bloom
const aheadScratch: LoopPose = { x: 0, z: 0, y: 0, yaw: 0, pitch: 0 };

/** Shared gate: the calendar moves at wall-clock pace, so each mesh polls a
 *  few seconds apart rather than per frame. */
function useSeafairGate(): { current: number } {
  const gate = useRef(0);
  const lastPollT = useRef(-Infinity);
  useFrame(() => {
    if (CLOCK.t - lastPollT.current > GATE_POLL_S) {
      lastPollT.current = CLOCK.t;
      gate.current = seafairFactor();
    }
  });
  return gate;
}

function Hydros() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(buildHydro, []);
  const gate = useSeafairGate();
  const captioned = useRef(false);

  useFrame(() => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;
    if (gate.current < 0.004) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;

    // One quiet caption per visit, as the first heat comes up to speed.
    if (!captioned.current && gate.current > 0.5) {
      captioned.current = true;
      useUi.getState().setCaption("Seafair — the hydros are running on Lake Washington");
    }

    m.uniforms.uFade.value = gate.current;
    m.uniforms.uTime.value = CLOCK.t;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
    for (let i = 0; i < HYDROS.length; i++) {
      const h = HYDROS[i];
      const period = COURSE.lengthKm / h.speedKmS;
      const s = ((CLOCK.t + h.phase * period) % period) * h.speedKmS;
      const { x, z, yaw } = loopPoseAt(COURSE, s);
      euler.set(0, yaw, 0);
      quaternion.setFromEuler(euler);
      matrix.compose(position.set(x, 0, z), quaternion, scale.setScalar(h.toyLengthKm));
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, HYDROS.length]}
      geometry={geometry}
      renderOrder={6}
      frustumCulled={false}
      visible={false}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={HYDRO_FRAG}
        uniforms={{
          uHull: { value: LIVE.ferry }, // palette-by-reference (pale washi)
          uAccent: { value: LIVE.station }, // persimmon racing cowl
          uFoam: { value: LIVE.seigaiha }, // the roostertail is foam
          uTime: { value: 0 },
          uFade: { value: 0 },
          uOpacity: { value: LIVE.ferryOpacity },
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

function BlueAngels() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(buildJet, []);
  const gate = useSeafairGate();

  useFrame(() => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;
    if (gate.current < 0.004) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;

    m.uniforms.uFade.value = gate.current;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;

    // The whole delta flies off the LEAD's pose — one path evaluation, six
    // ships. Bank recovered from the heading a short way ahead, the same move
    // the SeaTac pattern makes; every ship holds the lead's attitude, which
    // is exactly what makes a formation read as a formation.
    const period = SHOW_LINE.lengthKm / JET_SPEED_KMS;
    const s = (CLOCK.t % period) * JET_SPEED_KMS;
    const lead = loopPoseAt(SHOW_LINE, s);
    const ahead = loopPoseAt(SHOW_LINE, s + 0.25, aheadScratch);
    const roll = THREE.MathUtils.clamp(wrapPi(ahead.yaw - lead.yaw) * 2.4, -0.85, 0.85);
    euler.set(roll, lead.yaw, lead.pitch);
    quaternion.setFromEuler(euler);
    const fx = Math.cos(lead.yaw);
    const fz = -Math.sin(lead.yaw);
    for (let i = 0; i < DELTA.length; i++) {
      const d = DELTA[i];
      matrix.compose(
        position.set(
          lead.x - fx * d.back - fz * d.side,
          lead.y,
          lead.z - fz * d.back + fx * d.side
        ),
        quaternion,
        scale.setScalar(JET_TOY_KM)
      );
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, DELTA.length]}
      geometry={geometry}
      renderOrder={6.6}
      frustumCulled={false}
      visible={false}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={JET_VERT}
        fragmentShader={JET_FRAG}
        uniforms={{
          uBody: { value: LIVE.water }, // Prussian → navy by show-day light
          uGold: { value: GOLD },
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

export function Seafair() {
  return (
    <>
      <Hydros />
      <BlueAngels />
    </>
  );
}
