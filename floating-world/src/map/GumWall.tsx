// The Gum Wall pilgrimage — Post Alley, under Pike Place Market. The real
// wall (50 feet of alley brick by the Market Theater box office) has taken a
// piece of gum from nearly every visitor since 1993; in 2015 it was steam-
// cleaned back to brick — 94 buckets, 2,350 pounds — and began again within
// days. Here the rite belongs to the VIEWER: once per visit, a lone pilgrim
// in a straw kasa walks the alley, pauses at the wall, and presses in a
// single dot of saturated pigment from that day's palette. The dots persist
// in localStorage (world/gumwall.ts), so each returning viewer's copy of the
// print ages uniquely — a woodblock that wears with every impression pulled.
// At capacity the wall is honestly steam-cleaned and begins again.
//
// THREE draw calls, all cheap and mostly static: the brick wall (one box,
// sumi-brick wash), the gum dots (ONE preallocated InstancedMesh at
// WALL_CAPACITY, count trimmed to the real total — the one place the print
// allows confetti, every pigment under the bloom ceiling), and the pilgrim
// (one upright cylindrical-billboard plane in the Heroes' figure language,
// hidden — zero cost — outside the once-per-visit walk). Normal-blended
// pigment on the fog contract, renderOrder 6 / 6.05 / 6.95.
//
// ?gumwall=on loops the pilgrimage for demos; off stills the alley (the wall
// and its accumulated dots always remain).

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { projectLatLng } from "./network";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { useUi } from "../trains/store";
import {
  GumDot,
  WALL_CAPACITY,
  dayPigments,
  loadDots,
  saveDots,
  commitDot,
  gumwallOverride,
  consumeSummon,
} from "../world/gumwall";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

// --- the alley geography -----------------------------------------------------
// Post Alley runs NW→SE under the market's east flank; the gum wall is the
// stretch beside the Market Theater door, a few steps south of Pike.
const ALLEY_N: [number, number] = [47.60915, -122.34092]; // where the pilgrim appears
const ALLEY_S: [number, number] = [47.60762, -122.33982]; // where they fade on
const WALL_AT: [number, number] = [47.60843, -122.34055]; // the wall itself, west side
const WALL_STOP = 0.5; // fraction of the walk where the pilgrim pauses

// Storybook-tiny, in scale with Jimothy and the hero cast — the real wall is
// 15 m long and 4.6 m of gum tall; the print keeps that squat proportion.
const WALL_LEN_KM = 0.038;
const WALL_H_KM = 0.014;
const WALL_THICK_KM = 0.004;
const DOT_R_KM = 0.0016;

const WALK_SPEED_KM_S = 0.01; // an unhurried tourist stroll
const PAUSE_S = 5.5; // long enough to read the pause as intent
const FADE_S = 2.0;
const START_DELAY_S = 26; // the print settles first; then the pilgrim comes
const LOOP_GAP_S = 12; // ?gumwall=on demo cadence

const ss = THREE.MathUtils.smoothstep;

// --- shaders -----------------------------------------------------------------

const VERT_MESH = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

// The bare wall: sumi-brick — the landmark ink pulled toward brick red, with
// faint mortar courses so it reads as the alley's brick and not a crate.
const FRAG_WALL = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying vec3 vLocal;
  uniform vec3 uInk;
  uniform float uOpacity;
  void main() {
    float wash = wcFbm(vWorld * 3.1 + vLocal.xy * 1.6);
    vec3 brick = mix(uInk, vec3(0.45, 0.22, 0.16), 0.45);
    vec3 c = brick * (0.82 + 0.3 * wash);
    // Mortar courses: thin pale bands up the face (local y spans the height).
    float course = smoothstep(0.85, 0.98, sin(vLocal.y * 900.0) * 0.5 + 0.5);
    c = mix(c, c * 1.28, course * 0.5);
    c *= mix(1.05, 0.88, smoothstep(-0.008, 0.008, vLocal.y)); // ink pools low
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), uOpacity);
  }
`;

const VERT_DOTS = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute vec3 aTint;
  varying vec3 vTint;
  varying vec3 vLocal;
  void main() {
    vTint = aTint;
    vLocal = position;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

// A pressed piece: solid saturated pigment, thumb-flattened — a touch darker
// at the rim so each dot reads as a pressed blob, not a bead of light.
const FRAG_DOTS = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying vec3 vTint;
  varying vec3 vLocal;
  uniform float uOpacity;
  void main() {
    float rim = smoothstep(0.55, 1.0, length(vLocal));
    vec3 c = vTint * (1.0 - 0.3 * rim);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), uOpacity);
  }
`;

// The pilgrim: the Heroes' upright cylindrical billboard, one figure.
const VERT_FIGURE = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  uniform float uTime;
  uniform float uMoving;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 base = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
    float w = length(vec3(instanceMatrix[0]));
    float h = length(vec3(instanceMatrix[1]));
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 toCam = cameraPosition - base;
    toCam.y = 0.0;
    vec3 right = normalize(cross(up, toCam));
    // A walking bob while moving; stillness at the wall.
    float bob = uMoving * sin(uTime * 5.2) * h * 0.02;
    vec3 world = base + right * ((uv.x - 0.5) * w) + up * (uv.y * h + bob);
    vWorld = world.xz;
    vec4 mv = viewMatrix * vec4(world, 1.0);
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG_FIGURE = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying vec2 vUv;
  uniform vec3 uWarm;   // face — the palette's persimmon/amber, by reference
  uniform vec3 uSumi;
  uniform vec3 uStraw;
  uniform vec3 uIndigo;
  uniform vec3 uGum;    // the day's pigment riding in their hand
  uniform float uPress; // 0 walking → 1 arm at the wall
  uniform float uFade;
  uniform float uOpacity;

  float ell(vec2 p, vec2 c, vec2 r) { return 1.0 - smoothstep(0.86, 1.02, length((p - c) / r)); }
  float seg(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return 1.0 - smoothstep(r * 0.35, r, length(pa - ba * h));
  }
  float kimono(vec2 p, float cx, float hem, float topY) {
    float halfw = mix(hem, 0.075, smoothstep(0.0, topY, p.y));
    float c = 1.0 - smoothstep(halfw, halfw + 0.02, abs(p.x - cx));
    c *= smoothstep(topY + 0.04, topY, p.y);
    c *= smoothstep(0.0, 0.03, p.y);
    return clamp(c, 0.0, 1.0);
  }
  float kasa(vec2 p, float cx, float baseY, float apexY, float halfBase) {
    float hw = halfBase * clamp((apexY - p.y) / (apexY - baseY), 0.0, 1.0);
    float c = 1.0 - smoothstep(hw, hw + 0.02, abs(p.x - cx));
    c *= smoothstep(baseY - 0.02, baseY + 0.01, p.y) * smoothstep(apexY + 0.02, apexY - 0.01, p.y);
    return clamp(c, 0.0, 1.0);
  }

  void main() {
    if (uFade < 0.004) discard;
    vec2 p = vUv;
    vec3 col = uWarm;
    // A straw-hatted pilgrim in indigo — kin to the hero traveller but their
    // own figure, staffless: the free hand is for the gum.
    float body = kimono(p, 0.46, 0.14, 0.54);
    float head = ell(p, vec2(0.46, 0.62), vec2(0.088, 0.10));
    float hat = kasa(p, 0.46, 0.66, 0.92, 0.32);
    // The press: the arm swings up from the sleeve toward the wall side and a
    // dot of the day's pigment rides at the fingertips.
    vec2 hand = mix(vec2(0.60, 0.30), vec2(0.86, 0.50), uPress);
    float arm = seg(p, vec2(0.50, 0.46), hand, 0.03);
    float gum = ell(p, hand + vec2(0.045, 0.02), vec2(0.038, 0.042)) * uPress;
    col = mix(col, uIndigo * 0.92, body);
    col = mix(col, uWarm * 0.92, head);
    col = mix(col, uStraw, hat);
    col = mix(col, uIndigo * 0.8, arm);
    col = mix(col, uGum, gum);
    float m = max(max(body, head), max(hat, max(arm, gum)));
    if (m < 0.01) discard;
    float a = m * uOpacity * uFade * (1.0 - fogFactor());
    if (a < 0.004) discard;
    gl_FragColor = vec4(mix(col, uFog, fogFactor()), a);
  }
`;

// --- layout ------------------------------------------------------------------

interface AlleyLayout {
  a: THREE.Vector3; // walk start
  b: THREE.Vector3; // walk end
  lengthKm: number;
  wallPos: THREE.Vector3; // wall center (base)
  wallYaw: number;
  faceNormal: THREE.Vector3; // out of the gummed face, toward the alley
}

function buildLayout(): AlleyLayout {
  const pa = projectLatLng(ALLEY_N[0], ALLEY_N[1]);
  const pb = projectLatLng(ALLEY_S[0], ALLEY_S[1]);
  const pw = projectLatLng(WALL_AT[0], WALL_AT[1]);
  const a = new THREE.Vector3(pa.x, 0, pa.z);
  const b = new THREE.Vector3(pb.x, 0, pb.z);
  const dir = b.clone().sub(a).normalize();
  // The wall runs with the alley; its gummed face looks back at the walk line.
  const stop = a.clone().lerp(b, WALL_STOP);
  const toAlley = stop.clone().sub(new THREE.Vector3(pw.x, 0, pw.z));
  toAlley.sub(dir.clone().multiplyScalar(toAlley.dot(dir))); // perpendicular part
  const faceNormal =
    toAlley.lengthSq() > 1e-12 ? toAlley.normalize() : new THREE.Vector3(-dir.z, 0, dir.x);
  return {
    a,
    b,
    lengthKm: a.distanceTo(b),
    wallPos: new THREE.Vector3(pw.x, 0, pw.z),
    wallYaw: Math.atan2(-dir.z, dir.x),
    faceNormal,
  };
}

/** World position of dot (u,v) on the gummed face. */
function dotWorld(layout: AlleyLayout, u: number, v: number, out: THREE.Vector3): THREE.Vector3 {
  const along = Math.cos(layout.wallYaw);
  const alongZ = -Math.sin(layout.wallYaw);
  out.set(
    layout.wallPos.x + along * (u - 0.5) * WALL_LEN_KM,
    (0.08 + v * 0.84) * WALL_H_KM,
    layout.wallPos.z + alongZ * (u - 0.5) * WALL_LEN_KM,
  );
  return out.addScaledVector(layout.faceNormal, WALL_THICK_KM * 0.5 + DOT_R_KM * 0.4);
}

// Live count for the dev handle / smoke harness.
export const GUM_STATE = { count: 0, capacity: WALL_CAPACITY, pressedThisVisit: false };
export function gumWallAnchor(): { x: number; z: number } {
  const { x, z } = projectLatLng(WALL_AT[0], WALL_AT[1]);
  return { x, z };
}

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();

export function GumWall() {
  const layout = useMemo(buildLayout, []);
  const dotsRef = useRef<THREE.InstancedMesh>(null);
  const dotsMatRef = useRef<THREE.ShaderMaterial>(null);
  const wallMatRef = useRef<THREE.ShaderMaterial>(null);
  const figRef = useRef<THREE.InstancedMesh>(null);
  const figMatRef = useRef<THREE.ShaderMaterial>(null);

  const wallGeometry = useMemo(() => {
    const g = new THREE.BoxGeometry(WALL_LEN_KM, WALL_H_KM, WALL_THICK_KM);
    g.translate(0, WALL_H_KM / 2, 0);
    return g;
  }, []);
  const dotGeometry = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  const tintAttr = useMemo(
    () => new THREE.InstancedBufferAttribute(new Float32Array(WALL_CAPACITY * 3), 3),
    [],
  );

  // The persisted wall, loaded once. Mutated only through press().
  const dots = useRef<GumDot[] | null>(null);
  const placed = useRef(0);
  const tint = useRef(new THREE.Color());

  // The pilgrimage timeline: one walk per visit (or looping under ?gumwall=on).
  const walk = useRef({ start: -1, pressed: false, done: false });

  const writeDot = (i: number, d: GumDot) => {
    const mesh = dotsRef.current!;
    dotWorld(layout, d.u, d.v, position);
    // Thumb-flattened against the face: squashed along the wall normal.
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), layout.faceNormal);
    scale.set(DOT_R_KM, DOT_R_KM, DOT_R_KM * 0.45);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(i, matrix);
    tint.current.set(d.c);
    tintAttr.setXYZ(i, tint.current.r, tint.current.g, tint.current.b);
  };

  const press = () => {
    const day = dayPigments(new Date());
    const dot: GumDot = {
      u: 0.06 + Math.random() * 0.88,
      // Reach-biased: most pieces land in the arm band, a few on tiptoe.
      v: Math.min(1, 0.15 + Math.random() * 0.6 + Math.random() * 0.25),
      c: day[Math.floor(Math.random() * day.length)],
      t: Date.now(),
    };
    const result = commitDot(dots.current ?? [], dot);
    dots.current = result.dots;
    saveDots(result.dots);
    GUM_STATE.count = result.dots.length;
    GUM_STATE.pressedThisVisit = true;
    if (result.cleaned) placed.current = 0; // the steam-clean: re-place from bare brick
    useUi
      .getState()
      .setCaption(
        result.cleaned
          ? "The Gum Wall reaches capacity and is steam-cleaned back to brick — it begins again, as in 2015"
          : `Post Alley: a pilgrim presses gum piece #${result.dots.length} into the Gum Wall (a rite since 1993)`,
      );
  };

  useFrame(() => {
    const dotsMesh = dotsRef.current;
    if (!dotsMesh) return;

    // First frame: load the visitor's accumulated wall.
    if (dots.current === null) {
      dots.current = loadDots();
      GUM_STATE.count = dots.current.length;
      walk.current.start = CLOCK.t + START_DELAY_S;
    }

    if (wallMatRef.current) wallMatRef.current.uniforms.uFogDensity.value = LIVE.fogDensity;
    if (dotsMatRef.current) dotsMatRef.current.uniforms.uFogDensity.value = LIVE.fogDensity;

    // Place any dots not yet in the buffer (initial load, each press, and the
    // full re-place after a steam-clean).
    if (placed.current < dots.current.length) {
      for (let i = placed.current; i < dots.current.length; i++) writeDot(i, dots.current[i]);
      placed.current = dots.current.length;
      dotsMesh.count = placed.current;
      dotsMesh.instanceMatrix.needsUpdate = true;
      tintAttr.needsUpdate = true;
    }
    dotsMesh.visible = placed.current > 0;

    // --- the pilgrim ---
    const fig = figRef.current;
    const fm = figMatRef.current;
    if (!fig || !fm) return;
    if (consumeSummon()) {
      // __linkMap.gumwallNow(): a fresh pilgrim right away, even if this
      // visit's walk already happened.
      walk.current = { start: CLOCK.t + 0.5, pressed: false, done: false };
    }
    const override = gumwallOverride();
    if (override === false || walk.current.done) {
      fig.visible = false;
      return;
    }

    const legS = (layout.lengthKm * WALL_STOP) / WALK_SPEED_KM_S;
    const legS2 = (layout.lengthKm * (1 - WALL_STOP)) / WALK_SPEED_KM_S;
    const total = legS + PAUSE_S + legS2;
    const t = CLOCK.t - walk.current.start;

    if (t < 0) {
      fig.visible = false;
      return;
    }
    if (t >= total) {
      if (override === true) {
        // Demo loop: another pilgrim a few beats later.
        walk.current.start = CLOCK.t + LOOP_GAP_S;
        walk.current.pressed = false;
      } else {
        walk.current.done = true; // once per visit
      }
      fig.visible = false;
      return;
    }
    fig.visible = true;

    // Where along the alley, and how much "press".
    let f: number;
    let moving = 1;
    let pressAmt = 0;
    if (t < legS) {
      f = (t / legS) * WALL_STOP;
    } else if (t < legS + PAUSE_S) {
      f = WALL_STOP;
      const u = (t - legS) / PAUSE_S;
      moving = 0;
      pressAmt = ss(0.05, 0.35, u) * (1 - ss(0.7, 0.98, u));
      // The commit lands at the peak of the reach.
      if (!walk.current.pressed && u > 0.45) {
        walk.current.pressed = true;
        press();
      }
    } else {
      f = WALL_STOP + ((t - legS - PAUSE_S) / legS2) * (1 - WALL_STOP);
    }

    const fade = ss(0, FADE_S, t) * (1 - ss(total - FADE_S, total, t));
    position.copy(layout.a).lerp(layout.b, f);
    // At the wall the pilgrim steps toward the brick.
    position.addScaledVector(layout.faceNormal, -pressAmt * 0.006);
    const h = 0.11; // hero-cast height: one of the little people of the print
    matrix.compose(position, quaternion.identity(), scale.set(h * 0.85, h, 1));
    fig.setMatrixAt(0, matrix);
    fig.instanceMatrix.needsUpdate = true;
    fm.uniforms.uTime.value = CLOCK.t;
    fm.uniforms.uMoving.value = moving;
    fm.uniforms.uPress.value = pressAmt;
    fm.uniforms.uFade.value = fade;
    fm.uniforms.uFogDensity.value = LIVE.fogDensity;
    if (!walk.current.pressed) {
      // The pigment they carry: previewed in hand from today's tray. Chosen
      // for display only — the pressed dot rolls its own pick.
      fm.uniforms.uGum.value.set(dayPigments(new Date())[0]);
    }
  });

  return (
    <>
      <mesh
        geometry={wallGeometry}
        position={[layout.wallPos.x, 0, layout.wallPos.z]}
        rotation={[0, layout.wallYaw, 0]}
        renderOrder={6}
        frustumCulled={false}
      >
        <shaderMaterial
          ref={wallMatRef}
          vertexShader={VERT_MESH}
          fragmentShader={FRAG_WALL}
          uniforms={{
            uInk: { value: LIVE.landmark },
            uOpacity: { value: 1 },
            uFog: { value: LIVE.fog },
            uFogDensity: { value: LIVE.fogDensity },
          }}
          transparent
          depthWrite
          side={THREE.FrontSide}
        />
      </mesh>
      <instancedMesh
        ref={dotsRef}
        args={[undefined, undefined, WALL_CAPACITY]}
        geometry={dotGeometry}
        renderOrder={6.05}
        frustumCulled={false}
        visible={false}
      >
        <primitive object={tintAttr} attach="geometry-attributes-aTint" />
        <shaderMaterial
          ref={dotsMatRef}
          vertexShader={VERT_DOTS}
          fragmentShader={FRAG_DOTS}
          uniforms={{
            uOpacity: { value: 0.95 },
            uFog: { value: LIVE.fog },
            uFogDensity: { value: LIVE.fogDensity },
          }}
          transparent
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </instancedMesh>
      <instancedMesh
        ref={figRef}
        args={[undefined, undefined, 1]}
        renderOrder={6.95}
        frustumCulled={false}
        visible={false}
      >
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={figMatRef}
          vertexShader={VERT_FIGURE}
          fragmentShader={FRAG_FIGURE}
          uniforms={{
            uWarm: { value: LIVE.station }, // palette-by-reference
            uSumi: { value: new THREE.Color("#3a2c20") },
            uStraw: { value: new THREE.Color("#d8c48a") },
            uIndigo: { value: new THREE.Color("#2f4d78") },
            uGum: { value: new THREE.Color("#d94f2e") },
            uPress: { value: 0 },
            uMoving: { value: 1 },
            uTime: { value: 0 },
            uFade: { value: 0 },
            uOpacity: { value: 0.95 },
            uFog: { value: LIVE.fog },
            uFogDensity: { value: LIVE.fogDensity },
          }}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
    </>
  );
}
