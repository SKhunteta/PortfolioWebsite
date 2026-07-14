// Stylized traffic: two opposing lanes of little ink CARTS gliding the road
// ribbons — the honest-safe way to add "cars" to a piece whose whole contract
// is that what moves is true. There is no per-vehicle feed, so these are never
// real positions: each lane is a row of pseudo-random SLOTS, and a slot may or
// may not hold a cart. A held cart keeps its identity (brightness, jitter) as
// its slot scrolls, so it reads as a single toy gliding the street rather than
// a flickering dash — but the slots are hashed, painterly, and clearly not
// countable vehicles. VOLUME keys to the real Seattle hour (world/traffic.ts):
// a busy stream at rush, a lone cart or two at 3am, empty when pinned off —
// the ferry tier of honesty, deterministic and clearly stylized, so it cannot
// be mistaken for a live feed.
//
// Rides the SAME polylines the ink roads use (map/Roads.tsx), major AND
// arterial, all merged into ONE geometry: +1 draw call for the whole city.
// uv.x carries arc-length km (ribbon.ts), so the flow scrolls at a consistent
// ground speed; uv.y crosses the strip 0..1, split at the centerline into the
// two lanes. Normal-blended pigment mixed toward LIVE.fog (the raw-Shader fog
// contract) so it darkens the paper and dissolves into the kasumi — never
// additive, never crossing the bright-paper bloom line. renderOrder 5.5: on
// top of the ink roads (5), beneath the ferries and landmarks (6).

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HAS_BASEMAP, BASEMAP_ROADS } from "./basemap";
import { buildStrip, mergeStrips } from "./ribbon";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { PROFILE } from "../world/device";
import { CONFIG } from "../world/config";
import { trafficIntensity } from "../world/traffic";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vWorld = position.xz;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying vec2 vUv;
  uniform vec3 uTraffic;
  uniform float uIntensity;  // per-cart brightness (palette floor x device boost)
  uniform float uDensity;    // real-hour pressure 0..1: how many carts are out
  uniform float uTime;
  uniform float uDashKm;     // cart-to-cart slot spacing along the road, km
  uniform float uSpeed;      // scroll speed of the stream, km/s
  void main() {
    // Across the strip: -1..1, split at the centerline into two lanes.
    float across = vUv.y * 2.0 - 1.0;
    float aa = abs(across);
    float lane = sign(across);
    // Each lane lives in its half — a sliver of clear paper down the median,
    // faded at the outer kerb so the carts hug the ink stroke.
    float laneMask = smoothstep(0.08, 0.36, aa) * (1.0 - smoothstep(0.70, 0.98, aa));
    if (laneMask < 0.01) discard;
    // Opposing directions: the two lanes scroll against each other, so the
    // morning tide leans one way and the evening the other.
    float phase = vUv.x / uDashKm - lane * uTime * (uSpeed / uDashKm) + lane * 0.5;
    float cell = floor(phase);
    float f = fract(phase);
    // Each slot is hashed to a stable identity — the cart it holds keeps this
    // value as the slot scrolls, so a toy glides the street instead of a dash
    // blinking in place. Pseudo-random, never a real vehicle.
    float id = wcHash(vec2(cell, lane * 7.0 + 3.0));
    // Volume tracks the real hour: a busy stream at rush, a lone cart at 3am,
    // nothing when pinned off (uDensity 0 -> every slot empty).
    float occupancy = uDensity * 0.9;
    float present = step(1.0 - occupancy, id);
    // Jitter the cart within its slot so the row isn't a metronome.
    float center = 0.5 + (fract(id * 17.3) - 0.5) * 0.4;
    // A short crisp cart mark instead of the old smeared blob.
    float body = exp(-pow((f - center) / 0.2, 2.0));
    // Carts differ — some bright, some faint, like headlamps at varied range.
    float bright = 0.55 + 0.45 * fract(id * 91.7);
    float dapple = 0.75 + 0.25 * wcNoise(vWorld * 3.0); // broken ink, like the roads
    float core = pow(1.0 - aa, 0.6);
    float a = body * present * bright * laneMask * core * dapple * uIntensity;
    if (a < 0.004) discard;
    vec3 c = mix(uTraffic, uFog, fogFactor());
    gl_FragColor = vec4(c, a);
  }
`;

export function TrafficWash() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    if (!HAS_BASEMAP) return null;
    const strips: THREE.BufferGeometry[] = [];
    for (const cls of ["major", "arterial"] as const) {
      const lines = BASEMAP_ROADS[cls] ?? [];
      const widthKm = CONFIG.basemap.roadWidthKm[cls] * CONFIG.traffic.widthMul;
      const y = CONFIG.basemap.roadY[cls] + CONFIG.traffic.yLift;
      for (const line of lines) {
        if (line.length >= 2) strips.push(buildStrip(line as [number, number][], { widthKm, y }));
      }
    }
    return strips.length ? mergeStrips(strips) : null;
  }, []);

  useFrame(() => {
    const m = materialRef.current;
    if (!m) return;
    m.uniforms.uTime.value = CLOCK.t;
    // Palette + washBoost set each cart's BRIGHTNESS (so the few carts out at
    // 3am still read, like night headlamps); the real Seattle hour drives the
    // VOLUME — how many slots are occupied — so the street fills at rush and
    // empties overnight instead of the whole flow just dimming.
    m.uniforms.uIntensity.value = LIVE.trafficIntensity * PROFILE.washBoost;
    m.uniforms.uDensity.value = trafficIntensity();
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
  });

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} renderOrder={5.5} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uTraffic: { value: LIVE.traffic }, // palette-by-reference
          uIntensity: { value: 0 },
          uDensity: { value: 0 },
          uTime: { value: 0 },
          uDashKm: { value: CONFIG.traffic.dashKm },
          uSpeed: { value: CONFIG.traffic.speedKmS },
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
