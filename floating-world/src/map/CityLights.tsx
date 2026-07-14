// The city's small lights: the Space Needle's red aircraft beacon breathing
// at the top of the spire, the shore lighthouses flashing over the Sound
// (West Point, Alki Point, Mukilteo — each on its own period), and the two
// SODO stadium bowls that come up warm on real game nights
// (map/stadiumNights.ts — Mariners, Sounders, Seahawks home dates baked from
// the real schedules). Ambient truth, ferry-style: deterministic from the
// wall clock, never presented as live telemetry.
//
// ONE InstancedMesh of view-facing painted-glow quads (one draw call),
// additive like the train sprites. The beacon's core deliberately crosses
// the 1.05 bloom line at the top of its night pulse — one tiny HDR ember on
// the skyline; the stadium lights stay well under it — a warm floodlit-bowl
// wash under a cooler signature-coloured crown on each roof arch (Lumen's
// blue-white, T-Mobile's magenta), a spill on the ridge, not a flare. By day
// both fade to almost nothing:
// beacons and floodlights don't read against the sun, so the map doesn't
// pretend they do.
//
// ?gamenight pins both stadiums lit, for demos and smoke tests.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { projectLatLng } from "./network";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { sunPhase } from "../world/sun";
import { useUi } from "../trains/store";
import { stadiumGlow, stadiumTitle, StadiumVenue } from "./stadiumNights";

const VERT = /* glsl */ `
  attribute vec3 aColor;
  attribute float aGlow;
  attribute float aScale;
  varying vec3 vColor;
  varying vec2 vUv;
  varying float vGlow;
  void main() {
    vColor = aColor;
    vGlow = aGlow;
    vUv = uv;
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    mv.xy += (uv - 0.5) * aScale;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  varying vec2 vUv;
  varying float vGlow;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r2 = dot(p, p);
    // Same painted-glow recipe as the trains: hot core, soft halo, edge
    // falloff so the quad silhouette never reads.
    float edge = 1.0 - smoothstep(0.45, 0.85, sqrt(r2));
    float core = exp(-r2 * 14.0);
    float halo = exp(-r2 * 4.0) * 0.4 * edge;
    float a = clamp(core + halo, 0.0, 1.0) * step(0.002, vGlow);
    gl_FragColor = vec4(vColor * (core + halo) * vGlow, a);
  }
`;

interface Light {
  lat: number;
  lng: number;
  y: number;
  scaleKm: number;
  color: THREE.Color;
  venue?: StadiumVenue; // stadium domes
  lighthouse?: { periodS: number; phase: number }; // shore beacons on the Sound
  label?: string;
  // no venue and no lighthouse ⇒ the Needle's red aircraft beacon
  dx?: number; // world-unit offset from the projected lat/lng (post-projection)
  dz?: number;
  ferrisWheel?: boolean; // the Great Wheel's rim lights, cycling color at night
}

// The Great Wheel on Pier 57 (matches the torus built in Landmarks.tsx: hub
// at y ≈ 0.15, rim radius 0.11). A ring of rim lights, all breathing the
// SAME colour together — the real wheel's night signature — cycling through
// a jewel-toned palette. Each colour holds for a while, then eases into the
// next over a few seconds, so the change never jump-cuts.
const WHEEL_LAT = 47.6061;
const WHEEL_LNG = -122.3426;
const WHEEL_HUB_Y = 0.15;
const WHEEL_R = 0.11;
const WHEEL_RIM_LIGHTS = 8;
const WHEEL_PALETTE = [
  new THREE.Color("#ff5c48"), // vermilion
  new THREE.Color("#ffb347"), // amber gold
  new THREE.Color("#7ee0a8"), // jade
  new THREE.Color("#5ec8ff"), // sky teal
  new THREE.Color("#8f7bff"), // violet
  new THREE.Color("#ff6fae"), // rose
];
const WHEEL_HOLD_S = 6; // how long each colour holds before easing onward
const WHEEL_FADE_S = 4; // how long the crossfade to the next colour takes

function wheelColor(t: number, out: THREE.Color) {
  const period = WHEEL_HOLD_S + WHEEL_FADE_S;
  const total = WHEEL_PALETTE.length * period;
  const tt = ((t % total) + total) % total;
  const idx = Math.floor(tt / period);
  const local = tt - idx * period;
  const a = WHEEL_PALETTE[idx];
  const b = WHEEL_PALETTE[(idx + 1) % WHEEL_PALETTE.length];
  if (local < WHEEL_HOLD_S) {
    out.copy(a);
  } else {
    const f = (local - WHEEL_HOLD_S) / WHEEL_FADE_S;
    const s = f * f * (3 - 2 * f); // smoothstep: an eased, seamless crossfade
    out.copy(a).lerp(b, s);
  }
}

export const LIGHTS: Light[] = [
  // The beacon rides just above the spire tip (Landmarks.tsx builds the
  // Needle to y ≈ 1.07 at this toy scale).
  { lat: 47.6205, lng: -122.3493, y: 1.09, scaleKm: 0.16, color: new THREE.Color("#ff5c48") },
  // Shore lighthouses guarding the Sound — West Point off Discovery Park,
  // Alki Point at the mouth of Elliott Bay, and Mukilteo far to the north.
  // Each keeps its own flash character (period + phase), a warm-white ember
  // that just kisses the bloom line at the top of its flash — the working
  // waterfront's night-lights, deterministic from the clock like the beacon.
  {
    lat: 47.662,
    lng: -122.4356,
    y: 0.06,
    scaleKm: 0.13,
    color: new THREE.Color("#ffe6c0"),
    lighthouse: { periodS: 10, phase: 0 },
    label: "West Point Light",
  },
  {
    lat: 47.5763,
    lng: -122.4206,
    y: 0.06,
    scaleKm: 0.13,
    color: new THREE.Color("#ffe6c0"),
    lighthouse: { periodS: 7.5, phase: 2.1 },
    label: "Alki Point Light",
  },
  {
    lat: 47.9497,
    lng: -122.3045,
    y: 0.06,
    scaleKm: 0.13,
    color: new THREE.Color("#ffe6c0"),
    lighthouse: { periodS: 5, phase: 4.0 },
    label: "Mukilteo Light",
  },
  // Each stadium comes up in two registers, matched to how it really lights:
  // a broad warm floodlit-concourse spill washing the bowl, and a tighter,
  // higher accent tracing its signature roof arch in its own colour — Lumen
  // Field's cool blue-white canopies, T-Mobile Park's T-Mobile-magenta arch.
  // The two bowls sit ~400 m apart, so their spills overlap and add — sized so
  // a double game night still reads warm, not white; the crowns stay well
  // under the bloom line, a coloured wash on the ridge, never a flare.
  {
    lat: 47.5952,
    lng: -122.3316,
    y: 0.26,
    scaleKm: 0.95,
    color: new THREE.Color("#ffc985"),
    venue: "lumen",
    label: "Lumen Field",
  },
  {
    lat: 47.5952,
    lng: -122.3316,
    y: 0.35,
    scaleKm: 0.5,
    color: new THREE.Color("#a9c4ff"), // Seahawks/Sounders blue-white canopy light
    venue: "lumen",
    label: "Lumen Field",
  },
  {
    lat: 47.5914,
    lng: -122.3325,
    y: 0.22,
    scaleKm: 0.95,
    color: new THREE.Color("#ffc985"),
    venue: "tmobile",
    label: "T-Mobile Park",
  },
  {
    lat: 47.5914,
    lng: -122.3325,
    y: 0.33,
    scaleKm: 0.55,
    color: new THREE.Color("#e5219b"), // the arch's signature T-Mobile magenta
    venue: "tmobile",
    label: "T-Mobile Park",
  },
  // The Great Wheel's rim lights — a ring around the hub, all cycling the
  // same colour together, a night creature like the beacon and lighthouses.
  ...Array.from({ length: WHEEL_RIM_LIGHTS }, (_, i) => {
    const a = (i / WHEEL_RIM_LIGHTS) * Math.PI * 2;
    return {
      lat: WHEEL_LAT,
      lng: WHEEL_LNG,
      y: WHEEL_HUB_Y + Math.sin(a) * WHEEL_R,
      dx: Math.cos(a) * WHEEL_R,
      dz: 0,
      scaleKm: 0.045,
      color: WHEEL_PALETTE[0].clone(),
      ferrisWheel: true,
      label: "Seattle Great Wheel",
    } as Light;
  }),
];

const FORCE_GAMENIGHT =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("gamenight");

// The live glow each light is putting out this frame, mirrored for
// map/Reflections.tsx so a beacon's ember and a lit bowl pour onto the nearest
// water at exactly their own strength — read straight from here, never a second
// copy of the pulse and the schedule.
export const CITY_LIGHT_GLOW: number[] = LIGHTS.map(() => 0);

const BEACON_PERIOD_S = 2.8;
const GLOW_POLL_S = 5; // wall-clock schedule checks — not a per-frame cost

export function CityLights() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const { colorAttr, glowAttr, scaleAttr } = useMemo(() => {
    const n = LIGHTS.length;
    const colorAttr = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    colorAttr.setUsage(THREE.DynamicDrawUsage);
    const glowAttr = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    glowAttr.setUsage(THREE.DynamicDrawUsage);
    const scaleAttr = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    LIGHTS.forEach((l, i) => {
      colorAttr.setXYZ(i, l.color.r, l.color.g, l.color.b);
      scaleAttr.setX(i, l.scaleKm);
    });
    return { colorAttr, glowAttr, scaleAttr };
  }, []);

  // Static positions — written once into the instance matrices.
  const placed = useRef(false);
  const lastPollT = useRef(-Infinity);
  const gameGlow = useRef<Record<StadiumVenue, number>>({ lumen: 0, tmobile: 0 });
  const captioned = useRef<Set<StadiumVenue>>(new Set());
  const wheelColorScratch = useRef(new THREE.Color()).current;

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (!placed.current) {
      placed.current = true;
      const matrix = new THREE.Matrix4();
      LIGHTS.forEach((l, i) => {
        const { x, z } = projectLatLng(l.lat, l.lng);
        matrix.makeTranslation(x + (l.dx ?? 0), l.y, z + (l.dz ?? 0));
        mesh.setMatrixAt(i, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }

    // The schedule moves at wall-clock pace; checking every few seconds is
    // plenty (the envelope's edges are twenty minutes long).
    if (CLOCK.t - lastPollT.current > GLOW_POLL_S) {
      lastPollT.current = CLOCK.t;
      const now = Date.now();
      for (const venue of ["lumen", "tmobile"] as const) {
        gameGlow.current[venue] = FORCE_GAMENIGHT ? 1 : stadiumGlow(venue, now);
      }
      // One quiet caption per venue per visit, as the lights come up.
      for (const l of LIGHTS) {
        if (!l.venue || captioned.current.has(l.venue)) continue;
        if (gameGlow.current[l.venue] < 0.5) continue;
        captioned.current.add(l.venue);
        const title = FORCE_GAMENIGHT ? null : stadiumTitle(l.venue, now);
        useUi
          .getState()
          .setCaption(
            title ? `game night at ${l.label} — ${title}` : `game night — lights on at ${l.label}`
          );
      }
    }

    // Both lights are night creatures: they barely read against daylight.
    const night = 1 - sunPhase() * 0.92;
    let colorChanged = false;
    for (let i = 0; i < LIGHTS.length; i++) {
      const l = LIGHTS[i];
      if (l.ferrisWheel) {
        // The rim lights breathe together, steady rather than blinking, and
        // slide smoothly from one colour to the next (wheelColor handles the
        // hold + crossfade so the change is always seamless).
        wheelColor(CLOCK.t, wheelColorScratch);
        colorAttr.setXYZ(i, wheelColorScratch.r, wheelColorScratch.g, wheelColorScratch.b);
        colorChanged = true;
        const glow = night * 0.85 * (0.9 + 0.1 * CLOCK.breath);
        glowAttr.setX(i, glow);
        CITY_LIGHT_GLOW[i] = glow;
      } else if (l.venue) {
        // Warm light-spill over the bowl, swelling gently on the breath.
        // Peaks ~0.35 (×2 where the domes overlap) — a wash, never a bloom
        // source.
        const g = gameGlow.current[l.venue];
        const glow = g * night * 0.35 * (0.92 + 0.08 * CLOCK.breath);
        glowAttr.setX(i, glow);
        CITY_LIGHT_GLOW[i] = glow;
      } else if (l.lighthouse) {
        // A flashing shore beacon: mostly dark with a brief warm flash on its
        // own period, so the three lights wink out of step. Flash peak ~1.05
        // just grazes the bloom line — a soft ember on the water, softer than
        // the Needle. Night creature like the rest.
        const { periodS, phase } = l.lighthouse;
        const s = 0.5 + 0.5 * Math.sin((CLOCK.t * Math.PI * 2) / periodS + phase);
        const glow = Math.pow(s, 5) * night * 1.05;
        glowAttr.setX(i, glow);
        CITY_LIGHT_GLOW[i] = glow;
      } else {
        // The beacon: a slow red blink, sharpened so it winks rather than
        // throbs. Night peak ~1.6 — the one deliberate HDR ember up there.
        const s = 0.5 + 0.5 * Math.sin((CLOCK.t * Math.PI * 2) / BEACON_PERIOD_S);
        const glow = Math.pow(s, 3) * night * 1.6;
        glowAttr.setX(i, glow);
        CITY_LIGHT_GLOW[i] = glow;
      }
    }
    glowAttr.needsUpdate = true;
    if (colorChanged) colorAttr.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, LIGHTS.length]}
      renderOrder={10}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]}>
        <primitive object={colorAttr} attach="attributes-aColor" />
        <primitive object={glowAttr} attach="attributes-aGlow" />
        <primitive object={scaleAttr} attach="attributes-aScale" />
      </planeGeometry>
      <shaderMaterial
        vertexShader={VERT}
        fragmentShader={FRAG}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}
