// Points of interest near spawn, found by scanning the deterministic heightfield
// offline (same technique as the spawn offset in config.ts). Heights are sampled
// live at mount so these stay correct if the geology is retuned — only re-scan if
// a location stops making sense (e.g. a waterfall cliff stops being a cliff).

export interface WaterfallSite {
  x: number;
  z: number;
  /** Unit XZ direction from the cliff top toward the sea it falls into. */
  dirX: number;
  dirZ: number;
}

export const POI = {
  /** Fjord cliffs with ~400 m sheer drops into the sea. */
  waterfalls: [
    { x: -100, z: 220, dirX: 0, dirZ: 1 },
    { x: -1060, z: -1260, dirX: -0.5, dirZ: 0.866 },
    { x: 460, z: -1340, dirX: 0.5, dirZ: -0.866 },
  ] as WaterfallSite[],

  /** Open water, ~840 m deep — the leviathan pod's range. */
  leviathanPool: { x: 4000, z: -400, radius: 280 },

  /** Flat glacial bench (~435 m, ice-covered) — the glassbear amble. */
  bearRidge: { x: 100, z: -1340 },

  /** Highest summit near spawn (~534 m) — the stormwing gyre. */
  eaglePeak: { x: -200, z: -140, summit: 534 },
} as const;
