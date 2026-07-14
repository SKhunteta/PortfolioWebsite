// The art of the underground halls, as data. Each of the eight submerged
// stations carries a real signature artwork (STart, Sound Transit's public-art
// program); this registry names WHICH procedural motif paints it and the one
// extra pigment that artwork needs beyond the station's identity accent (the
// accent — colorA — is the researched signature color in station-identity.json;
// colorB is the second hue each piece can't be told without). UndergroundLife
// draws the motif as a glowing fresco on the platform floor, seen up through
// the translucent paper.
//
// Kept OUT of station-identity.json on purpose: the canon forbids restyling the
// researched identity data, and this is a rendering choice (which shader, which
// second color), not a fact about the station. Keyed by normalized display name
// like identity.ts / lore.ts, and looked up alias-aware through names.ts.

import { byStationName } from "./names";

// Motif ids must match the aMotif branch values in motifsGlsl.ts (MOTIF_*).
export enum Motif {
  SeaForms = 0, // Beacon Hill — "Space Forms" · Dan Corson: drifting sea-creature light
  JetKiss = 1, // Capitol Hill — "Jet Kiss" · Mike Ross: two jets nose-to-nose
  GeoGlyphs = 2, // UW — "Subterraneum" · Leo Saul Berk: backlit geologic glyph strata
  LedGlyphs = 3, // Symphony — "Electric Lascaux" · Robert Teeple: red LED cave-glyphs
  TerracottaVines = 4, // Westlake — Jack Mackie: carved terra-cotta vines & leaves
  ArtifactClocks = 5, // Pioneer Square — Ericson & Ziegler: artifact clocks in a granite vault
  GoldPyramid = 6, // Roosevelt — "Building Blocks" · R & R Studios: gold stepped pyramid
  LightTubes = 7, // U District — Lead Pencil Studio: orange & blue light tubes, 85 ft down
}

export interface MotifDescriptor {
  motif: Motif;
  /** The artwork's second pigment (accent from identity.ts is the first). */
  colorB: string;
  /** Count of repeated elements (glyphs, tubes, vines…) — motif-specific. */
  density: number;
  /** Animation-rate multiplier on the shared clock. */
  speed: number;
}

// Keyed by normalized station name (names.ts normStationName). Only the eight
// underground halls appear here; surface/elevated stops have no fresco.
export const MOTIFS: Record<string, MotifDescriptor> = {
  beaconhill: { motif: Motif.SeaForms, colorB: "#7fe3d6", density: 5, speed: 0.35 },
  capitolhill: { motif: Motif.JetKiss, colorB: "#f2c14e", density: 2, speed: 0.5 },
  universityofwashington: { motif: Motif.GeoGlyphs, colorB: "#d7f5ef", density: 6, speed: 0.4 },
  symphony: { motif: Motif.LedGlyphs, colorB: "#ff6a4a", density: 7, speed: 1.4 },
  westlake: { motif: Motif.TerracottaVines, colorB: "#8ba05a", density: 5, speed: 0.28 },
  pioneersquare: { motif: Motif.ArtifactClocks, colorB: "#9a9088", density: 3, speed: 0.6 },
  roosevelt: { motif: Motif.GoldPyramid, colorB: "#fff0c0", density: 4, speed: 0.32 },
  udistrict: { motif: Motif.LightTubes, colorB: "#2f6fb0", density: 7, speed: 0.55 },
};

/** Motif descriptor for a station by display name, or null if it has none
 *  (every non-underground stop). Alias-aware, like identityForName. */
export function motifForName(name: string): MotifDescriptor | null {
  return byStationName(MOTIFS, name);
}
