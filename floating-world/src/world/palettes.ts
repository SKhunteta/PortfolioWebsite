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
  // The exposed strand: wet-sand/mudflat pigment revealed landward of the
  // water's current reach, up to the historical high-tide mark — a
  // Hiroshige tideline motif driven by world/tide.ts's real astronomical
  // level (map/Water.tsx EDGE_FRAG).
  tideFlat: THREE.Color;
  tideFlatIntensity: number;
  park: THREE.Color;
  parkOpacity: number;
  road: THREE.Color; // dry-brush sumi ink by day, lantern gold by night
  roadIntensity: number;
  traffic: THREE.Color; // warm headlamp/tail color for the street cars (map/Cars.tsx)
  trafficIntensity: number; // car body/opacity floor; real Seattle hour scales the fleet
  landmark: THREE.Color; // hand-inked silhouettes (Needle, skyline, Rainier)
  landmarkOpacity: number;
  tree: THREE.Color; // the evergreen carpet — conifer silhouettes on the land
  treeOpacity: number;
  building: THREE.Color; // the woodblock town fabric lining the streets
  buildingOpacity: number;
  ferry: THREE.Color; // WSF hulls — pale washi against the Prussian Sound
  ferryOpacity: number;
  tline: THREE.Color; // the little Tacoma T Line streetcar body (map/TacomaLink.tsx)
  tlineWave: THREE.Color; // its teal/green identity wave over the navy skirt
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
  background: new THREE.Color("#e8d7ac"), // washi cream — warm, NOT white (nudged a hair greyer toward the poster)
  bokashiTop: new THREE.Color("#2b4a77"), // ai-blue wiped band
  fog: new THREE.Color("#efe5c8"), // kasumi — mist paler than the paper, a touch cooler for depth
  fogDensity: 0.0075, // deeper aerial perspective — the poster's land recedes into mist
  ground: new THREE.Color("#b6bd8b"), // sage washi — evergreen land, greyer/muteder than the old yellow-sage
  groundOpacity: 0.7, // opaque enough that land reads green over the cream sky base; tunnels still read
  water: new THREE.Color("#23507c"), // Prussian blue (ai) — nudged toward the poster's muted slate-prussian
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
  paperTint: new THREE.Color("#b1ba87"), // moss-gold wash — forested-terrain mottle, greyer toward the poster
  paperGrain: 0.24,
  waterEdge: new THREE.Color("#16355e"), // blue pigment pooling
  waterEdgeIntensity: 0.8,
  tideFlat: new THREE.Color("#b89468"), // wet sand — warm ochre strand exposed at ebb
  tideFlatIntensity: 0.6,
  park: new THREE.Color("#86a05f"), // moss wash — the Emerald City reads green, a touch greyer/cooler
  parkOpacity: 0.5,
  road: new THREE.Color("#4c3a28"), // sumi ink strokes
  roadIntensity: 0.55,
  traffic: new THREE.Color("#7a5230"), // warm ink-ochre flow over the sumi streets
  trafficIntensity: 0.5,
  landmark: new THREE.Color("#8a5a40"), // warm sepia ink massing
  landmarkOpacity: 1.0,
  tree: new THREE.Color("#4f6347"), // muted evergreen — the forested land
  treeOpacity: 0.92,
  building: new THREE.Color("#c2a87e"), // warm pale taupe town — reads light, not a black dot
  buildingOpacity: 0.95,
  ferry: new THREE.Color("#f0e8d2"),
  ferryOpacity: 0.95,
  tline: new THREE.Color("#eae3cf"), // pale washi streetcar body, a hair cooler than the ferries
  tlineWave: new THREE.Color("#2f8f86"), // Sound Transit teal wave, held under the bloom ceiling
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
  tideFlat: new THREE.Color("#5a4634"), // damp sand, dim under lantern light
  tideFlatIntensity: 0.4,
  park: new THREE.Color("#4a4a33"),
  parkOpacity: 0.28,
  road: new THREE.Color("#e0a55e"), // lantern-gold streets
  roadIntensity: 0.5,
  traffic: new THREE.Color("#ecac5e"), // lantern-gold headlamp flow after dark
  trafficIntensity: 0.55,
  landmark: new THREE.Color("#6e4436"),
  landmarkOpacity: 1.0,
  tree: new THREE.Color("#33382c"), // forests go to dark ink after dark
  treeOpacity: 0.88,
  building: new THREE.Color("#7c5942"), // lantern-warm town massing — dark but never pure black
  buildingOpacity: 0.9,
  ferry: new THREE.Color("#c4a988"),
  ferryOpacity: 0.8,
  tline: new THREE.Color("#b39c7a"), // lantern-warm body after dark, kin to the ferry hull
  tlineWave: new THREE.Color("#2a6b66"), // deeper teal wave by lantern light
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
  "tideFlat",
  "park",
  "road",
  "traffic",
  "landmark",
  "tree",
  "building",
  "ferry",
  "tline",
  "tlineWave",
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
  "tideFlatIntensity",
  "parkOpacity",
  "roadIntensity",
  "trafficIntensity",
  "landmarkOpacity",
  "treeOpacity",
  "buildingOpacity",
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
