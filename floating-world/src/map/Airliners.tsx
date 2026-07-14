// The airliners: a small SeaTac fleet flown as a woodblock toy — jets on the
// approach/departure patterns of the two paired runways, half painted Delta,
// half Alaska (the airport's real hometown split), plus one of each parked at
// the gates. Ambient paint like the ferries and the Kenmore floatplanes, NOT
// data: real-shaped traffic patterns at a storybook pace, deterministic from
// the scene clock, never presented as live. Two closed circuits run in
// opposition — one flow lands/departs NORTH on 34R and turns its pattern out
// over the valley to the east, the other lands/departs SOUTH on 16C and turns
// west out over the Sound — each a touch-and-go loop so the fleet is always in
// motion and never teleports (the ferries' honesty, in the sky).
//
// Unlike the floatplanes (daylight VFR, they fade out at dusk), jetliners work
// the field around the clock, so these hold through the night; the palette
// only dims them toward the lantern print.
//
// ONE InstancedMesh (one draw call, the instanced-everything rule). Every jet
// shares the same 737 silhouette; the livery is a baked canvas atlas with the
// two paint schemes stacked, and a per-instance `aAirline` flag slides each
// jet's UVs onto its half — so "50/50 Delta and Alaska" is structural, not a
// coin flip. Matrices + bank are written imperatively in useFrame; the hot
// path never touches React. Watercolor wash + a fixed NW key light give the
// fuselage solid, round massing; the layer mixes toward LIVE.fog and rides at
// renderOrder 6 beside the other ambient life, depthWrite false. Livery whites
// are kept below the bright-paper bloom line (clamped in the shader) so the
// jets sit in the print instead of glaring off it.

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
  attribute float aAirline;   // 0 = Alaska (lower atlas band), 1 = Delta (upper)
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vY;
  void main() {
    vUv = uv;
    vUv.y += aAirline * 0.5;  // slide onto this jet's livery half
    vY = position.y;
    vNormal = normalize(mat3(instanceMatrix) * normal); // uniform scale — safe
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
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vY;
  uniform sampler2D uTex;
  uniform float uOpacity;
  uniform float uNight; // 0 day .. 1 night — dims the livery toward the lantern print
  void main() {
    vec3 paint = texture2D(uTex, vUv).rgb;
    // A fixed key light from the northwest sky so the tube reads round and the
    // massing stays solid, exactly like the landmarks.
    vec3 n = normalize(vNormal);
    float key = 0.7 + 0.3 * max(0.0, dot(n, normalize(vec3(-0.5, 0.8, -0.45))));
    float wash = wcFbm(vWorld * 1.6 + vY * 3.0);
    vec3 c = paint * key * (0.9 + 0.14 * wash);
    // Pigment pools under the belly; the page shows through up top.
    c *= mix(1.05, 0.95, smoothstep(-0.05, 0.12, vY));
    c *= mix(1.0, 0.72, uNight); // lantern-dim after dark, never lit white
    // Bright-paper bloom rule: the livery white must stay under the threshold
    // so the jet never catches the bloom skirt off its own hull.
    c = clamp(c, 0.0, 0.95);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), uOpacity);
  }
`;

// ---------------------------------------------------------------------------
// Flight patterns. Each waypoint is [lat, lng, altKm]; a circuit is a CLOSED
// loop (last point == first) so the jet flies it forever — final, flare,
// touch-and-go roll, climb-out, a wide rectangular pattern, back onto final.
// ---------------------------------------------------------------------------

interface Waypoint {
  x: number;
  z: number;
  alt: number;
}
interface Circuit {
  pts: Waypoint[];
  cum: number[];
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

// NORTH flow: land + touch-and-go NORTHBOUND on 34R (lng −122.3116), then a
// right-hand pattern out east over the Kent/Tukwila valley and back onto final
// from the south.
const NORTH_FLOW = circuit([
  [47.355, -122.3116, 1.15], // on final, well south, descending
  [47.395, -122.3116, 0.62], // short final
  [47.425, -122.3116, 0.11], // over the threshold, flaring
  [47.442, -122.3116, 0.0], // touchdown, rolling out on 34R
  [47.462, -122.3116, 0.06], // rotate again — the touch-and-go lifts off
  [47.492, -122.313, 0.44], // climbing out to the north
  [47.515, -122.295, 0.9], // crosswind, banking right toward the valley
  [47.52, -122.262, 1.3], // rolling out onto the downwind, east of the field
  [47.47, -122.25, 1.5], // downwind, heading south
  [47.41, -122.25, 1.5], // downwind
  [47.36, -122.263, 1.35], // base leg, banking west
  [47.34, -122.29, 1.2], // turning final
  [47.348, -122.3116, 1.18], // rejoining the extended centerline
  [47.355, -122.3116, 1.15], // close the loop
]);

// SOUTH flow: land + touch-and-go SOUTHBOUND on 16C (lng −122.3054), then a
// pattern out WEST over Puget Sound and back onto final from the north. The
// mirror image, so the two flows read as real opposing traffic.
const SOUTH_FLOW = circuit([
  [47.53, -122.3054, 1.15], // on final from the north, descending
  [47.492, -122.3054, 0.62], // short final
  [47.462, -122.3054, 0.11], // over the north threshold, flaring
  [47.445, -122.3054, 0.0], // touchdown, rolling out on 16C
  [47.425, -122.3054, 0.06], // rotate — touch-and-go
  [47.395, -122.307, 0.44], // climbing out to the south
  [47.372, -122.325, 0.9], // crosswind, banking right toward the water
  [47.368, -122.36, 1.3], // downwind, west of the field, over the Sound
  [47.42, -122.372, 1.5], // downwind, heading north
  [47.48, -122.372, 1.5], // downwind
  [47.53, -122.36, 1.35], // base leg, banking east
  [47.548, -122.33, 1.2], // turning final
  [47.54, -122.3054, 1.18], // rejoining the centerline
  [47.53, -122.3054, 1.15], // close the loop
]);

export interface Flight {
  circuit: Circuit;
  airline: 0 | 1; // 0 Alaska, 1 Delta
  speedKmS: number;
  phase: number; // fraction of the lap already flown at t = 0
}

// Four jets aloft — one Delta + one Alaska on each flow, phase-spread so the
// pattern is never empty and a landing jet meets a departing one. Combined
// with the two parked below, the fleet is exactly 50/50.
export const FLIGHTS: Flight[] = [
  { circuit: NORTH_FLOW, airline: 1, speedKmS: 0.17, phase: 0.0 }, // Delta
  { circuit: NORTH_FLOW, airline: 0, speedKmS: 0.17, phase: 0.52 }, // Alaska
  { circuit: SOUTH_FLOW, airline: 0, speedKmS: 0.17, phase: 0.2 }, // Alaska
  { circuit: SOUTH_FLOW, airline: 1, speedKmS: 0.17, phase: 0.72 }, // Delta
];

// Parked at the terminal's west-facing gates, nosed out toward the apron —
// the fleet at rest, one of each livery.
const PARKED: { lat: number; lng: number; yaw: number; airline: 0 | 1 }[] = [
  { lat: 47.4449, lng: -122.3033, yaw: Math.PI + 0.06, airline: 1 }, // Delta
  { lat: 47.4429, lng: -122.3033, yaw: Math.PI - 0.05, airline: 0 }, // Alaska
];

export interface FlightPose {
  x: number;
  z: number;
  y: number;
  yaw: number;
  pitch: number;
  roll: number;
}

const scratch: FlightPose = { x: 0, z: 0, y: 0, yaw: 0, pitch: 0, roll: 0 };

const wrapPi = (a: number) => {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
};

/** Heading of the circuit at arc length s (forward tangent). */
function headingAt(c: Circuit, s: number): number {
  const len = c.lengthKm;
  s = ((s % len) + len) % len;
  const { pts, cum } = c;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const a = pts[i - 1];
  const b = pts[i];
  return Math.atan2(-(b.z - a.z), b.x - a.x);
}

/** Where a flight is at clock time t: arc-length along its closed circuit,
 *  altitude + pitch from the waypoint profile, and a bank angle recovered from
 *  the upcoming turn so the jet rolls into the pattern's corners. */
export function airlinerPoseAt(f: Flight, t: number, out: FlightPose = scratch): FlightPose {
  const c = f.circuit;
  const period = c.lengthKm / f.speedKmS;
  const p = (((t + f.phase * period) % period) + period) % period;
  const s = p * f.speedKmS;

  const { pts, cum } = c;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const seg = Math.max(1e-6, cum[i] - cum[i - 1]);
  const fr = THREE.MathUtils.clamp((s - cum[i - 1]) / seg, 0, 1);
  const a = pts[i - 1];
  const b = pts[i];
  out.x = a.x + (b.x - a.x) * fr;
  out.z = a.z + (b.z - a.z) * fr;
  out.y = a.alt + (b.alt - a.alt) * fr;
  out.yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
  out.pitch = THREE.MathUtils.clamp(Math.atan2(b.alt - a.alt, seg), -0.32, 0.34);
  // Bank into the turn: compare heading a short way ahead. On the ground
  // (altitude ~0 — the rollout) the wings stay level.
  const dHead = wrapPi(headingAt(c, s + 0.22) - out.yaw);
  const airborne = THREE.MathUtils.smoothstep(out.y, 0.02, 0.2);
  out.roll = THREE.MathUtils.clamp(dHead * 2.1, -0.7, 0.7) * airborne;
  return out;
}

// ---------------------------------------------------------------------------
// Livery atlas: one canvas, Delta stacked over Alaska. Each 512×256 band is
// laid out identically — a run of solid swatches (fuselage white, wing grey,
// brand accent) plus a wide wordmark panel and a tall tail panel — so the
// same authored UVs land on either livery once `aAirline` slides V by 0.5.
// (Canvas fillText uses only system fonts; no web-font fetch, per the rule.)
// ---------------------------------------------------------------------------

const WASHI_WHITE = "#ece7da"; // warm hull white, kept off pure white for the print
const WING_GREY = "#c7c8bb";
const DELTA_NAVY = "#0d2a63";
const DELTA_RED = "#c8102e";
const ALASKA_NAVY = "#14315c";
const ALASKA_TEAL = "#2ea3a3";
const ALASKA_GREEN = "#7ac043";
const ALASKA_BLUE = "#3b8ede";

function drawBand(ctx: CanvasRenderingContext2D, oy: number, airline: 0 | 1) {
  const W = 512;
  // Whole band starts as hull white; panels overpaint it.
  ctx.fillStyle = WASHI_WHITE;
  ctx.fillRect(0, oy, W, 256);

  // --- solid swatches (top-left corner of the band) ---
  ctx.fillStyle = WASHI_WHITE; // WHITE swatch  px 0..40
  ctx.fillRect(0, oy + 0, 40, 40);
  ctx.fillStyle = WING_GREY; // GREY swatch   px 40..80
  ctx.fillRect(40, oy + 0, 40, 40);
  ctx.fillStyle = airline === 1 ? DELTA_NAVY : ALASKA_TEAL; // ACCENT px 80..120
  ctx.fillRect(80, oy + 0, 40, 40);

  // --- wordmark panel: px x[130..500], y[10..90] ---
  const wx = 130;
  const wy = oy + 10;
  ctx.fillStyle = WASHI_WHITE;
  ctx.fillRect(wx, wy, 370, 80);
  if (airline === 1) {
    // Delta: the red "widget" chevron, then DELTA in navy.
    ctx.fillStyle = DELTA_RED;
    ctx.beginPath();
    ctx.moveTo(wx + 14, wy + 62);
    ctx.lineTo(wx + 44, wy + 14);
    ctx.lineTo(wx + 74, wy + 62);
    ctx.lineTo(wx + 58, wy + 62);
    ctx.lineTo(wx + 44, wy + 40);
    ctx.lineTo(wx + 30, wy + 62);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = DELTA_NAVY;
    ctx.font = "700 58px Arial, Helvetica, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    // letter-spaced DELTA
    let x = wx + 92;
    for (const ch of "DELTA") {
      ctx.fillText(ch, x, wy + 44);
      x += ctx.measureText(ch).width + 10;
    }
  } else {
    // Alaska: the italic script wordmark.
    ctx.fillStyle = ALASKA_NAVY;
    ctx.font = "italic 700 62px Georgia, 'Times New Roman', serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText("Alaska", wx + 20, wy + 44);
  }

  // --- tail panel: px x[140..470], y[96..248] ---
  const tx = 140;
  const ty = oy + 96;
  const tw = 330;
  const th = 152;
  if (airline === 1) {
    // Delta tail: the three-dimensional widget — a red facet over a blue one
    // on the white fin.
    ctx.fillStyle = WASHI_WHITE;
    ctx.fillRect(tx, ty, tw, th);
    const cx = tx + tw * 0.52;
    const top = ty + th * 0.12;
    const bot = ty + th * 0.9;
    const left = tx + tw * 0.16;
    const right = tx + tw * 0.86;
    ctx.fillStyle = DELTA_NAVY; // lower-left facet
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(left, bot);
    ctx.lineTo(cx, bot);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = DELTA_RED; // upper-right facet
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(right, bot);
    ctx.lineTo(cx, bot);
    ctx.closePath();
    ctx.fill();
  } else {
    // Alaska tail: navy fin, the parka-hood face in white, and the flowing
    // green-blue ribbons sweeping up from the base.
    ctx.fillStyle = ALASKA_NAVY;
    ctx.fillRect(tx, ty, tw, th);
    // the ribbon swoosh across the base of the fin
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    const ribbon = (color: string, dy: number) => {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(tx + 6, ty + th - 10 + dy);
      ctx.quadraticCurveTo(tx + tw * 0.5, ty + th - 44 + dy, tx + tw - 6, ty + th - 24 + dy);
      ctx.stroke();
    };
    ribbon(ALASKA_BLUE, 0);
    ribbon(ALASKA_TEAL, -12);
    ribbon(ALASKA_GREEN, -24);
    // the face (simplified Chester Uttana parka-hood profile), in white
    const fx = tx + tw * 0.46;
    const fy = ty + th * 0.42;
    ctx.fillStyle = WASHI_WHITE;
    ctx.beginPath();
    ctx.ellipse(fx, fy, tw * 0.19, th * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // brow + eye + smile, drawn back into the navy
    ctx.fillStyle = ALASKA_NAVY;
    ctx.beginPath();
    ctx.ellipse(fx + 6, fy - 6, tw * 0.05, th * 0.06, 0, 0, Math.PI * 2); // eye
    ctx.fill();
    ctx.strokeStyle = ALASKA_NAVY;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(fx + 2, fy + 8, tw * 0.09, 0.15 * Math.PI, 0.72 * Math.PI); // smile
    ctx.stroke();
  }
}

function buildLiveryTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = WASHI_WHITE;
  ctx.fillRect(0, 0, 512, 512);
  drawBand(ctx, 0, 1); // Delta in the upper (canvas-top) band → UV v in [0.5,1]
  drawBand(ctx, 256, 0); // Alaska in the lower band → UV v in [0,0.5]
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// Atlas UV rects, authored for the LOWER (Alaska) band; +0.5 in the shader
// reaches the Delta band. Derived from the canvas px rects above (H = 512,
// band origin y = 256), v measured from the bottom.
const UV = {
  white: [40 / 512 / 2, 0.5 - 20 / 512] as const, // point in WHITE swatch (u≈0.039, v≈0.461)
  grey: [60 / 512, 0.5 - 20 / 512] as const,
  accent: [100 / 512, 0.5 - 20 / 512] as const,
  word: [130 / 512, 0.5 - 90 / 512, 500 / 512, 0.5 - 10 / 512] as const, // u0,v0,u1,v1
  tail: [140 / 512, 0.5 - 248 / 512, 470 / 512, 0.5 - 96 / 512] as const,
};

/** Collapse every UV of a part onto a single atlas point → a flat swatch. */
function swatch(geo: THREE.BufferGeometry, uv: readonly [number, number]) {
  const a = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < a.count; i++) a.setXY(i, uv[0], uv[1]);
  return geo;
}

/** Remap a part's 0..1 UVs into an atlas rect → text / tail art on each face. */
function panel(geo: THREE.BufferGeometry, rect: readonly [number, number, number, number]) {
  const [u0, v0, u1, v1] = rect;
  const a = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < a.count; i++) {
    a.setXY(i, u0 + a.getX(i) * (u1 - u0), v0 + a.getY(i) * (v1 - v0));
  }
  return geo;
}

/** Unit-ish 737 silhouette along +X, wheels/belly near y = 0: tube fuselage,
 *  nose + tail cones, swept low wings with engines and colored winglets,
 *  swept tail fin, tailplane, and the two fuselage-side wordmark faces. */
function buildAirliner(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // fuselage tube (white)
  const fuselage = new THREE.CylinderGeometry(0.06, 0.06, 0.86, 16);
  fuselage.rotateZ(Math.PI / 2); // lie along X
  fuselage.translate(0, 0.0, 0);
  parts.push(swatch(fuselage, UV.white));

  // nose cone (white)
  const nose = new THREE.ConeGeometry(0.06, 0.16, 16);
  nose.rotateZ(-Math.PI / 2);
  nose.translate(0.5, 0, 0);
  parts.push(swatch(nose, UV.white));

  // tail cone, raked up a touch (white)
  const tailcone = new THREE.ConeGeometry(0.06, 0.16, 16);
  tailcone.rotateZ(Math.PI / 2);
  tailcone.translate(-0.5, 0.02, 0);
  parts.push(swatch(tailcone, UV.white));

  // swept wings (grey), one per side
  for (const side of [-1, 1] as const) {
    const wing = new THREE.BoxGeometry(0.2, 0.02, 0.42);
    wing.rotateY(side * 0.26); // sweep back
    wing.translate(-0.03, -0.035, side * 0.24);
    parts.push(swatch(wing, UV.grey));
    // colored winglet at the tip (brand accent)
    const winglet = new THREE.BoxGeometry(0.05, 0.075, 0.014);
    winglet.translate(-0.14, 0.01, side * 0.45);
    parts.push(swatch(winglet, UV.accent));
    // engine nacelle under/ahead of the wing (grey)
    const engine = new THREE.CylinderGeometry(0.028, 0.028, 0.15, 12);
    engine.rotateZ(Math.PI / 2);
    engine.translate(0.03, -0.07, side * 0.2);
    parts.push(swatch(engine, UV.grey));
  }

  // tail fin, swept back (tail-art panel on both faces)
  const fin = new THREE.BoxGeometry(0.14, 0.2, 0.012);
  fin.translate(0, 0.1, 0); // pivot at its base
  fin.rotateZ(-0.32); // rake the top backward
  fin.translate(-0.4, 0.06, 0);
  parts.push(panel(fin, UV.tail));

  // tailplane / horizontal stabilizers (brand accent), one per side
  for (const side of [-1, 1] as const) {
    const stab = new THREE.BoxGeometry(0.09, 0.014, 0.16);
    stab.rotateY(side * 0.2);
    stab.translate(-0.44, 0.03, side * 0.08);
    parts.push(swatch(stab, UV.accent));
  }

  // wordmark: a thin slab spanning the fuselage width so its two big side
  // faces sit on the skin at ±0.06 and both carry the airline name.
  const word = new THREE.BoxGeometry(0.46, 0.055, 0.121);
  word.translate(0.04, 0.012, 0);
  parts.push(panel(word, UV.word));

  const merged = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

const TOY_LEN = 0.26; // storybook scale — reads as a toy jet beside the big terminal
const COUNT = FLIGHTS.length + PARKED.length;

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const qYaw = new THREE.Quaternion();
const qPitch = new THREE.Quaternion();
const qRoll = new THREE.Quaternion();
const scale = new THREE.Vector3();
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

export function Airliners() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { geometry, texture } = useMemo(() => {
    const geometry = buildAirliner();
    // per-instance livery flag: flights first, then the parked pair
    const airline = new Float32Array(COUNT);
    for (let i = 0; i < FLIGHTS.length; i++) airline[i] = FLIGHTS[i].airline;
    for (let i = 0; i < PARKED.length; i++) airline[FLIGHTS.length + i] = PARKED[i].airline;
    const attr = new THREE.InstancedBufferAttribute(airline, 1);
    geometry.setAttribute("aAirline", attr);
    return { geometry, texture: buildLiveryTexture() };
  }, []);

  const parkedWritten = useRef(false);

  useFrame(() => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;
    m.uniforms.uOpacity.value = LIVE.ferryOpacity;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
    // Jets work the field day and night; only dim toward the lantern print.
    m.uniforms.uNight.value = 1 - THREE.MathUtils.smoothstep(sunPhase(), 0.1, 0.32);

    for (let i = 0; i < FLIGHTS.length; i++) {
      const { x, y, z, yaw, pitch, roll } = airlinerPoseAt(FLIGHTS[i], CLOCK.t);
      qYaw.setFromAxisAngle(AXIS_Y, yaw);
      qPitch.setFromAxisAngle(AXIS_Z, pitch);
      qRoll.setFromAxisAngle(AXIS_X, roll);
      quaternion.copy(qYaw).multiply(qPitch).multiply(qRoll);
      matrix.compose(position.set(x, y, z), quaternion, scale.setScalar(TOY_LEN));
      mesh.setMatrixAt(i, matrix);
    }

    // The parked pair never moves — write those matrices once.
    if (!parkedWritten.current) {
      parkedWritten.current = true;
      for (let i = 0; i < PARKED.length; i++) {
        const p = PARKED[i];
        const { x, z } = projectLatLng(p.lat, p.lng);
        quaternion.setFromAxisAngle(AXIS_Y, p.yaw);
        matrix.compose(position.set(x, 0, z), quaternion, scale.setScalar(TOY_LEN));
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
          uTex: { value: texture },
          uOpacity: { value: LIVE.ferryOpacity },
          uNight: { value: 0 },
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
