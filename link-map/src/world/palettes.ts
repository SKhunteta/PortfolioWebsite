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
  // Watercolor basemap
  paperTint: THREE.Color; // broad wash tint layered over ground
  paperGrain: number; // grain/fiber strength
  waterEdge: THREE.Color; // pigment-pooling shoreline stroke
  waterEdgeIntensity: number;
  park: THREE.Color;
  parkOpacity: number;
  road: THREE.Color; // gold filaments at night, pale ink by day
  roadIntensity: number;
  landmark: THREE.Color; // hand-inked silhouettes (Needle, skyline, Rainier)
  landmarkOpacity: number;
  // Toy train
  trainAmbient: number; // livery brightness
  trainWindow: THREE.Color;
  windowIntensity: number; // stays <= ~0.85: windows never bloom
}

// Night's floor is deliberately HIGH: on a phone at everyday brightness the
// old values (#090d18 ground, 0.3 roads) rendered as pure black and the
// whole watercolor city vanished. Moody ≠ invisible — every layer here must
// survive an OLED at 50% brightness. All values stay well under the 1.05
// bloom threshold.
const NIGHT: Palette = {
  background: new THREE.Color("#060911"),
  fog: new THREE.Color("#0b1322"),
  fogDensity: 0.01,
  ground: new THREE.Color("#15213a"),
  groundOpacity: 0.8,
  water: new THREE.Color("#0e2a42"),
  station: new THREE.Color("#8fb8d8"),
  label: new THREE.Color("#b8cbe0"),
  lineIntensity: 1.0,
  trainIntensity: 1.0,
  bloomIntensity: 1.05,
  paperTint: new THREE.Color("#1b2a47"),
  paperGrain: 0.1,
  waterEdge: new THREE.Color("#2c6a84"),
  waterEdgeIntensity: 0.55,
  park: new THREE.Color("#14331f"),
  parkOpacity: 0.22,
  road: new THREE.Color("#b98f4e"),
  roadIntensity: 0.55,
  landmark: new THREE.Color("#2c4266"),
  landmarkOpacity: 0.55,
  trainAmbient: 0.95,
  trainWindow: new THREE.Color("#ffd9a8"),
  windowIntensity: 0.85,
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
  paperTint: new THREE.Color("#2e3947"),
  paperGrain: 0.1,
  waterEdge: new THREE.Color("#48657a"),
  waterEdgeIntensity: 0.35,
  park: new THREE.Color("#2c4636"),
  parkOpacity: 0.22,
  road: new THREE.Color("#93a4b5"),
  roadIntensity: 0.22,
  landmark: new THREE.Color("#46586e"),
  landmarkOpacity: 0.5,
  trainAmbient: 1.0,
  trainWindow: new THREE.Color("#aebbc9"),
  windowIntensity: 0.12,
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

const COLOR_KEYS = [
  "background",
  "fog",
  "ground",
  "water",
  "station",
  "label",
  "paperTint",
  "waterEdge",
  "park",
  "road",
  "landmark",
  "trainWindow",
] as const;
const SCALAR_KEYS = [
  "fogDensity",
  "groundOpacity",
  "lineIntensity",
  "trainIntensity",
  "bloomIntensity",
  "paperGrain",
  "waterEdgeIntensity",
  "parkOpacity",
  "roadIntensity",
  "landmarkOpacity",
  "trainAmbient",
  "windowIntensity",
] as const;

export const LIVE: Palette = (() => {
  const live = {} as Palette;
  for (const k of COLOR_KEYS) (live[k] as THREE.Color) = NIGHT[k].clone();
  for (const k of SCALAR_KEYS) (live[k] as number) = NIGHT[k];
  return live;
})();

export function updatePalette(phase: number) {
  for (const k of COLOR_KEYS) LIVE[k].lerpColors(NIGHT[k], DAY[k], phase);
  for (const k of SCALAR_KEYS) (LIVE[k] as number) = NIGHT[k] + (DAY[k] - NIGHT[k]) * phase;
}
