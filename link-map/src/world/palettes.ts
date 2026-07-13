// The two looks and the live blend between them. Night is the hero: deep
// blue-black, luminous lines, fog you can feel. Day is the same city gone
// pale and cool — never white, or the additive light dies.
//
// LIVE holds mutable THREE.Color instances that materials reference by
// object; updatePalette() lerps into them once per frame and every shader
// sees the change without touching a single material.

import * as THREE from "three";

export interface Palette {
  background: THREE.Color;
  fog: THREE.Color;
  fogDensity: number;
  ground: THREE.Color;
  groundOpacity: number;
  water: THREE.Color;
  station: THREE.Color;
  label: THREE.Color;
  lineIntensity: number; // multiplier on ribbon emissive
  trainIntensity: number;
  bloomIntensity: number;
}

const NIGHT: Palette = {
  background: new THREE.Color("#04060c"),
  fog: new THREE.Color("#060a14"),
  fogDensity: 0.012,
  ground: new THREE.Color("#090d18"),
  groundOpacity: 0.62,
  water: new THREE.Color("#071523"),
  station: new THREE.Color("#8fb8d8"),
  label: new THREE.Color("#b8cbe0"),
  lineIntensity: 1.0,
  trainIntensity: 1.0,
  bloomIntensity: 1.05,
};

const DAY: Palette = {
  background: new THREE.Color("#26313f"),
  fog: new THREE.Color("#2c3a4c"),
  fogDensity: 0.008,
  ground: new THREE.Color("#222c3a"),
  groundOpacity: 0.5,
  water: new THREE.Color("#1a2a38"),
  station: new THREE.Color("#a9c2d6"),
  label: new THREE.Color("#d4dfea"),
  lineIntensity: 0.45,
  trainIntensity: 0.6,
  bloomIntensity: 0.45,
};

// Sound Transit hues, remapped toward the dreamy end: same identities a
// local reads instantly, but tuned to glow instead of print.
export const LINE_GLOW: Record<string, THREE.Color> = {};
const LINE_GLOW_DEFAULT = new THREE.Color("#5fe3b0");

export function lineGlow(lineId: string, feedColor: string): THREE.Color {
  let c = LINE_GLOW[lineId];
  if (!c) {
    c = new THREE.Color(feedColor);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    c.setHSL(hsl.h, Math.min(1, hsl.s * 0.9 + 0.15), Math.min(0.62, hsl.l + 0.28));
    LINE_GLOW[lineId] = c;
  }
  return c ?? LINE_GLOW_DEFAULT;
}

export const LIVE: Palette = {
  background: NIGHT.background.clone(),
  fog: NIGHT.fog.clone(),
  fogDensity: NIGHT.fogDensity,
  ground: NIGHT.ground.clone(),
  groundOpacity: NIGHT.groundOpacity,
  water: NIGHT.water.clone(),
  station: NIGHT.station.clone(),
  label: NIGHT.label.clone(),
  lineIntensity: NIGHT.lineIntensity,
  trainIntensity: NIGHT.trainIntensity,
  bloomIntensity: NIGHT.bloomIntensity,
};

export function updatePalette(phase: number) {
  LIVE.background.lerpColors(NIGHT.background, DAY.background, phase);
  LIVE.fog.lerpColors(NIGHT.fog, DAY.fog, phase);
  LIVE.ground.lerpColors(NIGHT.ground, DAY.ground, phase);
  LIVE.water.lerpColors(NIGHT.water, DAY.water, phase);
  LIVE.station.lerpColors(NIGHT.station, DAY.station, phase);
  LIVE.label.lerpColors(NIGHT.label, DAY.label, phase);
  LIVE.fogDensity = NIGHT.fogDensity + (DAY.fogDensity - NIGHT.fogDensity) * phase;
  LIVE.groundOpacity =
    NIGHT.groundOpacity + (DAY.groundOpacity - NIGHT.groundOpacity) * phase;
  LIVE.lineIntensity =
    NIGHT.lineIntensity + (DAY.lineIntensity - NIGHT.lineIntensity) * phase;
  LIVE.trainIntensity =
    NIGHT.trainIntensity + (DAY.trainIntensity - NIGHT.trainIntensity) * phase;
  LIVE.bloomIntensity =
    NIGHT.bloomIntensity + (DAY.bloomIntensity - NIGHT.bloomIntensity) * phase;
}
