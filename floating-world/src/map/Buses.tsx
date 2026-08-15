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
// The coach is modeled and painted from reference photos of the real fleet
// (owner's photos, Jul 2026 — not invented), at the airliners'/trains'
// specificity tier. Geometry is the New Flyer Xcelsior silhouette every
// photo shows: raked windshield, inset roof cap under the battery/HVAC pod
// run, wheels seated below the skirt, the bike rack folded up on the nose —
// and BOTH real lengths in one InstancedMesh: per-vertex aTail marks the
// trailer + gray accordion bellows, per-instance aArtic keeps or collapses
// them, so 40-foot standards and 60-foot artics (coaches 4808 and 1250 are
// both artics) share one draw call the way the airliners' Delta/Alaska split
// shares one atlas. RapidRide coaches are ALWAYS artics (true of the real
// fleet); otherwise length is a salted per-vehicle hash.
//
// One fragment shader paints the livery, aLivery selecting the coat:
//   0  the standard coach: Metro's deep green over the gold skirt, the black
//      belt line between (photo: coach 4808, the classic two-tone)
//   1  the battery-electric fleet's royal blue over the same gold skirt
//      (photo: coach 1250, "zero emission bus")
//   2  RapidRide red over gold (photo: coach 6222 on the E Line)
// RapidRide red is DATA on the live fleet (the feed's rr flag, keyed off the
// OBA route list); green-vs-blue is a deterministic per-vehicle hash — an
// honest nod to the mixed fleet, never a claim about a specific coach.
// Over the coat go the details the photos insist on: the dark dashed window
// run broken by GOLD-FRAMED DOORWAYS on the curb side (front, mid, and the
// artic's third door), the amber LED headsign over the black windshield mask
// and gold bumper, small amber route signs at the flanks' front corners, the
// red accent flick sweeping the tail corner of the green and blue coats,
// tires with pale hubs, and the louvered engine grille + stacked red tail
// lamps on the rear face. Pigment stays ON THE ROOF (true to the photos, and
// the reason the fleet reads from the drift camera), windows lit
// lantern-warm after dark by MIX (never bloom; the headsign LEDs stay lit
// day and night, clamped under the bloom ceiling). Normal-blended, mixed
// toward LIVE.fog. renderOrder 5.62.
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
import { ARTIC_SHARE, capByHeart, stepGlide } from "../world/metroBuses";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aFade;
  attribute float aLivery; // 0 Metro green, 1 battery-electric blue, 2 RapidRide red
  attribute float aArtic; // per-instance: 1 = 60-foot articulated coach
  attribute float aPart; // per-vertex: 0 body, 1 bellows, 2 tire, 3 roof pod, 4 bike rack
  attribute float aTail; // per-vertex: 1 = trailer geometry (artic-only)
  varying vec3 vLocal;
  varying float vFade;
  varying float vLivery;
  varying float vArtic;
  varying float vPart;
  void main() {
    // A standard 40-footer collapses the trailer + bellows to a zero-area
    // point at the origin, so one geometry serves both real coach lengths.
    vec3 p = (aTail > 0.5 && aArtic < 0.5) ? vec3(0.0) : position;
    vLocal = p;
    vFade = aFade;
    vLivery = aLivery;
    vArtic = aArtic;
    vPart = aPart;
    vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
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
  varying float vArtic;
  varying float vPart;
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

  // A doorway's two dark leaves inside its gold frame (u spans the doorway).
  float doorLeaves(float u) {
    float pane = step(0.12, u) * (1.0 - step(0.88, u));
    float mullion = 1.0 - step(0.07, abs(u - 0.5));
    return pane * (1.0 - mullion);
  }

  // x within [lo, hi] -> (in-doorway, leaves) masks.
  vec2 doorway(float x, float lo, float hi) {
    float u = (x - lo) / (hi - lo);
    float inD = step(0.0, u) * (1.0 - step(1.0, u));
    return vec2(inD, inD * doorLeaves(u));
  }

  void main() {
    if (vFade < 0.01) discard;
    // vLocal: x in [-0.5,0.5] (a 40-footer; the artic trailer reaches -1.0),
    // y in [0,~0.36] (ground to roof pod), z in [-0.16,0.16] (width).
    float x = vLocal.x;
    float y = vLocal.y;
    float z = vLocal.z;
    float wash = wcFbm(vWorld * 2.2 + y * 4.0);

    // The coat: identity pigment over the shared gold skirt with the black
    // belt line between. Pigment stays on the roof (as on the real coaches)
    // so the fleet reads from the drift camera.
    vec3 coat = mix(uGreen, uBlue, step(0.5, vLivery));
    coat = mix(coat, uRed, step(1.5, vLivery));
    // Where this coach ends: the 40-footer's own tail or the trailer's.
    float rearX = mix(0.48, 1.0, step(0.5, vArtic));
    // The amber LED of the headsigns — lit day and night, never bloom.
    vec3 amber = min(vec3(0.90, 0.55, 0.16) * (0.72 + 0.30 * uWindowIntensity), vec3(0.95));

    vec3 c;
    if (vPart > 3.5) {
      // The bike rack folded up on the nose — bare aluminum slats.
      c = vec3(0.62, 0.60, 0.54) * (0.72 + 0.28 * step(0.5, fract(z * 26.0)));
    } else if (vPart > 2.5) {
      // The roof battery/HVAC pod run — coat-tinted equipment gray.
      c = coat * 0.62 + vec3(0.07);
    } else if (vPart > 1.5) {
      // Tires: near-black rubber, a pale hub disc on each outer face.
      c = uInk * 0.55;
      float dxAxle = min(abs(x - 0.28), min(abs(x + 0.27), abs(x + 0.86)));
      float hub = (1.0 - smoothstep(0.022, 0.030, length(vec2(dxAxle, y - 0.055))))
        * step(0.152, abs(z));
      c = mix(c, vec3(0.60, 0.58, 0.52), hub);
    } else if (vPart > 0.5) {
      // The artic's gray accordion bellows — vertical pleats, seated in ink.
      c = vec3(0.56, 0.54, 0.49) * (0.76 + 0.24 * step(0.5, fract(x * 46.0)));
      c = mix(c, uInk, 0.4 * (1.0 - smoothstep(0.05, 0.10, y)));
    } else {
      // --- the painted body, straight from the photos ---------------------
      c = coat;
      float belt = 1.0 - smoothstep(0.118, 0.136, y); // the black belt line
      c = mix(c, uInk, belt * 0.85);
      float skirt = 1.0 - smoothstep(0.100, 0.116, y); // gold below it
      c = mix(c, uGold, skirt);

      // The window run, a dark band up in the coat — dashed panes, dark
      // glass by day, lantern-gold after dark via the shared window palette.
      float band = smoothstep(0.165, 0.185, y) * (1.0 - smoothstep(0.252, 0.268, y));
      float dash = step(0.3, wcHash(vec2(floor(x * 22.0), 3.7)));
      c = mix(c, uInk * 0.85, band * 0.8);
      c = mix(c, uWindow * (0.18 + uWindowIntensity), band * dash * 0.85);

      // The gold-framed doorways breaking the run on the CURB side (+z):
      // front and mid doors, plus the trailer's third door on artics.
      float curb = step(0.148, z);
      float doorV = smoothstep(0.050, 0.062, y) * (1.0 - smoothstep(0.258, 0.270, y));
      vec2 d1 = doorway(x, 0.29, 0.40);
      vec2 d2 = doorway(x, -0.03, 0.10);
      vec2 d3 = doorway(x, -0.75, -0.63);
      float frame = max(d1.x, max(d2.x, d3.x));
      float leaves = max(d1.y, max(d2.y, d3.y));
      float doorM = curb * doorV;
      c = mix(c, uGold, doorM * frame);
      c = mix(c, uInk * 0.80, doorM * leaves);
      c = mix(c, uWindow * (0.12 + uWindowIntensity), doorM * leaves * 0.40);

      // The small amber route sign at each flank's front corner.
      float sideSign = step(0.148, abs(z))
        * smoothstep(0.402, 0.410, x) * (1.0 - step(0.452, x))
        * smoothstep(0.228, 0.236, y) * (1.0 - smoothstep(0.256, 0.262, y));
      c = mix(c, amber, sideSign);

      // The red accent flick sweeping up the tail corner of the green and
      // blue coats (the RapidRide coat is already red — no flick).
      float dxr = x + rearX; // 0 at this coach's tail, growing forward
      float flick = (1.0 - smoothstep(0.02, 0.16, dxr + max(0.0, y - 0.05) * 1.1))
        * (1.0 - step(1.5, vLivery));
      c = mix(c, uRed, flick * 0.92);

      // The FRONT face (raked in the geometry): black windshield mask over
      // the gold bumper, amber headsign under the roofline, headlamps low.
      float front = smoothstep(0.468, 0.478, x + 0.208 * (y - 0.04));
      vec3 cf = mix(uGold, uInk * 0.92, smoothstep(0.070, 0.085, y));
      cf = mix(cf, uInk * 0.70,
        smoothstep(0.130, 0.150, y) * (1.0 - smoothstep(0.220, 0.235, y)));
      float headsign = smoothstep(0.235, 0.243, y) * (1.0 - smoothstep(0.268, 0.276, y))
        * (1.0 - step(0.10, abs(z)));
      cf = mix(cf, amber, headsign);
      float lampBox = smoothstep(0.085, 0.095, y) * (1.0 - smoothstep(0.125, 0.135, y))
        * smoothstep(0.050, 0.060, abs(z)) * (1.0 - smoothstep(0.115, 0.125, abs(z)));
      cf = mix(cf, uLamp * (0.40 + uLampIntensity), lampBox);
      c = mix(c, cf, front);

      // The TAIL face: louvered engine grille in the coat, gold band low,
      // stacked round tail lamps at the corners (photo: coach 4808's rear).
      float tail = smoothstep(rearX - 0.035, rearX - 0.015, -x);
      vec3 ct = coat;
      float grille = smoothstep(0.125, 0.140, y) * (1.0 - smoothstep(0.200, 0.215, y));
      ct = mix(ct, uInk * (0.75 + 0.25 * step(0.5, fract(y * 60.0))), grille);
      ct = mix(ct, uGold, 1.0 - smoothstep(0.100, 0.120, y));
      float stack = smoothstep(0.070, 0.080, abs(z)) * (1.0 - smoothstep(0.115, 0.125, abs(z)))
        * smoothstep(0.130, 0.140, y) * (1.0 - smoothstep(0.240, 0.250, y))
        * step(0.55, fract(y * 22.0));
      vec3 tailRed = min(vec3(0.82, 0.16, 0.10) * (0.55 + 0.60 * uLampIntensity), vec3(0.95));
      ct = mix(ct, tailRed, stack);
      c = mix(c, ct, tail);

      // The sumi keyline seating the body over its wheels.
      c = mix(c, uInk, 0.6 * (1.0 - smoothstep(0.042, 0.060, y)));
    }

    // Roof catches a touch more light than the flanks — tonal volume.
    c *= (0.86 + 0.28 * wash) * mix(0.92, 1.06, smoothstep(0.0, 0.3, y));

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
  artic: number; // 1 = 60-foot articulated (all RapidRide, plus a hashed share)
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
    const livery = liveryRoll < 0.13 ? 2 : liveryRoll < 0.3 ? 1 : 0;
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
      livery,
      // RapidRide really runs all 60-footers; the rest split by the same
      // share the live fleet hashes to.
      artic: livery === 2 || hash(i * 13.57 + 8.8) < ARTIC_SHARE ? 1 : 0,
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

// Per-vertex part tags for the fragment shader (aPart) and the artic
// collapse (aTail) — mergeGeometries needs every part to carry both.
const PART_BODY = 0;
const PART_BELLOWS = 1;
const PART_TIRE = 2;
const PART_POD = 3;
const PART_RACK = 4;

function tag(geo: THREE.BufferGeometry, part: number, trailer: number): THREE.BufferGeometry {
  const n = geo.getAttribute("position").count;
  geo.setAttribute("aPart", new THREE.BufferAttribute(new Float32Array(n).fill(part), 1));
  geo.setAttribute("aTail", new THREE.BufferAttribute(new Float32Array(n).fill(trailer), 1));
  return geo;
}

/** A wheel-axle cylinder lying across z, faces poking past both flanks. */
function wheel(x: number, trailer: number): THREE.BufferGeometry {
  const w = new THREE.CylinderGeometry(0.055, 0.055, 0.32, 10);
  w.rotateX(Math.PI / 2);
  w.translate(x, 0.055, 0);
  return tag(w, PART_TIRE, trailer);
}

/** The New Flyer Xcelsior coach along +X, wheels at y = 0, modeled from the
 *  reference photos: raked windshield, inset roof cap under the battery/HVAC
 *  pod run, wheels seated below the skirt, the bike rack folded up on the
 *  nose — plus the artic's gray bellows and trailer (tagged aTail so a
 *  standard 40-footer collapses them in the vertex shader). The paint
 *  carries the identity; the silhouette now earns it. */
function buildBus(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Front (and, for standards, only) body: raked windshield — the top of the
  // +X face pulls back and pinches in, the Xcelsior's sloped nose.
  const body = new THREE.BoxGeometry(0.96, 0.24, 0.3, 3, 1, 1);
  body.translate(0, 0.16, 0);
  const pos = body.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getX(i) > 0.47) {
      const y = pos.getY(i);
      pos.setX(i, 0.48 - 0.208 * (y - 0.04));
      pos.setZ(i, pos.getZ(i) * 0.9);
    }
  }
  parts.push(tag(body, PART_BODY, 0));

  const roof = new THREE.BoxGeometry(0.88, 0.03, 0.26);
  roof.translate(0, 0.295, 0);
  parts.push(tag(roof, PART_BODY, 0));

  // The roof equipment pod run (battery packs / HVAC — every photo shows it).
  const pod = new THREE.BoxGeometry(0.5, 0.045, 0.17);
  pod.translate(-0.06, 0.3325, 0);
  parts.push(tag(pod, PART_POD, 0));

  parts.push(wheel(0.28, 0));
  parts.push(wheel(-0.27, 0));

  // The bike rack folded up against the nose.
  const rack = new THREE.BoxGeometry(0.05, 0.07, 0.18);
  rack.translate(0.5, 0.075, 0);
  parts.push(tag(rack, PART_RACK, 0));

  // --- the artic's rear half, collapsed on standard coaches ---------------
  const bellows = new THREE.BoxGeometry(0.13, 0.235, 0.27);
  bellows.translate(-0.54, 0.1625, 0);
  parts.push(tag(bellows, PART_BELLOWS, 1));

  const trailer = new THREE.BoxGeometry(0.4, 0.24, 0.3);
  trailer.translate(-0.8, 0.16, 0);
  parts.push(tag(trailer, PART_BODY, 1));

  const trailerRoof = new THREE.BoxGeometry(0.34, 0.03, 0.26);
  trailerRoof.translate(-0.8, 0.295, 0);
  parts.push(tag(trailerRoof, PART_BODY, 1));

  const trailerPod = new THREE.BoxGeometry(0.24, 0.045, 0.17);
  trailerPod.translate(-0.8, 0.3325, 0);
  parts.push(tag(trailerPod, PART_POD, 1));

  parts.push(wheel(-0.86, 1));

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

  const { geometry, fadeAttr, liveryAttr, articAttr } = useMemo(() => {
    const geometry = buildBus();
    const fadeAttr = new THREE.InstancedBufferAttribute(new Float32Array(poolSize), 1);
    fadeAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aFade", fadeAttr);
    // Livery and length are per-slot and rewritten as coaches come and go on
    // the live feed (the ambient fleet's assignment is static, but shares
    // the buffers).
    const liveryAttr = new THREE.InstancedBufferAttribute(new Float32Array(poolSize), 1);
    liveryAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aLivery", liveryAttr);
    const articAttr = new THREE.InstancedBufferAttribute(new Float32Array(poolSize), 1);
    articAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aArtic", articAttr);
    return { geometry, fadeAttr, liveryAttr, articAttr };
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
        articAttr.setX(written, bus.artic);
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
        articAttr.setX(written, bus.artic);
        written++;
      }
    }

    mesh.count = written;
    if (written > 0) {
      mesh.instanceMatrix.needsUpdate = true;
      fadeAttr.needsUpdate = true;
      liveryAttr.needsUpdate = true;
      articAttr.needsUpdate = true;
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
