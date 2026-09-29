// The rain itself, drawn the way a watercolorist draws rain: diagonal ink
// hatching in screen space — two depths always, a third broad near sheet
// when a real downpour comes — plus a three-depth curtain of flake-white
// snow on the rare snow day (far dust, mid fall, big slow near flakes, each
// flake fluttering on its own hashed beat). One full-screen quad, one draw
// call, normal-blended: rain is strokes of the label ink
// (palette-by-reference), snow is warm paper-white held under the bloom
// ceiling — so it reads as pigment ON the page, never as a particle system.
// Gated by PROFILE.weatherOverlay — phones keep weather in the palette and
// the wet paper only — and the mesh hides itself entirely on a dry day so
// the fill cost is zero.
//
// The hatch's slant is WIND, not a constant: it meanders through gusts
// (two incommensurate sines off the shared clock) and a storm leans the
// whole sheet hard. And when the storm strikes (world/weather.ts LIGHTNING),
// this same quad carves the bolt — Hokusai's Sanka Hakuu move, a jagged
// vermilion-gold stroke in a faint sumi halo, zigzagging down the print for
// the instant the page flashes.
//
// Screen space means scene fog doesn't apply (the strokes live on the glass,
// not in the city), and the alpha ceiling keeps every stroke far below the
// bloom threshold — even the bolt's gold core stays painted, never HDR.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PROFILE } from "../world/device";
import { LIVE } from "../world/palettes";
import { WEATHER, LIGHTNING } from "../world/weather";
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
  uniform float uWind;
  uniform float uBolt;
  uniform float uSeed;
  uniform float uAspect;
  uniform vec3 uInk;

  float whHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

  // One depth of hand-hatched rain: slanted columns of falling dashes.
  // density gates how many columns carry a stroke; the per-column hash
  // staggers speed and phase so no two strokes fall in step.
  float hatch(vec2 p, float cols, float speed, float density) {
    p.x += (1.0 - p.y) * uWind; // the slant of wind-driven rain
    float col = floor(p.x * cols);
    float h = whHash(vec2(col, 3.7));
    float f = fract(p.y * (1.15 + 0.5 * h) + uTime * speed * (0.8 + 0.4 * h) + h * 9.0);
    float dash = smoothstep(0.7, 0.82, f) * (1.0 - smoothstep(0.93, 0.985, f));
    float gate = step(1.0 - density, whHash(vec2(col, 17.9)));
    return dash * gate;
  }

  // Snow: hashed flakes per grid cell, each with its own size, fall pace and
  // flutter phase — a curtain, not a grid. The whole sheet sways on the wind
  // that leans the rain, and every flake wanders its cell on its own beat.
  float flakes(vec2 p, float cells, float speed, float density, float size) {
    p.x += sin(uTime * 0.4 + p.y * 3.0) * 0.03 + (1.0 - p.y) * uWind * 0.6;
    p.y += uTime * speed;
    vec2 cell = floor(p * cells);
    vec2 f = fract(p * cells);
    float h1 = whHash(cell), h2 = whHash(cell + 11.3), h3 = whHash(cell + 71.7);
    // Per-flake flutter — no two flakes fall in step.
    f.x += sin(uTime * (0.5 + h3 * 0.9) + h1 * 6.28) * 0.09;
    vec2 o = vec2(h1, h2) * 0.36 + 0.32;
    float d = length(f - o);
    float r = size * (0.5 + 0.5 * h3); // hashed size spread
    float dot_ = smoothstep(r, r * 0.3, d);
    float gate = step(1.0 - density, whHash(cell + 47.1));
    return dot_ * gate;
  }

  // The bolt's path: piecewise-linear jitter between hashed nodes, walking
  // down from the top edge, with a slight per-strike lean. Carved, not
  // photographed — a woodcutter's zigzag.
  float boltPath(float y, float seed) {
    float fy = (1.0 - y) * 9.0;
    float j = floor(fy), f = fract(fy);
    float xa = whHash(vec2(j, seed * 89.0)) - 0.5;
    float xb = whHash(vec2(j + 1.0, seed * 89.0)) - 0.5;
    return mix(xa, xb, f) * 0.16 + (1.0 - y) * 0.1 * (seed - 0.5);
  }

  // Snowfall is PAPER, not ink: warm flake-white held under the bright-paper
  // bloom ceiling — white reserve against the darkened snow sky, the way
  // Hiroshige printed Kanbara.
  const vec3 SNOWC = vec3(0.94, 0.925, 0.885);

  void main() {
    vec2 p = vec2(vUv.x * uAspect, vUv.y);
    float aR = 0.0;
    float aS = 0.0;
    if (uRain > 0.003) {
      // Far sheet: fine, fast, faint. Near strokes: broad, slower, darker.
      aR += hatch(p, 130.0, 0.7, uRain * 0.55) * 0.45;
      aR += hatch(p + 3.1, 60.0, 0.45, uRain * 0.4);
      // The downpour's near sheet: broad slow strokes only a real rain or a
      // storm brings out — drizzle never carries it.
      float pour = smoothstep(0.55, 1.0, uRain);
      aR += hatch(p + 9.4, 26.0, 0.32, pour * 0.35) * 0.85 * pour;
    }
    if (uSnow > 0.003) {
      // Three depths of the same curtain: far dust, the mid fall, and the
      // big slow near flakes drifting just in front of the glass.
      aS += flakes(p, 60.0, 0.05, uSnow * 0.55, 0.11) * 0.5;
      aS += flakes(p + 7.7, 30.0, 0.075, uSnow * 0.5, 0.13) * 0.8;
      aS += flakes(p + 3.9, 13.0, 0.11, uSnow * 0.42, 0.17);
    }
    float alphaR = min(aR, 1.0) * 0.2 * uRain;
    float alphaS = min(aS, 1.0) * 0.8 * uSnow;
    vec3 col = mix(uInk, SNOWC, clamp(alphaS * 8.0, 0.0, 1.0));
    float alpha = max(alphaR, alphaS);

    if (uBolt > 0.01) {
      // Main stroke: from the top edge down to a hashed tip height.
      float x0 = (0.3 + 0.4 * uSeed) * uAspect;
      float yTip = 0.3 + 0.25 * whHash(vec2(uSeed * 31.0, 1.3));
      float within = smoothstep(yTip, yTip + 0.08, vUv.y);
      float d = abs(p.x - (x0 + boltPath(vUv.y, uSeed)));
      float w = 0.0035 + 0.0035 * vUv.y; // tapering toward the tip
      float core = (1.0 - smoothstep(w * 0.5, w, d)) * within;
      float halo = (1.0 - smoothstep(w, w * 7.0, d)) * within;

      // One short fork, splitting off partway down and angling away.
      float yFork = 0.5 + 0.25 * whHash(vec2(uSeed, 7.7));
      float forkWithin = smoothstep(yFork - 0.22, yFork - 0.14, vUv.y) * (1.0 - step(yFork, vUv.y));
      float xFork = x0 + boltPath(yFork, uSeed) + (yFork - vUv.y) * (0.4 + 0.5 * uSeed);
      float dF = abs(p.x - xFork);
      core += (1.0 - smoothstep(w * 0.4, w * 0.8, dF)) * forkWithin * 0.7;
      halo += (1.0 - smoothstep(w, w * 5.0, dF)) * forkWithin * 0.5;

      // Vermilion body, gold heart — Sanka Hakuu's red bolt, held under the
      // bloom ceiling; the halo is the sumi ink it was carved with.
      vec3 boltC = mix(vec3(0.78, 0.3, 0.14), vec3(0.94, 0.78, 0.4), clamp(core, 0.0, 1.0));
      float boltA = clamp(core + halo * 0.3, 0.0, 1.0) * uBolt;
      col = mix(col, boltC, clamp(boltA * 3.0, 0.0, 1.0));
      alpha = max(alpha, boltA * 0.85);
    }

    gl_FragColor = vec4(col, alpha);
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
    mesh.visible = falling > 0.01 || LIGHTNING.bolt > 0.01; // dry day: zero fill cost
    if (!mesh.visible) return;
    m.uniforms.uTime.value = CLOCK.t;
    m.uniforms.uRain.value = WEATHER.rain;
    m.uniforms.uSnow.value = WEATHER.snow;
    // Gusts: two incommensurate sines meander the slant; a storm leans hard —
    // both in the gust swing and in the standing lean of the whole sheet.
    const gust = Math.sin(CLOCK.t * 0.16) * 0.6 + Math.sin(CLOCK.t * 0.043 + 2.0) * 0.4;
    m.uniforms.uWind.value =
      0.22 +
      0.12 * WEATHER.lightning +
      gust * (0.05 + 0.12 * WEATHER.rain + 0.3 * WEATHER.lightning);
    m.uniforms.uBolt.value = LIGHTNING.bolt;
    m.uniforms.uSeed.value = LIGHTNING.seed;
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
          uWind: { value: 0.22 },
          uBolt: { value: 0 },
          uSeed: { value: 0 },
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
