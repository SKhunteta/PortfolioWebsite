// The street traffic: a fleet of toy cars gliding the real road network, so
// the city reads as LIVED-IN rather than empty between trains. The honest
// sibling of the ferries and the Burke-Gilman riders — real geography (the
// baked OSM road strokes), a real driving pace, deterministic from the scene
// clock, keyed to the actual Seattle hour, and NEVER presented as live: there
// is no per-car feed, so these are painted ambient life, clearly stylized toy
// carts, not tracked vehicles. This is the layer that replaced the old abstract
// traffic wash — instead of a blurred shimmer, you can pick out a single cart
// and watch it drive a block.
//
// A car is assigned once (deterministically) to a road CORRIDOR — one of the
// longer baked road segments — with a phase, a speed, a direction, and a lane
// side. Each frame it loops forward along its corridor and EASES IN/OUT at the
// two ends, so the wrap never pops: a cart drifts onto the visible stroke,
// drives it, and drifts off, exactly like traffic entering and leaving frame.
// Opposing directions ride opposite sides of the stroke (two lanes). How many
// carts are out keys to world/traffic.ts: a full street at rush, a lone cart or
// two at 3am, empty when pinned off.
//
// ONE InstancedMesh (one draw call, the instanced-everything rule); matrices +
// a per-car fade attribute are written imperatively in useFrame — the hot path
// never touches React. Body painted in the label ink (sumi-brown by day, warm
// cream by lantern light) with warm HEADLAMPS that light only after dark
// (reusing the train/ferry window palette: dark glass by day, lantern-gold at
// night). Normal-blended, mixed toward LIVE.fog so distant carts dissolve into
// the kasumi, painted by MIX so they never cross the bright-paper bloom line.
// renderOrder 5.6: above the road ink (5), beneath the ferries, buildings and
// landmarks (6).

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HAS_BASEMAP, BASEMAP_ROADS } from "./basemap";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { PROFILE } from "../world/device";
import { CONFIG } from "../world/config";
import { trafficIntensity } from "../world/traffic";
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
  uniform vec3 uLamp;
  uniform float uLampIntensity;
  uniform float uOpacity;
  void main() {
    if (vFade < 0.01) discard;
    float wash = wcFbm(vWorld * 2.2 + vLocal.y * 4.0);
    // Roof catches a touch more light than the flanks — a little tonal volume.
    vec3 c = uColor * (0.74 + 0.4 * wash) * mix(0.86, 1.08, smoothstep(0.0, 0.34, vLocal.y));
    // Headlamps (front, +x) and a fainter tail (rear, -x), low on the body —
    // dark glass by day, warm lantern light after dark via the window palette.
    float low = 1.0 - smoothstep(0.06, 0.2, vLocal.y);
    float head = smoothstep(0.3, 0.42, vLocal.x) * low;
    float tail = smoothstep(0.3, 0.42, -vLocal.x) * low;
    c = mix(c, uLamp * (0.35 + uLampIntensity), head * 0.9);
    c = mix(c, uLamp * (0.2 + 0.55 * uLampIntensity), tail * 0.5);
    float a = uOpacity * vFade * (0.9 + 0.2 * wash);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a);
  }
`;

// --- corridors --------------------------------------------------------------
// The baked roads are already projected km [x, z]; a corridor is just one of
// the longer segments, with cumulative arc-length so a car can be placed by
// distance. Built once, deterministically (no Math.random — the scene's
// determinism rule), so reloads lay the traffic out identically.

interface Corridor {
  xs: Float32Array;
  zs: Float32Array;
  cum: Float32Array; // cumulative length to each point
  length: number;
}

function buildCorridors(): Corridor[] {
  const minKm = CONFIG.car.minCorridorKm;
  const out: Corridor[] = [];
  // Majors carry the bulk of the traffic; a longer arterial threshold adds a
  // few neighbourhood streets without flooding every side road.
  const sources: [ [number, number][][], number ][] = [
    [BASEMAP_ROADS.major ?? [], minKm],
    [BASEMAP_ROADS.arterial ?? [], minKm + 0.35],
  ];
  for (const [lines, threshold] of sources) {
    for (const line of lines) {
      if (line.length < 2) continue;
      const cum = new Float32Array(line.length);
      let len = 0;
      for (let i = 1; i < line.length; i++) {
        len += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
        cum[i] = len;
      }
      if (len < threshold) continue;
      const xs = new Float32Array(line.length);
      const zs = new Float32Array(line.length);
      for (let i = 0; i < line.length; i++) {
        xs[i] = line[i][0];
        zs[i] = line[i][1];
      }
      out.push({ xs, zs, cum, length: len });
    }
  }
  return out;
}

const CORRIDORS = HAS_BASEMAP ? buildCorridors() : [];

// Deterministic 0..1 hash — no Math.random, so the fleet is identical on every
// reload (matching the cyclists/ferries).
function hash(n: number): number {
  return Math.abs((Math.sin(n * 91.37 + 12.7) * 43758.5453) % 1);
}

interface Car {
  ci: number; // corridor index
  phase: number; // fraction of the corridor already driven at t = 0
  speed: number; // km/s along the corridor
  forward: boolean; // travel direction along the corridor
  laneSign: number; // which side of the stroke (+1 / -1)
  threshold: number; // out only when the hour's pressure clears this
}

function buildFleet(): Car[] {
  if (!CORRIDORS.length) return [];
  const count = PROFILE.carCount;
  // Weight corridor choice by length so long arterials carry more cars than
  // short blocks — traffic pools naturally on the big streets.
  const totalLen = CORRIDORS.reduce((a, c) => a + c.length, 0);
  const cars: Car[] = [];
  for (let i = 0; i < count; i++) {
    const target = hash(i * 2.17 + 0.3) * totalLen;
    let acc = 0;
    let ci = 0;
    for (; ci < CORRIDORS.length - 1; ci++) {
      acc += CORRIDORS[ci].length;
      if (acc >= target) break;
    }
    const forward = hash(i * 5.11 + 1.9) > 0.5;
    cars.push({
      ci,
      phase: hash(i * 3.73 + 0.7),
      speed: CONFIG.car.speedKmS * (1 + (hash(i * 7.31 + 2.4) - 0.5) * 2 * CONFIG.car.speedJitter),
      forward,
      laneSign: forward ? 1 : -1,
      threshold: hash(i * 9.19 + 4.1) * 0.92,
    });
  }
  return cars;
}

const CARS = buildFleet();

interface CarPose {
  x: number;
  z: number;
  yaw: number;
  fade: number; // 0..1 ease at the corridor ends
}

const pose: CarPose = { x: 0, z: 0, yaw: 0, fade: 0 };

/** Where a car is at clock time t: loops forward along its corridor, easing in
 *  and out over CONFIG.car.fadeKm at each end so the wrap is invisible. Heading
 *  is the travel tangent; the car is slid laneOffsetKm to its side. */
function carPoseAt(car: Car, t: number, out: CarPose = pose): CarPose {
  const c = CORRIDORS[car.ci];
  const travel = c.length;
  let d = (car.phase * travel + t * car.speed) % travel;
  if (d < 0) d += travel;
  const s = car.forward ? d : travel - d;

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
  // Travel tangent (reverse cars drive the segment backwards).
  if (!car.forward) {
    dx = -dx;
    dz = -dz;
  }
  const inv = 1 / Math.max(1e-6, Math.hypot(dx, dz));
  const tx = dx * inv;
  const tz = dz * inv;
  // Lane offset: perpendicular to travel, opposing directions to opposite sides.
  const off = CONFIG.car.laneOffsetKm * car.laneSign;
  out.x = px + tz * off;
  out.z = pz - tx * off;
  out.yaw = Math.atan2(-tz, tx);
  // Ease over the driven distance from whichever end is nearer.
  const edge = Math.min(d, travel - d);
  const fadeKm = CONFIG.car.fadeKm;
  out.fade = THREE.MathUtils.clamp(edge / fadeKm, 0, 1);
  return out;
}

/** Unit-length car along +X, wheels near y = 0: a low body, a stubby cabin set
 *  back, and a hint of a windshield — a legible woodblock toy, not a model. */
function buildCar(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const body = new THREE.BoxGeometry(0.92, 0.16, 0.46);
  body.translate(0, 0.1, 0);
  parts.push(body);
  const cabin = new THREE.BoxGeometry(0.5, 0.16, 0.42);
  cabin.translate(-0.06, 0.24, 0);
  parts.push(cabin);
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

export function Cars() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { geometry, fadeAttr } = useMemo(() => {
    const geometry = buildCar();
    const fadeAttr = new THREE.InstancedBufferAttribute(
      new Float32Array(Math.max(1, CARS.length)),
      1
    );
    fadeAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aFade", fadeAttr);
    return { geometry, fadeAttr };
  }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;
    m.uniforms.uOpacity.value = LIVE.trafficIntensity;
    m.uniforms.uLampIntensity.value = LIVE.windowIntensity;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
    // How many carts are out right now, by the real Seattle hour. Each car has
    // its own threshold, so the fleet thins smoothly toward a lone cart at 3am.
    const pressure = trafficIntensity();
    for (let i = 0; i < CARS.length; i++) {
      const car = CARS[i];
      const { x, z, yaw, fade } = carPoseAt(car, CLOCK.t);
      // Present when the hour's pressure clears this car's threshold; the soft
      // window keeps a cart from blinking as the slow-moving pressure crosses.
      const present = smoothstep(car.threshold - 0.06, car.threshold + 0.06, pressure);
      quaternion.setFromAxisAngle(UP, yaw);
      matrix.compose(position.set(x, CONFIG.car.y, z), quaternion, scale.setScalar(CONFIG.car.toyLenKm));
      mesh.setMatrixAt(i, matrix);
      fadeAttr.setX(i, fade * present);
    }
    mesh.instanceMatrix.needsUpdate = true;
    fadeAttr.needsUpdate = true;
  });

  if (!CARS.length) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, CARS.length]}
      geometry={geometry}
      renderOrder={5.6}
      frustumCulled={false}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          // Body: the label ink (sumi-brown day / warm cream night), so a lone
          // cart reads on the bright washi the way the riders and labels do.
          uColor: { value: LIVE.label },
          // Headlamps: the warm traffic color, lit by the shared window intensity.
          uLamp: { value: LIVE.traffic },
          uLampIntensity: { value: LIVE.windowIntensity },
          uOpacity: { value: LIVE.trafficIntensity },
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
