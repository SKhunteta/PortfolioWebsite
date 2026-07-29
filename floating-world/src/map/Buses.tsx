// The bus fleet: King County Metro coaches on the real streets — and, when
// the feed is up, the REAL ones: live GTFS-RT vehicle positions for the whole
// in-service fleet (world/busFeed.ts polls /api/metro/vehicles on the trains'
// cadence), each coach gliding between its actual fixes. The buses graduate
// from the ambient tier to the trains' honesty tier: live means live. When
// the feed is unavailable (keyless dev, outage), the layer falls back to the
// original deterministic ambient fleet — corridor loops, stop-and-go dwells,
// Metro's service span by the real Seattle hour (world/buses.ts) — clearly
// stylized toys, never presented as live.
//
// Liveries are painted from reference photos of the real fleet (owner's
// photos, Jul 2026 — not invented), one fragment shader, aLivery selecting:
//   0  the standard coach: Metro's deep green over the gold skirt, the black
//      belt line between, dark window band up in the green (photo: coach
//      4808, the classic two-tone every Seattleite knows)
//   1  the battery-electric fleet's royal blue over the same gold skirt
//      (photo: coach 1250, "zero emission bus")
//   2  RapidRide red over gold (photo: coach 6222 on the E Line)
// RapidRide red is DATA on the live fleet (the feed's rr flag, keyed off the
// OBA route list); green-vs-blue is a deterministic per-vehicle hash — an
// honest nod to the mixed fleet, never a claim about a specific coach. All
// three coats keep their pigment ON THE ROOF (true to the photos, and the
// reason the fleet reads from the drift camera), gold skirt low, sumi
// keyline at the wheels and ends, windows lit lantern-warm after dark by MIX
// (never bloom). Normal-blended, mixed toward LIVE.fog. renderOrder 5.62.
//
// ONE InstancedMesh either way — the pool is sized for the tier's live cap
// (up to ~1,200 real coaches at rush hour; capByHeart sheds the far suburban
// tail first on small tiers) and mesh.count trims per frame. Matrices, fade
// and livery are written imperatively — the hot path never touches React.

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
import { BUS_FEED, BUS_PIN, LIVE_BUSES, type LiveBus } from "../world/busFeed";
import { capByHeart, stepGlide } from "../world/metroBuses";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aFade;
  attribute float aLivery; // 0 Metro green, 1 battery-electric blue, 2 RapidRide red
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
  uniform vec3 uGreen;   // the standard coach's deep Metro green
  uniform vec3 uBlue;    // the battery-electric fleet's royal blue
  uniform vec3 uRed;     // RapidRide red
  uniform vec3 uGold;    // the gold skirt all three liveries share
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

    // The coat, straight from the photos: identity pigment over the shared
    // gold skirt with the black belt line between. Pigment stays on the roof
    // (as on the real coaches) so the fleet reads from the drift camera.
    vec3 coat = mix(uGreen, uBlue, step(0.5, vLivery));
    coat = mix(coat, uRed, step(1.5, vLivery));
    vec3 c = coat;
    float belt = 1.0 - smoothstep(0.1, 0.118, vLocal.y); // the black belt line
    c = mix(c, uInk, belt * 0.85);
    float skirt = 1.0 - smoothstep(0.082, 0.098, vLocal.y); // gold below it
    c = mix(c, uGold, skirt);

    // The window run, a dark band up in the coat — dashed panes, dark glass
    // by day, lantern-gold after dark via the shared window palette.
    float band = smoothstep(0.17, 0.19, vLocal.y) * (1.0 - smoothstep(0.245, 0.262, vLocal.y));
    float dash = step(0.3, wcHash(vec2(floor(vLocal.x * 22.0), 3.7)));
    c = mix(c, uInk * 0.85, band * 0.8);
    c = mix(c, uWindow * (0.18 + uWindowIntensity), band * dash * 0.85);

    // Roof catches a touch more light than the flanks — tonal volume.
    c *= (0.86 + 0.28 * wash) * mix(0.92, 1.06, smoothstep(0.0, 0.3, vLocal.y));

    // The sumi keyline — ink pops on bright paper: a dark seat at the wheels
    // and inked nose/tail ends.
    float ink = max(1.0 - smoothstep(0.0, 0.03, vLocal.y), smoothstep(0.45, 0.48, abs(vLocal.x)));
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

// --- ambient corridors (the fallback fleet) ---------------------------------
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
  livery: number; // LIVERY_* — the ambient fleet mixes all three coats
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
    const liveryRoll = hash(i * 11.29 + 6.2);
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
      // Mostly green, a share of battery-electric blue, a few RapidRide red —
      // the mix the real street shows.
      livery: liveryRoll < 0.13 ? 2 : liveryRoll < 0.3 ? 1 : 0,
      threshold: hash(i * 9.19 + 4.1) * 0.92,
    });
  }
  return buses;
}

const AMBIENT = buildFleet();

interface BusPose {
  x: number;
  z: number;
  yaw: number;
  fade: number; // 0..1 ease at the corridor ends
  moving: number; // 0 dwelling at a stop .. 1 under way
}

const pose: BusPose = { x: 0, z: 0, yaw: 0, fade: 0, moving: 0 };

/** Where an ambient bus is at clock time t: the stop-and-go arc distance from
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

// Fixed livery pigments, sampled from the reference photos — then SATURATED
// past photo-literal to survive the print's pale overlay washes (kasumi,
// paper tint): a first, muted cut rendered as sage mush; the compositing
// stack costs roughly a third of the chroma, so the pigment carries a third
// extra. Every channel stays under the bright-paper bloom ceiling.
const METRO_GREEN = new THREE.Color("#1f8a50"); // coach 4808's deep green
const BEB_BLUE = new THREE.Color("#3d55c0"); // coach 1250's royal blue
const RAPID_RED = new THREE.Color("#c53a2c"); // coach 6222's RapidRide red
const SKIRT_GOLD = new THREE.Color("#eda427"); // the shared gold skirt

// Whether live data drives the layer this frame (the pin can force either way).
function liveActive(): boolean {
  if (BUS_PIN.kind === "live") return true;
  if (BUS_PIN.kind === "off" || BUS_PIN.kind === "ambient") return false;
  return BUS_FEED.mode === "live";
}

export function Buses() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // The pool serves both modes: the tier's live cap at rush hour dwarfs the
  // ambient count, so size for the max and trim mesh.count per frame.
  const poolSize = Math.max(1, PROFILE.liveBusCap, AMBIENT.length);

  const { geometry, fadeAttr, liveryAttr } = useMemo(() => {
    const geometry = buildBus();
    const fadeAttr = new THREE.InstancedBufferAttribute(new Float32Array(poolSize), 1);
    fadeAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aFade", fadeAttr);
    // Livery is per-slot and rewritten as coaches come and go on the live
    // feed (the ambient fleet's assignment is static, but shares the buffer).
    const liveryAttr = new THREE.InstancedBufferAttribute(new Float32Array(poolSize), 1);
    liveryAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aLivery", liveryAttr);
    return { geometry, fadeAttr, liveryAttr };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Over-cap live fleets recompute their kept set only when the size changes
  // (poll granularity), not per frame.
  const keptRef = useRef<{ size: number; list: LiveBus[] }>({ size: -1, list: [] });

  useFrame(() => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;
    // The vessels' opacity, not the carts': the coaches are solid pigment
    // like the ferries, monorail and T Line — at the traffic wash's alpha the
    // deep green and gold dusted out into the paper.
    m.uniforms.uOpacity.value = LIVE.ferryOpacity;
    m.uniforms.uWindowIntensity.value = LIVE.windowIntensity;
    m.uniforms.uLampIntensity.value = LIVE.windowIntensity;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;

    let written = 0;

    if (liveActive()) {
      // --- the real fleet: glide every coach toward its latest fix ---------
      let list: LiveBus[];
      if (LIVE_BUSES.size <= poolSize) {
        list = [...LIVE_BUSES.values()];
      } else {
        if (keptRef.current.size !== LIVE_BUSES.size) {
          keptRef.current = {
            size: LIVE_BUSES.size,
            list: capByHeart(
              [...LIVE_BUSES.values()],
              poolSize,
              CONFIG.camera.heartX,
              CONFIG.camera.heartZ
            ),
          };
        }
        list = keptRef.current.list;
      }
      const dt = CLOCK.dt;
      for (const bus of list) {
        const next = stepGlide(bus.x, bus.z, bus.targetX, bus.targetZ, dt, CONFIG.bus.live);
        bus.x = next.x;
        bus.z = next.z;
        bus.fade = Math.min(1, bus.fade + dt / CONFIG.bus.live.fadeInS);
        quaternion.setFromAxisAngle(UP, bus.yaw);
        matrix.compose(
          position.set(bus.x, CONFIG.bus.y, bus.z),
          quaternion,
          scale.setScalar(CONFIG.bus.toyLenKm)
        );
        mesh.setMatrixAt(written, matrix);
        fadeAttr.setX(written, bus.fade);
        liveryAttr.setX(written, bus.livery);
        written++;
      }
    } else if (BUS_PIN.kind !== "off") {
      // --- the ambient fallback fleet: corridor loops, honest service span --
      const span =
        BUS_PIN.kind === "ambient" ? BUS_PIN.level : busService();
      for (let i = 0; i < AMBIENT.length; i++) {
        const bus = AMBIENT[i];
        const { x, z, yaw, fade } = busPoseAt(bus, CLOCK.t);
        const present = smoothstep(bus.threshold - 0.06, bus.threshold + 0.06, span);
        quaternion.setFromAxisAngle(UP, yaw);
        matrix.compose(
          position.set(x, CONFIG.bus.y, z),
          quaternion,
          scale.setScalar(CONFIG.bus.toyLenKm)
        );
        mesh.setMatrixAt(written, matrix);
        fadeAttr.setX(written, fade * present);
        liveryAttr.setX(written, bus.livery);
        written++;
      }
    }

    mesh.count = written;
    if (written > 0) {
      mesh.instanceMatrix.needsUpdate = true;
      fadeAttr.needsUpdate = true;
      liveryAttr.needsUpdate = true;
    }
  });

  if (!HAS_BASEMAP || BUS_PIN.kind === "off") return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, poolSize]}
      geometry={geometry}
      renderOrder={5.62}
      frustumCulled={false}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uGreen: { value: METRO_GREEN },
          uBlue: { value: BEB_BLUE },
          uRed: { value: RAPID_RED },
          uGold: { value: SKIRT_GOLD },
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
