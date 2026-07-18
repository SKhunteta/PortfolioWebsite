// Sidewalk chalk half-life. On a dry summer weekend a small patch of colored
// chalk scribbles appears on a park path — procedural and childlike, from that
// weekend's pastel tray (world/chalk.ts generates the drawing deterministically
// from the weekend, so two tabs and a reload see the same marks). Each rain
// erases it: the wash-out is monotonic within a weekend, so once a shower has
// crossed the path the chalk stays gone even after the sky clears — impermanence
// at kid scale, the print's most fragile mark. Some summer weekends it returns;
// some it doesn't (the honest per-weekend gate). Nothing is persisted: chalk is
// meant to be lost, not accumulated.
//
// ONE draw call: every stroke of the drawing merged into a single ribbon
// geometry (the road/shoreline strip builder) with a per-vertex pastel color,
// rebuilt only when the weekend's drawing changes. A chalk shader breaks the
// coverage up with the tooth of the path and dissolves it as the rain wash
// rises. Normal-blended pigment on the fog contract, low on the ground
// (renderOrder 5.2, just over the roads) — additive light dies on bright paper.
//
// ?chalk=on forces a patch onto the path off-season for demos; off clears it.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { projectLatLng } from "./network";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { WEATHER } from "../world/weather";
import { sunPhase } from "../world/sun";
import { useUi } from "../trains/store";
import { buildStrip, mergeStrips } from "./ribbon";
import {
  ChalkStroke,
  chalkForDate,
  chalkOverride,
} from "../world/chalk";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

// A small patch — storybook-tiny like the rest of the toy cast, but sized so
// the colored marks read as a fleck by the park path from the drift camera and
// resolve into scribbles when a curious viewer orbits down close.
const PATCH_KM = 0.18;
const STROKE_BASE_KM = 0.02; // a chalk line's weight (× the motif's relative width)
const CHALK_Y = 0.016; // a hair above the major road ink (0.014), flat on the path

// The rain wash: how much eased rain (world/weather.ts WEATHER.rain, 0..1)
// fully erases the chalk, and the level past which the weekend is latched
// washed-out (so it can't return once the sky dries).
const WASH_FULL = 0.55;
const WASH_LATCH = 0.7;

const FADE_IN_S = 6; // the drawing washes IN over a few seconds when it appears
const CHECK_EVERY_S = 30; // re-evaluate the calendar/gate this often (date is slow)
const ss = THREE.MathUtils.smoothstep;

// --- shaders ----------------------------------------------------------------

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute vec3 aColor;
  varying vec3 vCol;
  varying vec2 vUv;
  void main() {
    vCol = aColor;
    vUv = uv; // uv.x = km along the stroke, uv.y = 0..1 across it
    vWorld = vec2(position.x, position.z);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

// Dry chalk dragged over rough pavement: broken coverage with the tooth of the
// path showing through, a soft round edge across the stroke, and a dry-drag
// streak along it. The rain wash raises the coverage threshold until nothing
// survives — the mark dissolving from its thin edges inward.
const FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying vec3 vCol;
  varying vec2 vUv;
  uniform float uOpacity;
  uniform float uWash; // 0 dry .. 1 rained out
  void main() {
    float tooth = wcFbm(vWorld * 240.0);              // pavement grain (world-locked)
    float drag = wcFbm(vec2(vUv.x * 55.0, vUv.y * 5.0)); // dry-drag along the stroke
    float edge = 1.0 - smoothstep(0.62, 1.0, abs(vUv.y * 2.0 - 1.0));
    // The chalky break-up lives in the COVERAGE (alpha), so the pigment itself
    // keeps its saturation on the cream paper instead of washing pale.
    float cover = edge * (0.82 + 0.3 * tooth) * (0.85 + 0.22 * drag);
    // Rain eats the thin/faint bits first, then the body.
    cover -= uWash * (0.8 + 0.5 * (1.0 - tooth));
    cover = clamp(cover, 0.0, 1.0);
    if (cover < 0.03) discard;
    // Dry chalk: the pigment near full strength where it's laid down, only the
    // broken tooth softening a touch toward the paper.
    vec3 c = mix(vCol * 0.85, vCol, cover);
    // Hold the pigment up close; only the horizon lets the fog take it.
    float a = cover * uOpacity * (1.0 - 0.82 * fogFactor());
    if (a < 0.01) discard;
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a);
  }
`;

// --- geometry ---------------------------------------------------------------

interface BuiltDrawing {
  geometry: THREE.BufferGeometry;
}

/** Merge a weekend's strokes into one flat ribbon geometry at the park path,
 *  carrying a per-vertex pastel color. Patch-local coords (±1) are rotated by
 *  a per-weekend angle and scaled onto the path anchor. */
function buildDrawing(scribbles: ChalkStroke[], anchor: { x: number; z: number }, angle: number): BuiltDrawing | null {
  if (!scribbles.length) return null;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const half = PATCH_KM / 2;
  const toWorld = (lx: number, ly: number): [number, number] => [
    anchor.x + (lx * cos - ly * sin) * half,
    anchor.z + (lx * sin + ly * cos) * half,
  ];

  const strips: THREE.BufferGeometry[] = [];
  const counts: number[] = [];
  const colors: THREE.Color[] = [];
  const tmp = new THREE.Color();
  for (const s of scribbles) {
    if (s.pts.length < 2) continue;
    const world = s.pts.map(([x, y]) => toWorld(x, y));
    const strip = buildStrip(world, {
      widthKm: s.width * STROKE_BASE_KM,
      y: CHALK_Y,
      closed: s.closed,
      normalizeU: true,
    });
    strips.push(strip);
    counts.push(strip.getAttribute("position").count);
    colors.push(tmp.clone().set(s.color));
  }
  if (!strips.length) return null;

  // buildStrip lays out vertices in stroke order and mergeStrips concatenates
  // in that same order, so the color buffer can be filled stroke-by-stroke.
  const total = counts.reduce((a, b) => a + b, 0);
  const colorArr = new Float32Array(total * 3);
  let v = 0;
  for (let i = 0; i < counts.length; i++) {
    const c = colors[i];
    for (let j = 0; j < counts[i]; j++) {
      colorArr[v * 3] = c.r;
      colorArr[v * 3 + 1] = c.g;
      colorArr[v * 3 + 2] = c.b;
      v++;
    }
  }

  const geometry = mergeStrips(strips); // disposes the inputs
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colorArr, 3));
  return { geometry };
}

// Live state for the dev handle / smoke harness.
export const CHALK_STATE = {
  present: false, // currently drawn on screen (season/gate + not washed + daylight)
  id: 0, // the weekend id (its drawing's seed)
  park: "" as string, // which park path this weekend
  wash: 0, // 0 dry .. 1 rained out (monotonic within the weekend)
  x: 0,
  z: 0,
};

export function Chalk() {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  // Placeholder geometry until the first drawing is built (kept off screen).
  const emptyGeom = useMemo(() => new THREE.BufferGeometry(), []);

  const state = useRef({
    checkedAt: -Infinity,
    id: -1,
    present: false, // eligible this weekend (season+gate, or ?chalk=on)
    washProgress: 0, // monotonic within a weekend — the half-life
    washed: false,
    appearStart: 0,
    park: "",
    captionedAppear: false,
    captionedWash: false,
    built: null as BuiltDrawing | null,
  });

  useFrame(() => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;
    const st = state.current;

    // Re-evaluate the slow calendar/gate periodically (and immediately at start).
    if (CLOCK.t - st.checkedAt >= CHECK_EVERY_S) {
      st.checkedAt = CLOCK.t;
      const info = chalkForDate(new Date());
      const ov = chalkOverride();
      const eligible = ov === false ? false : ov === true ? true : info.appears;

      if (info.id !== st.id) {
        // A new weekend: a fresh drawing (or bare path), wash reset.
        st.id = info.id;
        st.washProgress = 0;
        st.washed = false;
        st.captionedAppear = false;
        st.captionedWash = false;
        st.appearStart = CLOCK.t;
        st.park = info.path.name;
        st.built?.geometry.dispose();
        st.built = eligible
          ? buildDrawing(info.scribbles, projectLatLng(info.path.lat, info.path.lng), st.id % 2 ? 0.7 : -0.5)
          : null;
        mesh.geometry = st.built?.geometry ?? emptyGeom;
        CHALK_STATE.id = info.id;
        CHALK_STATE.park = info.path.name;
        const a = projectLatLng(info.path.lat, info.path.lng);
        CHALK_STATE.x = a.x;
        CHALK_STATE.z = a.z;
      } else if (eligible && !st.built) {
        // ?chalk toggled on mid-weekend: build the drawing now.
        st.appearStart = CLOCK.t;
        st.built = buildDrawing(
          info.scribbles,
          projectLatLng(info.path.lat, info.path.lng),
          st.id % 2 ? 0.7 : -0.5,
        );
        mesh.geometry = st.built?.geometry ?? emptyGeom;
      } else if (!eligible && st.built) {
        st.built.geometry.dispose();
        st.built = null;
        mesh.geometry = emptyGeom;
      }
      st.present = eligible;
    }

    if (!st.present || !st.built) {
      mesh.visible = false;
      CHALK_STATE.present = false;
      return;
    }

    // The rain wash: monotonic within the weekend, so a shower that has crossed
    // the path keeps the chalk gone even once WEATHER.rain eases back to dry.
    const rainWash = Math.min(1, WEATHER.rain / WASH_FULL);
    st.washProgress = Math.max(st.washProgress, rainWash);
    if (st.washProgress >= WASH_LATCH) st.washed = true;

    // Chalk is a daytime thing at kid scale — it fades toward dusk and is gone
    // by night, keyed to the real Seattle sun like everything else.
    const dayness = ss(sunPhase(), 0.32, 0.62);
    const appear = ss(CLOCK.t - st.appearStart, 0, FADE_IN_S);
    const opacity = 0.96 * appear * dayness;

    mat.uniforms.uWash.value = st.washProgress;
    mat.uniforms.uOpacity.value = opacity;
    mat.uniforms.uFogDensity.value = LIVE.fogDensity;

    // Fully washed or fully night: nothing to draw — hide it (zero cost).
    mesh.visible = opacity > 0.01 && st.washProgress < 0.995;
    CHALK_STATE.present = mesh.visible;
    CHALK_STATE.wash = st.washProgress;

    // One quiet caption when the drawing first reads, and one when the rain
    // takes it — the two beats of the half-life.
    if (!st.captionedAppear && mesh.visible && appear > 0.6) {
      st.captionedAppear = true;
      useUi
        .getState()
        .setCaption(`a patch of sidewalk chalk on the ${st.park} path — until the next rain`);
    }
    if (!st.captionedWash && st.washed) {
      st.captionedWash = true;
      useUi
        .getState()
        .setCaption(`rain washes the chalk from the ${st.park} path — some weekends it comes back, some it doesn't`);
    }
  });

  return (
    <mesh ref={meshRef} geometry={emptyGeom} renderOrder={5.2} frustumCulled={false} visible={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uOpacity: { value: 0 },
          uWash: { value: 0 },
          uFog: { value: LIVE.fog },
          uFogDensity: { value: LIVE.fogDensity },
        }}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** World anchor + live state, for the smoke harness / a curious console to fly
 *  to the park path and check the chalk. */
export function chalkAnchor(): { x: number; z: number } {
  return { x: CHALK_STATE.x, z: CHALK_STATE.z };
}
