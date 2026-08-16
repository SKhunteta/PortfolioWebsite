// The woodblock moon — the real one. After dark the moon over Seattle prints
// into the bokashi band at the top of the sheet: a pale-gold disc at its TRUE
// lit fraction (suncalc, world/moon.ts — the same ephemeris the sun and the
// tide already read), rising and setting on the real Seattle sky, crossing
// the band east to west and riding higher when it truly stands higher. The
// terminator is drawn honestly — waxing light on the west limb, waning on
// the east — so a crescent week and a full-moon week are different prints,
// and a new moon draws NOTHING: the disc is dark, absence not invention.
//
// It keeps the piece's weather honesty too: real overcast, rain and fog thin
// the disc away (a moon through a storm would be a lie), and it hides
// entirely by day — one screen-space quad at the SkyBokashi's tier, visible
// false off-stage, zero cost. Painted pigment under the bright-paper bloom
// ceiling; a sumi keyline seats the disc in the band the way the ink outline
// seats the trains on bright paper. Screen space, so scene fog does not
// apply (the SkyBokashi / WeatherOverlay precedent).
//
// ?moon=off|on|full|new|0..1 pins it; __linkMap.moon() from the console.

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CLOCK } from "../world/clock";
import { sunPhase } from "../world/sun";
import { WEATHER } from "../world/weather";
import { moonState, type MoonState } from "../world/moon";
import { NOISE_GLSL } from "../map/watercolorGlsl";

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  ${NOISE_GLSL}
  varying vec2 vUv;
  uniform vec2 uPos;       // sheet uv of the disc centre
  uniform float uRadius;   // disc radius in sheet-height units
  uniform float uAspect;   // viewport width / height — keeps the disc round
  uniform float uFraction; // real lit fraction, 0 new .. 1 full
  uniform float uSide;     // +1 waxing (west limb lit), -1 waning
  uniform float uGate;     // night x horizon x clear-sky, eased
  uniform vec3 uGold;      // the lit face — pale lantern gold
  uniform vec3 uHalo;      // the warm ring the lit face breathes into the band
  uniform vec3 uInk;       // sumi keyline + the dark limb's whisper

  void main() {
    if (uGate < 0.004) discard;
    vec2 p = vUv - uPos;
    p.x *= uAspect;
    p /= uRadius;
    float r = length(p);
    if (r > 2.6) discard;

    float disc = 1.0 - smoothstep(0.96, 1.04, r);
    // The honest terminator: the lit limb's edge is the classic half-ellipse,
    // swept across the disc by the real fraction.
    float limbY = clamp(p.y, -1.0, 1.0);
    float limb = sqrt(max(0.0, 1.0 - limbY * limbY));
    float term = (1.0 - 2.0 * uFraction) * limb;
    float lit = disc * smoothstep(term - 0.09, term + 0.09, uSide * p.x);
    // Washi tooth in the lit face — maria as pigment mottle, not detail.
    lit *= 0.88 + 0.24 * wcFbm(p * 2.3 + vec2(3.7, 1.9));
    // The dark limb: the faintest ink presence, so a crescent still reads as
    // a round moon partly unlit (never a bitten disc).
    float dark = disc * (1.0 - smoothstep(term - 0.09, term + 0.09, uSide * p.x)) * 0.14;
    // Sumi keyline seating the disc in the band.
    float keyline = smoothstep(0.90, 1.0, r) * (1.0 - smoothstep(1.02, 1.14, r));
    // A warm breath around the lit face, fuller when the moon is.
    float halo = exp(-max(0.0, r - 1.0) * 2.2) * smoothstep(0.92, 1.1, r)
      * (0.10 + 0.20 * uFraction);

    float a = clamp(lit * 0.9 + dark + keyline * 0.6 + halo, 0.0, 1.0) * uGate;
    if (a < 0.004) discard;
    vec3 c = uGold * lit * 0.9 + uInk * (dark + keyline * 0.6) + uHalo * halo;
    c /= max(lit * 0.9 + dark + keyline * 0.6 + halo, 1e-4);
    gl_FragColor = vec4(c, a);
  }
`;

// Fixed pigments at the lighthouse-beam precedent (night creatures carry
// their own colors) — all under the bright-paper bloom ceiling.
const MOON_GOLD = new THREE.Color("#e9d8a6");
const MOON_HALO = new THREE.Color("#d9a25e");
const MOON_INK = new THREE.Color("#3c2b26");

// The ephemeris crawls; re-read it every ~20 s, not every frame.
const REFRESH_S = 20;

export function MoonPrint() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const size = useThree((s) => s.size);
  const stateRef = useRef<{ at: number; moon: MoonState }>({
    at: -Infinity,
    moon: moonState(),
  });

  useFrame(() => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;

    const cached = stateRef.current;
    if (CLOCK.t - cached.at > REFRESH_S) {
      cached.at = CLOCK.t;
      cached.moon = moonState();
    }
    const moon = cached.moon;

    // Night creature on the lighthouse-beam gate (a disc of lantern gold is
    // nothing against the sun), thinned by the real sky: overcast, rain and
    // fog hide the true moon, honestly.
    const s = sunPhase();
    const night = Math.min(1, Math.max(0, (0.5 - s) / 0.3));
    const clear = Math.max(
      0,
      1 - (WEATHER.overcast * 0.75 + WEATHER.fog * 0.9 + WEATHER.rain * 0.85 + WEATHER.snow * 0.6)
    );
    const gate = moon.up ? night * clear : 0;
    mesh.visible = gate > 0.004;
    if (!mesh.visible) return;

    m.uniforms.uGate.value = gate;
    m.uniforms.uPos.value.set(moon.x, moon.y);
    m.uniforms.uFraction.value = moon.fraction;
    m.uniforms.uSide.value = moon.waxing ? 1 : -1;
    m.uniforms.uAspect.value = size.width / Math.max(1, size.height);
  });

  return (
    <mesh ref={meshRef} renderOrder={-0.9} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uPos: { value: new THREE.Vector2(0.5, 0.85) },
          uRadius: { value: 0.045 },
          uAspect: { value: 1.78 },
          uFraction: { value: 1 },
          uSide: { value: 1 },
          uGate: { value: 0 },
          uGold: { value: MOON_GOLD },
          uHalo: { value: MOON_HALO },
          uInk: { value: MOON_INK },
        }}
        transparent
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}
