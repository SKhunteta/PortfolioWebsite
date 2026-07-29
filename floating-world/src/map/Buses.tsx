// The bus fleet: King County Metro toy buses working the long arterials among
// the street cars — the transit stratum of the road life. Same honesty tier
// as the cars and cyclists (real baked-OSM geography, deterministic from the
// scene clock, keyed to the actual Seattle hour, NEVER presented as live —
// no per-bus feed, clearly stylized toys), but keyed to Metro's SERVICE SPAN
// (world/buses.ts) rather than car traffic pressure: buses keep rolling
// through the midday slump and the evening, and at 3am only the owl network's
// one or two night runs are out.
//
// The signature move is the STOP: each bus works its corridor stop to stop —
// ease to the curb, dwell, pull back out — driven by the pure stop-and-go
// profile in world/buses.ts (node-safe, vitest-covered). While `moving` falls
// toward a dwell the bus slides curbKm FURTHER to its lane side, so a stop
// reads as pulling over, not stalling in traffic; the cars behind glide past.
//
// ONE InstancedMesh (one draw call, the instanced-everything rule); matrices,
// a per-bus fade and the static livery flag are written imperatively — the
// hot path never touches React. Two liveries split structurally like the
// airliners' Delta/Alaska halves: most of the fleet whole-coated in Metro's
// chartreuse-green, a few in RapidRide's madder red, each with a washi
// beltline carrying the window run — pigment kept ON THE ROOF and a sumi
// keyline at the wheels and ends, because the drift camera reads roofs and
// ink is what pops on bright paper (the first cut's cream tops vanished into
// the page). Windows light lantern-warm after dark by MIX (never bloom);
// normal-blended, mixed toward LIVE.fog. renderOrder 5.62: with the cars
// (5.6), under the ferries/buildings/landmarks (6).

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HAS_BASEMAP, BASEMAP_ROADS } from "./basemap";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { PROFILE } from "../world/device";
import { CONFIG } from "../world/config";
import { busDistanceAt, busService, type BusRun } from "../world/buses";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aFade;
  attribute float aLivery; // 0 = Metro chartreuse-green, 1 = RapidRide red
  varying vec3 vLocal;
  varying float vFade;
  varying float vLivery;
  void main() {
    vLocal = position;
    vFade = aFade;
    vLivery = aLivery;
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
  varying float vLivery;
  uniform vec3 uBody;    // washi cream — the beltline both liveries wear
  uniform vec3 uGreen;   // Metro chartreuse-green coat
  uniform vec3 uRed;     // RapidRide madder red
  uniform vec3 uInk;
  uniform vec3 uWindow;
  uniform float uWindowIntensity;
  uniform vec3 uLamp;
  uniform float uLampIntensity;
  uniform float uOpacity;
  void main() {
    if (vFade < 0.01) discard;
    // vLocal spans x in [-0.5,0.5] (length), y in [0,~0.3] (height).
    float wash = wcFbm(vWorld * 2.2 + vLocal.y * 4.0);

    // Pigment ON TOP: the drift camera reads roofs, and the first cut's
    // washi-cream Metro top simply vanished into the paper from the default
    // framing. Each coach wears its identity color whole-coat — Metro the
    // chartreuse-green, RapidRide the madder red — with the washi beltline
    // at window height carrying the glass, so the fleet reads at drift
    // distance from any angle.
    vec3 c = mix(uGreen, uRed, vLivery);

    // The washi beltline and its window run — dark glass by day, lantern-gold
    // after dark via the shared window palette, dashed so it reads as panes.
    float belt = smoothstep(0.15, 0.17, vLocal.y) * (1.0 - smoothstep(0.25, 0.27, vLocal.y));
    float dash = step(0.3, wcHash(vec2(floor(vLocal.x * 22.0), 3.7)));
    c = mix(c, uBody, belt * 0.9);
    c = mix(c, uWindow * (0.18 + uWindowIntensity), belt * dash * 0.8);

    // Roof catches a touch more light than the flanks — tonal volume.
    c *= (0.76 + 0.38 * wash) * mix(0.88, 1.06, smoothstep(0.0, 0.3, vLocal.y));

    // The sumi keyline — the train lesson: ink is what pops on bright paper
    // at drift distance. A dark seat at the wheels and inked nose/tail ends.
    float ink = max(1.0 - smoothstep(0.0, 0.045, vLocal.y), smoothstep(0.44, 0.48, abs(vLocal.x)));
    c = mix(c, uInk, ink * 0.7);

    // Headlamps (front, +x) and a fainter tail (rear, -x), low on the body —
    // lit after the ink so the lamps still burn through the keyline.
    float low = 1.0 - smoothstep(0.05, 0.14, vLocal.y);
    float head = smoothstep(0.4, 0.47, vLocal.x) * low;
    float tail = smoothstep(0.4, 0.47, -vLocal.x) * low;
    c = mix(c, uLamp * (0.35 + uLampIntensity), head * 0.9);
    c = mix(c, uLamp * (0.2 + 0.55 * uLampIntensity), tail * 0.5);

    float a = uOpacity * vFade * (0.9 + 0.2 * wash);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a);
  }
`;

// --- corridors --------------------------------------------------------------
// Buses ride only the long MAJOR strokes — the trunk streets a route would
// actually work — with a higher length floor than the cars', so a bus never
// shuttles a two-block stub. Built once, deterministically, like Cars.tsx.

interface Corridor {
  xs: Float32Array;
  zs: Float32Array;
  cum: Float32Array;
  length: number;
}

function buildCorridors(): Corridor[] {
  const out: Corridor[] = [];
  for (const line of BASEMAP_ROADS.major ?? []) {
    if (line.length < 2) continue;
    const cum = new Float32Array(line.length);
    let len = 0;
    for (let i = 1; i < line.length; i++) {
      len += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
      cum[i] = len;
    }
    if (len < CONFIG.bus.minCorridorKm) continue;
    const xs = new Float32Array(line.length);
    const zs = new Float32Array(line.length);
    for (let i = 0; i < line.length; i++) {
      xs[i] = line[i][0];
      zs[i] = line[i][1];
    }
    out.push({ xs, zs, cum, length: len });
  }
  return out;
}

const CORRIDORS = HAS_BASEMAP ? buildCorridors() : [];

// Deterministic 0..1 hash — no Math.random (the scene's determinism rule).
function hash(n: number): number {
  return Math.abs((Math.sin(n * 91.37 + 12.7) * 43758.5453) % 1);
}

interface Bus {
  ci: number; // corridor index
  run: BusRun; // the stop-and-go loop (world/buses.ts)
  forward: boolean; // travel direction along the corridor
  laneSign: number; // which side of the stroke (+1 / -1)
  livery: number; // 0 Metro, 1 RapidRide
  threshold: number; // out only when the hour's service span clears this
}

function buildFleet(): Bus[] {
  if (!CORRIDORS.length) return [];
  const count = PROFILE.busCount;
  // Weight corridor choice by length so the long trunk streets carry the
  // routes — where the real network runs its frequent service.
  const totalLen = CORRIDORS.reduce((a, c) => a + c.length, 0);
  const buses: Bus[] = [];
  for (let i = 0; i < count; i++) {
    const target = hash(i * 2.17 + 0.3) * totalLen;
    let acc = 0;
    let ci = 0;
    for (; ci < CORRIDORS.length - 1; ci++) {
      acc += CORRIDORS[ci].length;
      if (acc >= target) break;
    }
    const forward = hash(i * 5.11 + 1.9) > 0.5;
    buses.push({
      ci,
      run: {
        lengthKm: CORRIDORS[ci].length,
        speedKmS:
          CONFIG.bus.speedKmS * (1 + (hash(i * 7.31 + 2.4) - 0.5) * 2 * CONFIG.bus.speedJitter),
        stopSpacingKm: CONFIG.bus.stopSpacingKm,
        dwellS: CONFIG.bus.dwellS,
        phase: hash(i * 3.73 + 0.7),
      },
      forward,
      laneSign: forward ? 1 : -1,
      // RapidRide is the smaller share of the fleet, like the real network.
      livery: hash(i * 11.29 + 6.2) < 0.3 ? 1 : 0,
      threshold: hash(i * 9.19 + 4.1) * 0.92,
    });
  }
  return buses;
}

const BUSES = buildFleet();

interface BusPose {
  x: number;
  z: number;
  yaw: number;
  fade: number; // 0..1 ease at the corridor ends
  moving: number; // 0 dwelling at a stop .. 1 under way
}

const pose: BusPose = { x: 0, z: 0, yaw: 0, fade: 0, moving: 0 };

/** Where a bus is at clock time t: the stop-and-go arc distance from
 *  world/buses.ts placed onto the corridor polyline, slid laneOffsetKm to its
 *  side plus curbKm more while it eases into a stop. Fades over fadeKm at the
 *  corridor ends so the loop wrap never pops (the Cars.tsx contract). */
function busPoseAt(bus: Bus, t: number, out: BusPose = pose): BusPose {
  const c = CORRIDORS[bus.ci];
  const travel = c.length;
  const { s: d, moving } = busDistanceAt(t, bus.run);
  const s = bus.forward ? d : travel - d;

  const { xs, zs, cum } = c;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const seg = Math.max(1e-6, cum[i] - cum[i - 1]);
  const f = THREE.MathUtils.clamp((s - cum[i - 1]) / seg, 0, 1);
  const ax = xs[i - 1];
  const az = zs[i - 1];
  let dx = xs[i] - ax;
  let dz = zs[i] - az;
  const px = ax + dx * f;
  const pz = az + dz * f;
  if (!bus.forward) {
    dx = -dx;
    dz = -dz;
  }
  const inv = 1 / Math.max(1e-6, Math.hypot(dx, dz));
  const tx = dx * inv;
  const tz = dz * inv;
  // Lane offset plus the curb slide: as `moving` falls toward a dwell the bus
  // pulls curbKm further aside, and pulls back out as it gets under way.
  const off = (CONFIG.bus.laneOffsetKm + CONFIG.bus.curbKm * (1 - moving)) * bus.laneSign;
  out.x = px + tz * off;
  out.z = pz - tx * off;
  out.yaw = Math.atan2(-tz, tx);
  const edge = Math.min(d, travel - d);
  out.fade = THREE.MathUtils.clamp(edge / CONFIG.bus.fadeKm, 0, 1);
  out.moving = moving;
  return out;
}

/** Unit-length bus along +X, wheels near y = 0: one long tall slab with a
 *  slightly inset roof — the flat-faced transit box, legible against the
 *  low-slung cars at a glance. The paint carries the identity. */
function buildBus(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const body = new THREE.BoxGeometry(0.96, 0.27, 0.3);
  body.translate(0, 0.145, 0);
  parts.push(body);
  const roof = new THREE.BoxGeometry(0.88, 0.03, 0.26);
  roof.translate(0, 0.295, 0);
  parts.push(roof);
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

function smoothstep(e0: number, e1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Fixed livery pigments — woodblock-muted, well under the bloom ceiling.
const METRO_GREEN = new THREE.Color("#7c9440"); // Metro chartreuse, mossed to the paper
const RAPID_RED = new THREE.Color("#a83c30"); // RapidRide madder red

export function Buses() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { geometry, fadeAttr } = useMemo(() => {
    const geometry = buildBus();
    const n = Math.max(1, BUSES.length);
    const fadeAttr = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    fadeAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aFade", fadeAttr);
    // The livery split is static — written once, like the airliners' halves.
    const livery = new Float32Array(n);
    for (let i = 0; i < BUSES.length; i++) livery[i] = BUSES[i].livery;
    geometry.setAttribute("aLivery", new THREE.InstancedBufferAttribute(livery, 1));
    return { geometry, fadeAttr };
  }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;
    // A step bolder than the carts' wash: transit is a mark, not a texture.
    m.uniforms.uOpacity.value = Math.min(1, LIVE.trafficIntensity * 1.6);
    m.uniforms.uWindowIntensity.value = LIVE.windowIntensity;
    m.uniforms.uLampIntensity.value = LIVE.windowIntensity;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
    // How much of the fleet is out right now, by Metro's service span for the
    // real Seattle hour. Each bus has its own threshold, so the network thins
    // smoothly toward the lone owl run at 3am.
    const span = busService();
    for (let i = 0; i < BUSES.length; i++) {
      const bus = BUSES[i];
      const { x, z, yaw, fade } = busPoseAt(bus, CLOCK.t);
      const present = smoothstep(bus.threshold - 0.06, bus.threshold + 0.06, span);
      quaternion.setFromAxisAngle(UP, yaw);
      matrix.compose(position.set(x, CONFIG.bus.y, z), quaternion, scale.setScalar(CONFIG.bus.toyLenKm));
      mesh.setMatrixAt(i, matrix);
      fadeAttr.setX(i, fade * present);
    }
    mesh.instanceMatrix.needsUpdate = true;
    fadeAttr.needsUpdate = true;
  });

  if (!BUSES.length) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, BUSES.length]}
      geometry={geometry}
      renderOrder={5.62}
      frustumCulled={false}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          // Beltline: the ferry cream (pale washi by day, lantern-warm at
          // night) — a pale waistband on the pigment coats.
          uBody: { value: LIVE.ferry },
          uGreen: { value: METRO_GREEN },
          uRed: { value: RAPID_RED },
          uInk: { value: LIVE.buildingInk },
          uWindow: { value: LIVE.trainWindow },
          uWindowIntensity: { value: LIVE.windowIntensity },
          uLamp: { value: LIVE.traffic },
          uLampIntensity: { value: LIVE.windowIntensity },
          uOpacity: { value: 1 },
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
