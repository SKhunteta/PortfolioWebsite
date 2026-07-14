// The translucent ground, now painted like paper: broad watercolor washes,
// pigment mottling, and fine tooth, all in-fragment from world position.
// Tunnel ribbons still render BENEATH it and are seen through it — that
// submerged read is painter's order, not the depth buffer.
//
// Render-order contract (everything transparent + depthWrite:false, EXCEPT
// the train model at 9 which is the one depthWrite:true exception so its
// sections self-occlude):
//   0 parks (under-wash, y −0.08) · 1 water fill (−0.06) · 2 water edge
//   stroke (−0.05) · 3 tunnel ribbons (−0.22) + underground station orbs
//   and their light shafts + wash-shadows (−0.02, seen through the paper) ·
//   4 ground/paper (0) · 5 roads (0.010/0.014) ·
//   6 surface + elevated ribbons, landmarks, ferries, seaplanes · 7 stations
//   (surface/elevated orbs + watercolor seals) · 8 trails · 9 train model
//   (depthWrite:true) · 10 glow sprites + headlights + city lights (Needle
//   beacon, stadium domes) · 10.5 weather hatch (screen-space rain/snow) ·
//   11 labels (depthTest off)

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LIVE } from "../world/palettes";
import { WEATHER } from "../world/weather";
import { CLOCK } from "../world/clock";
import { sunPhase } from "../world/sun";
import { STAIN_TEX, STAIN_MIN, STAIN_SIZE } from "../world/stainField";
import { PROFILE } from "../world/device";
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
  uniform vec3 uGround;
  uniform vec3 uPaperTint;
  uniform float uGrain;
  uniform float uOpacity;
  uniform float uRain; // eased live weather (world/weather.ts)
  uniform float uTime;
  uniform sampler2D uStain; // world-space rail stain (world/stainField.ts)
  uniform vec2 uStainMin;
  uniform vec2 uStainSize;
  uniform float uStainAmp;
  void main() {
    float wash   = wcFbm(vWorld * 0.11 + 31.7); // ~9 km watercolor washes
    float grain  = wcFbm(vWorld * 2.6);         // pigment mottling
    float fibers = wcNoise(vWorld * 24.0);      // paper tooth
    vec3 c = uGround + uPaperTint * (wash - 0.5);
    c *= 1.0 + uGrain * (grain - 0.5) + uGrain * 0.6 * (fibers - 0.5);
    // Rain on the page: a slow-crawling wet mottle — patches of the wash
    // darken where the paper has drunk the water. One extra noise sample,
    // and it costs nothing on a dry day (uRain eases back to 0).
    float wet = wcNoise(vWorld * 5.0 + vec2(0.0, uTime * 0.28));
    c *= 1.0 - uRain * 0.2 * smoothstep(0.55, 0.95, wet);
    // #21: where trains have recently passed, the paper stays warm and damp —
    // a slow-fading stain that leaves the busy lines lived-in and the sleepy
    // tails crisp. Sample the world-space field, then darken like drunk water
    // and warm the hue a touch so it reads as damp paper, not a colour wash.
    // A hair of the fine grain mottles the stain so it dries unevenly.
    // A small world-space warp so the stain bleeds like pigment instead of
    // revealing the field's grid edges.
    vec2 stWarp = vec2(wcNoise(vWorld * 3.1 + 5.0), wcNoise(vWorld.yx * 3.1 - 2.0)) - 0.5;
    vec2 stUv = (vWorld + stWarp * 0.18 - uStainMin) / uStainSize;
    vec2 inBounds = step(vec2(0.0), stUv) * step(stUv, vec2(1.0));
    float stain = texture2D(uStain, stUv).r * inBounds.x * inBounds.y;
    stain *= uStainAmp * (0.8 + 0.4 * fibers);
    // Damp paper drinks a little light, then a warm amber bloom lifts the hue —
    // additive so the stain still reads as warmth against the near-black night
    // ground, where a pure darken would vanish.
    c *= 1.0 - 0.15 * stain;
    c += vec3(0.035, 0.021, 0.006) * stain;
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), uOpacity);
  }
`;

export function GroundPlane() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(() => {
    const m = materialRef.current;
    if (!m) return;
    m.uniforms.uOpacity.value = Math.min(1, LIVE.groundOpacity * PROFILE.washBoost);
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
    m.uniforms.uGrain.value = LIVE.paperGrain;
    m.uniforms.uRain.value = WEATHER.rain;
    m.uniforms.uTime.value = CLOCK.t;
    // The warm damp reads at night; by day the pale page all but hides it.
    m.uniforms.uStainAmp.value = 1 - 0.6 * sunPhase();
  });

  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[CENTROID.x, 0, CENTROID.z]}
      renderOrder={4}
      frustumCulled={false}
    >
      <planeGeometry args={[400, 400]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uGround: { value: LIVE.ground }, // palette-by-reference
          uPaperTint: { value: LIVE.paperTint },
          uFog: { value: LIVE.fog },
          uFogDensity: { value: LIVE.fogDensity },
          uGrain: { value: LIVE.paperGrain },
          uOpacity: { value: LIVE.groundOpacity },
          uRain: { value: 0 },
          uTime: { value: 0 },
          uStain: { value: STAIN_TEX },
          uStainMin: { value: STAIN_MIN },
          uStainSize: { value: STAIN_SIZE },
          uStainAmp: { value: 1 },
        }}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
