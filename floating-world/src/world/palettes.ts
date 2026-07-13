// The two looks and the live blend between them. DAY is the hero: warm
// washi cream, Prussian-blue water, vermilion seals — a woodblock print in
// full sun. Night is a warm lantern print — aubergine dusk, gold streets,
// indigo water — never cool blue, and never so bright the paper blooms.
//
// LIVE holds mutable THREE.Color instances that materials reference by
// object; updatePalette() lerps into them once per frame and every shader
// sees the change without touching a single material.

import * as THREE from "three";

export interface Palette {
  background: THREE.Color;
  // Bokashi: the hand-wiped gradient band at the top of every print
  // (fx/SkyBokashi.tsx) — Prussian by day, deep plum by night.
  bokashiTop: THREE.Color;
  fog: THREE.Color;
  fogDensity: number;
  ground: THREE.Color;
  groundOpacity: number;
  water: THREE.Color;
  waterOpacity: number;
  // Seigaiha: the traditional overlapping wave-fan pattern — foam-white
  // linework over Prussian blue by day (the Great Wave register, the
  // daytime signature), gold thread by lantern light after dark.
  seigaiha: THREE.Color;
  seigaihaIntensity: number;
  station: THREE.Color;
  // Per-station identity accents (stations/identity.ts) blend into the orbs
  // and paint the hanko seals; the seals are hero-opacity by day — vermilion
  // stamps pressed into the paper.
  stationAccentMix: number;
  stationSealOpacity: number;
  label: THREE.Color;
  lineIntensity: number; // multiplier on ribbon emissive
  trainIntensity: number;
  bloomIntensity: number;
  // Woodblock basemap
  paperTint: THREE.Color; // broad wash tint layered over ground
  paperGrain: number; // grain/fiber strength — high: the paper is the subject
  waterEdge: THREE.Color; // blue pigment pooling along shorelines
  waterEdgeIntensity: number;
  park: THREE.Color;
  parkOpacity: number;
  road: THREE.Color; // dry-brush sumi ink by day, lantern gold by night
  roadIntensity: number;
  landmark: THREE.Color; // hand-inked silhouettes (Needle, skyline, Rainier)
  landmarkOpacity: number;
  ferry: THREE.Color; // WSF hulls — pale washi against the Prussian Sound
  ferryOpacity: number;
  // Toy train
  trainAmbient: number; // livery brightness
  trainWindow: THREE.Color;
  windowIntensity: number; // stays <= ~0.85: windows never bloom
}

// The bright-paper rule (this edition's inversion of link-map's OLED rule):
// every value stays under ~#f2 per channel so the washi never catches the
// bloom skirt (threshold 1.0) — "never white, or the additive light dies"
// binds the DAY look here. Night keeps the "moody ≠ invisible" floor.
const DAY: Palette = {
  background: new THREE.Color("#ead9b0"), // washi cream — warm, NOT white
  bokashiTop: new THREE.Color("#2b4a77"), // ai-blue wiped band
  fog: new THREE.Color("#f2e6c6"), // kasumi — mist paler than the paper
  fogDensity: 0.006,
  ground: new THREE.Color("#c3cb90"), // sage washi — evergreen land, NOT sand
  groundOpacity: 0.7, // opaque enough that land reads green over the cream sky base; tunnels still read
  water: new THREE.Color("#1e4f86"), // Prussian blue (ai)
  waterOpacity: 0.85,
  seigaiha: new THREE.Color("#e9f0ee"), // foam-white wave linework
  seigaihaIntensity: 0.55, // day-visible: the signature move
  station: new THREE.Color("#e0863c"), // persimmon
  stationAccentMix: 0.5,
  stationSealOpacity: 0.85, // hanko seals are HERO by day
  label: new THREE.Color("#4a3721"), // sumi-brown ink
  lineIntensity: 0.7,
  trainIntensity: 1.0,
  bloomIntensity: 0.5,
  paperTint: new THREE.Color("#b9c087"), // moss-gold wash — forested-terrain mottle, not dune-gold
  paperGrain: 0.24,
  waterEdge: new THREE.Color("#16355e"), // blue pigment pooling
  waterEdgeIntensity: 0.8,
  park: new THREE.Color("#8faa5b"), // warm moss wash — the Emerald City reads green
  parkOpacity: 0.5,
  road: new THREE.Color("#4c3a28"), // sumi ink strokes
  roadIntensity: 0.55,
  landmark: new THREE.Color("#8a5a40"), // warm sepia ink massing
  landmarkOpacity: 1.0,
  ferry: new THREE.Color("#f0e8d2"),
  ferryOpacity: 0.95,
  trainAmbient: 1.05,
  trainWindow: new THREE.Color("#fff1cf"),
  windowIntensity: 0.2,
};

const NIGHT: Palette = {
  background: new THREE.Color("#432b35"), // warm aubergine dusk
  bokashiTop: new THREE.Color("#2a1b26"),
  fog: new THREE.Color("#5c3a40"),
  fogDensity: 0.009,
  ground: new THREE.Color("#6a4a41"), // lantern-lit paper
  groundOpacity: 0.78,
  water: new THREE.Color("#23406b"), // indigo holds after dark
  waterOpacity: 0.7,
  seigaiha: new THREE.Color("#d9a25e"), // gold-thread wave lines
  seigaihaIntensity: 0.35,
  station: new THREE.Color("#ffb35c"),
  stationAccentMix: 0.62,
  stationSealOpacity: 0.6,
  label: new THREE.Color("#f0dcb2"),
  lineIntensity: 0.95,
  trainIntensity: 1.0,
  bloomIntensity: 0.95,
  paperTint: new THREE.Color("#7c5342"),
  paperGrain: 0.16,
  waterEdge: new THREE.Color("#101f3d"),
  waterEdgeIntensity: 0.65,
  park: new THREE.Color("#4a4a33"),
  parkOpacity: 0.28,
  road: new THREE.Color("#e0a55e"), // lantern-gold streets
  roadIntensity: 0.5,
  landmark: new THREE.Color("#6e4436"),
  landmarkOpacity: 1.0,
  ferry: new THREE.Color("#c4a988"),
  ferryOpacity: 0.8,
  trainAmbient: 0.95,
  trainWindow: new THREE.Color("#ffd9a8"),
  windowIntensity: 0.85,
};

// Sound Transit hues, remapped toward woodblock pigment: the same
// identities a local reads instantly, but printed instead of lit — line
// colors DARKEN toward saturated ink (1 Line matcha green, 2 Line Prussian
// blue: Hokusai's own duo) so they hold on bright paper.
export const LINE_GLOW: Record<string, THREE.Color> = {};
const LINE_GLOW_DEFAULT = new THREE.Color("#2f6b4f");

export function lineGlow(lineId: string, feedColor: string): THREE.Color {
  let c = LINE_GLOW[lineId];
  if (!c) {
    c = new THREE.Color(feedColor);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    c.setHSL(hsl.h, Math.min(1, hsl.s * 0.95 + 0.2), Math.max(0.3, Math.min(0.46, hsl.l)));
    LINE_GLOW[lineId] = c;
  }
  return c ?? LINE_GLOW_DEFAULT;
}

const COLOR_KEYS = [
  "background",
  "bokashiTop",
  "fog",
  "ground",
  "water",
  "seigaiha",
  "station",
  "label",
  "paperTint",
  "waterEdge",
  "park",
  "road",
  "landmark",
  "ferry",
  "trainWindow",
] as const;
const SCALAR_KEYS = [
  "fogDensity",
  "seigaihaIntensity",
  "groundOpacity",
  "waterOpacity",
  "stationAccentMix",
  "stationSealOpacity",
  "lineIntensity",
  "trainIntensity",
  "bloomIntensity",
  "paperGrain",
  "waterEdgeIntensity",
  "parkOpacity",
  "roadIntensity",
  "landmarkOpacity",
  "ferryOpacity",
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
