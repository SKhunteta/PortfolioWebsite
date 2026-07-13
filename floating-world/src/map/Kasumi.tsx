// Kasumi — the horizontal mist bands that float across classical ukiyo-e
// scenes, here drifting slowly over the middle distance of the print. One
// 400×400 plane just above the paper (renderOrder 6.5: over landmarks,
// under station orbs and labels), one draw call, normal-blended.
//
// The band body is colored LIVE.fog — literally made of the scene's mist —
// so the raw-ShaderMaterial fog contract (mix toward uFog) is satisfied by
// construction; only the thin kinkumo gilt edge dissolves with distance.
// Honesty rule: stylized mist never impersonates weather — real fog
// (WEATHER.fog) scales these bands away and the true fogDensity takes over.
// Denser by day (a bright-print flourish), thinner by lantern light.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LIVE } from "../world/palettes";
import { WEATHER } from "../world/weather";
import { CLOCK } from "../world/clock";
import { sunPhase } from "../world/sun";
import { CENTROID } from "./network";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  uniform float uTime;
  uniform float uStrength;
  uniform vec2 uCenter;
  uniform vec3 uGold;

  // One kasumi band: a long soft-edged ribbon crossing the print east-west,
  // its rim wobbled by fbm, drifting slowly west, its ends dissolving on
  // very-low-frequency noise so it reads as a brushed cloud, not a stripe.
  // Returns body mask in x, gilt-edge mask in y.
  vec2 band(vec2 w, float centerZ, float halfW, float seed) {
    float x = w.x + uTime * (0.010 + 0.004 * seed); // ~10–15 m/s westward
    float wob = (wcFbm(vec2(x * 0.045, seed * 13.1)) - 0.5) * 7.0;
    float dz = (w.y - centerZ + wob) / halfW;
    float body = 1.0 - smoothstep(0.5, 1.0, abs(dz));
    float gate = smoothstep(0.34, 0.66, wcNoise(vec2(x * 0.012, seed * 7.7)));
    // Kinkumo: the thin gilt line tracing the band's rim.
    float edge = (1.0 - smoothstep(0.05, 0.16, abs(abs(dz) - 0.82))) * gate;
    return vec2(body * gate, edge);
  }

  void main() {
    vec2 w = vWorld - uCenter;
    // Four bands stacked at varied depths so the mist reads as receding ridge
    // layers (the poster's stacked fog), not one stripe. Still one draw call.
    vec2 b1 = band(w, -7.0, 3.4, 1.0);
    vec2 b2 = band(w, 9.5, 4.2, 2.0);
    vec2 b3 = band(w, 1.5, 2.4, 3.0);   // a thinner seam threading the middle distance
    vec2 b4 = band(w, 20.0, 3.2, 4.0);  // a far band riding the horizon recession
    float body = min(1.0, b1.x + b2.x + b3.x + b4.x);
    float edge = min(1.0, b1.y + b2.y + b3.y + b4.y);
    // Body IS the fog color; the gold edge alone mixes back toward fog with
    // distance so the horizon contract holds.
    vec3 c = mix(uFog, uGold, edge * 0.55 * (1.0 - fogFactor()));
    gl_FragColor = vec4(c, body * 0.35 * uStrength);
  }
`;

export function Kasumi() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(() => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;
    // Denser by day, thinner by night; real fog replaces stylized mist.
    const strength = (0.45 + 0.55 * sunPhase()) * (1 - WEATHER.fog);
    mesh.visible = strength > 0.02;
    if (!mesh.visible) return;
    m.uniforms.uStrength.value = strength;
    m.uniforms.uTime.value = CLOCK.t;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
  });

  return (
    <mesh
      ref={meshRef}
      rotation-x={-Math.PI / 2}
      position={[CENTROID.x, 0.5, CENTROID.z]}
      renderOrder={6.5}
      frustumCulled={false}
    >
      <planeGeometry args={[400, 400]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uTime: { value: 0 },
          uStrength: { value: 0 },
          uCenter: { value: new THREE.Vector2(CENTROID.x, CENTROID.z) },
          uGold: { value: new THREE.Color("#c9972e") },
          uFog: { value: LIVE.fog }, // palette-by-reference
          uFogDensity: { value: LIVE.fogDensity },
        }}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
