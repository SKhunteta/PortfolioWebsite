// SkyBokashi — the hand-wiped gradient at the top of every woodblock print:
// a screen-space band easing from nothing into deep pigment at the frame's
// upper edge (Prussian by day, deep plum by night), with faint horizontal
// streaks like a wiped baren. One full-screen quad at renderOrder -1 so the
// whole world paints over it; screen space means scene fog does not apply
// (the WeatherOverlay precedent). This single quad is what makes the piece
// read as a PRINT at first glance.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LIVE } from "../world/palettes";
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
  uniform vec3 uColor;
  uniform float uTime;

  float bkHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float bkNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(bkHash(i), bkHash(i + vec2(1.0, 0.0)), u.x),
               mix(bkHash(i + vec2(0.0, 1.0)), bkHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    // The wipe: pigment gathers toward the top edge of the sheet.
    float t = smoothstep(0.58, 0.99, vUv.y);
    // Baren streaks: long horizontal drags, fine in y, slow in x, drifting
    // almost imperceptibly so the sky is alive without ever being weather.
    float streak = bkNoise(vec2(vUv.x * 2.4 + uTime * 0.006, vUv.y * 46.0));
    float a = t * (0.42 + 0.14 * (streak - 0.5));
    gl_FragColor = vec4(uColor, a * 0.5);
  }
`;

export function SkyBokashi() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(() => {
    const m = materialRef.current;
    if (m) m.uniforms.uTime.value = CLOCK.t;
  });

  return (
    <mesh renderOrder={-1} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uColor: { value: LIVE.bokashiTop }, // palette-by-reference
          uTime: { value: 0 },
        }}
        transparent
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}
