// Shared GLSL for the watercolor look: hash/value-noise/fbm and the fog
// helpers. Raw ShaderMaterials do NOT participate in scene fog — any
// normal-blended layer that replaces a MeshBasicMaterial must mix toward
// uFog itself, and additive layers must MULTIPLY by the fog factor, or the
// horizon breaks at drift distance.

import { PROFILE } from "../world/device";

export const NOISE_GLSL = /* glsl */ `
  #define OCTAVES ${PROFILE.noiseOctaves}
  float wcHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float wcNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(wcHash(i), wcHash(i + vec2(1.0, 0.0)), u.x),
               mix(wcHash(i + vec2(0.0, 1.0)), wcHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float wcFbm(vec2 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < OCTAVES; i++) { s += a * wcNoise(p); p *= 2.03; a *= 0.5; }
    return s;
  }
`;

// Vertex chunk: pass world xz + view depth.
export const FOG_VARYINGS_VERT = /* glsl */ `
  varying vec2 vWorld;
  varying float vFogDepth;
`;

export const FOG_VARYINGS_FRAG = /* glsl */ `
  varying vec2 vWorld;
  varying float vFogDepth;
  uniform vec3 uFog;
  uniform float uFogDensity;
  float fogFactor() {
    float f = uFogDensity * vFogDepth;
    return 1.0 - exp(-f * f);
  }
`;
