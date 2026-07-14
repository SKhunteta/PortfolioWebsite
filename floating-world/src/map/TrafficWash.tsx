// Abstract traffic: a soft luminous CURRENT that flows along the road ribbons
// — the honest-safe way to add "cars" to a piece whose whole contract is that
// what moves is true. There is no per-vehicle feed, so this is never discrete
// vehicles; it is a blurred, broken shimmer running the length of the streets,
// two opposing lanes (inbound one way, outbound the other), reading as FLOW.
// Density keys to the real Seattle hour (world/traffic.ts): thick at rush,
// nearly gone at 3am — the ferry tier of honesty, deterministic and clearly
// stylized, so it cannot be mistaken for live positions.
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
  uniform float uIntensity;
  uniform float uTime;
  uniform float uDashKm;   // spacing of the flow beads along the road, km
  uniform float uSpeed;    // scroll speed of the current, km/s
  void main() {
    // Across the strip: -1..1, split at the centerline into two lanes.
    float across = vUv.y * 2.0 - 1.0;
    float aa = abs(across);
    float lane = sign(across);
    // Each lane lives in its half — a sliver of clear paper down the median,
    // faded at the outer kerb so the flow hugs the ink stroke.
    float laneMask = smoothstep(0.06, 0.34, aa) * (1.0 - smoothstep(0.72, 1.0, aa));
    if (laneMask < 0.01) discard;
    // Opposing directions: the two lanes scroll against each other, so the
    // morning tide leans one way and the evening the other.
    float phase = vUv.x / uDashKm - lane * uTime * (uSpeed / uDashKm) + lane * 0.5;
    float f = fract(phase);
    // A soft blob per cycle — deliberately blurry: a current, not a car.
    float bead = exp(-pow((f - 0.5) / 0.26, 2.0));
    float dapple = 0.6 + 0.4 * wcNoise(vWorld * 3.0); // broken ink, like the roads
    float core = pow(1.0 - aa, 0.6);
    float a = bead * laneMask * core * dapple * uIntensity;
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
    // Palette drives the color/floor; the real Seattle hour drives the volume;
    // washBoost lifts thin strokes on small screens like the ink roads do.
    m.uniforms.uIntensity.value =
      LIVE.trafficIntensity * PROFILE.washBoost * trafficIntensity();
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
