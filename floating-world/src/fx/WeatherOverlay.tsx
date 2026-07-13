// The rain itself, drawn the way a watercolorist draws rain: diagonal ink
// hatching in screen space, two depths of it, plus drifting flakes when the
// rare snow day comes. One full-screen quad, one draw call, normal-blended
// in the label ink (palette-by-reference) so it reads as strokes ON the
// page, never as a particle system. Gated by PROFILE.weatherOverlay —
// phones keep weather in the palette and the wet paper only — and the mesh
// hides itself entirely on a dry day so the fill cost is zero.
//
// Screen space means scene fog doesn't apply (the strokes live on the glass,
// not in the city), and the alpha ceiling (~0.16) keeps every stroke far
// below the bloom threshold.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PROFILE } from "../world/device";
import { LIVE } from "../world/palettes";
import { WEATHER } from "../world/weather";
import { CLOCK } from "../world/clock";

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uRain;
  uniform float uSnow;
  uniform float uAspect;
  uniform vec3 uInk;

  float whHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

  // One depth of hand-hatched rain: slanted columns of falling dashes.
  // density gates how many columns carry a stroke; the per-column hash
  // staggers speed and phase so no two strokes fall in step.
  float hatch(vec2 p, float cols, float speed, float density) {
    p.x += (1.0 - p.y) * 0.22; // the slant of wind-driven rain
    float col = floor(p.x * cols);
    float h = whHash(vec2(col, 3.7));
    float f = fract(p.y * (1.15 + 0.5 * h) + uTime * speed * (0.8 + 0.4 * h) + h * 9.0);
    float dash = smoothstep(0.7, 0.82, f) * (1.0 - smoothstep(0.93, 0.985, f));
    float gate = step(1.0 - density, whHash(vec2(col, 17.9)));
    return dash * gate;
  }

  // Snow: sparse dots per grid cell, drifting down slowly with a sway.
  float flakes(vec2 p, float cells, float speed, float density) {
    p.x += sin(uTime * 0.5 + p.y * 5.0) * 0.02;
    p.y += uTime * speed;
    vec2 cell = floor(p * cells);
    vec2 f = fract(p * cells);
    vec2 o = vec2(whHash(cell), whHash(cell + 11.3)) * 0.6 + 0.2;
    float d = length(f - o);
    float dot_ = smoothstep(0.16, 0.05, d);
    float gate = step(1.0 - density, whHash(cell + 47.1));
    return dot_ * gate;
  }

  void main() {
    vec2 p = vec2(vUv.x * uAspect, vUv.y);
    float a = 0.0;
    if (uRain > 0.003) {
      // Far sheet: fine, fast, faint. Near strokes: broad, slower, darker.
      a += hatch(p, 130.0, 0.7, uRain * 0.5) * 0.45;
      a += hatch(p + 3.1, 60.0, 0.45, uRain * 0.35);
    }
    if (uSnow > 0.003) {
      a += flakes(p, 24.0, 0.045, uSnow * 0.5) * 0.9;
      a += flakes(p + 7.7, 44.0, 0.075, uSnow * 0.4) * 0.5;
    }
    float wall = max(uRain, uSnow);
    gl_FragColor = vec4(uInk, min(a, 1.0) * 0.16 * wall);
  }
`;

export function WeatherOverlay() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ size }) => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;
    const falling = WEATHER.rain + WEATHER.snow;
    mesh.visible = falling > 0.01; // dry day: zero fill cost
    if (!mesh.visible) return;
    m.uniforms.uTime.value = CLOCK.t;
    m.uniforms.uRain.value = WEATHER.rain;
    m.uniforms.uSnow.value = WEATHER.snow;
    m.uniforms.uAspect.value = size.width / size.height;
  });

  if (!PROFILE.weatherOverlay) return null;

  return (
    <mesh ref={meshRef} renderOrder={10.5} frustumCulled={false} visible={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uTime: { value: 0 },
          uRain: { value: 0 },
          uSnow: { value: 0 },
          uAspect: { value: 16 / 9 },
          uInk: { value: LIVE.label }, // palette-by-reference: pale ink
        }}
        transparent
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}
