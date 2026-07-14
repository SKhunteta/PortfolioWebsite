// The city's small lights: the Space Needle's red aircraft beacon breathing
// at the top of the spire, and the two SODO stadium bowls that come up warm
// on real game nights (map/stadiumNights.ts — Mariners, Sounders, Seahawks
// home dates baked from the real schedules). Ambient truth, ferry-style:
// deterministic from the wall clock, never presented as live telemetry.
//
// ONE InstancedMesh of view-facing painted-glow quads (one draw call),
// additive like the train sprites. The beacon's core deliberately crosses
// the 1.05 bloom line at the top of its night pulse — one tiny HDR ember on
// the skyline; the stadium domes stay well under it, a warm light-spill
// wash over the bowl, not a flare. By day both fade to almost nothing:
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
  venue?: StadiumVenue; // stadium domes; absent = the Needle beacon
  label?: string;
}

export const LIGHTS: Light[] = [
  // The beacon rides just above the spire tip (Landmarks.tsx builds the
  // Needle to y ≈ 1.07 at this toy scale).
  { lat: 47.6205, lng: -122.3493, y: 1.09, scaleKm: 0.16, color: new THREE.Color("#ff5c48") },
  // The two bowls sit ~400 m apart, so their domes overlap and their
  // additive light adds — sized and dimmed so a double game night still
  // reads warm, not white.
  {
    lat: 47.5952,
    lng: -122.3316,
    y: 0.28,
    scaleKm: 0.95,
    color: new THREE.Color("#ffc985"),
    venue: "lumen",
    label: "Lumen Field",
  },
  {
    lat: 47.5914,
    lng: -122.3325,
    y: 0.24,
    scaleKm: 0.95,
    color: new THREE.Color("#ffc985"),
    venue: "tmobile",
    label: "T-Mobile Park",
  },
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

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (!placed.current) {
      placed.current = true;
      const matrix = new THREE.Matrix4();
      LIGHTS.forEach((l, i) => {
        const { x, z } = projectLatLng(l.lat, l.lng);
        matrix.makeTranslation(x, l.y, z);
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
    for (let i = 0; i < LIGHTS.length; i++) {
      const l = LIGHTS[i];
      if (l.venue) {
        // Warm light-spill over the bowl, swelling gently on the breath.
        // Peaks ~0.35 (×2 where the domes overlap) — a wash, never a bloom
        // source.
        const g = gameGlow.current[l.venue];
        const glow = g * night * 0.35 * (0.92 + 0.08 * CLOCK.breath);
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
