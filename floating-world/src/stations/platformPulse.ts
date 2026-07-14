// Boarding-life registry. Stations.tsx is the single owner of dwell state —
// it already decides, every frame, how strongly each stop is hosting a train
// (slot.pulse, 0..1, rising on arrival and decaying as the train pulls away).
// It publishes that here so stations/PlatformLife.tsx can scatter a little
// crowd of boarding figures at each platform without recomputing the
// train-proximity scan a second time.
//
// Same imperative cross-component contract as the TRAIN_MODEL registry: the
// hot path writes a plain array, React renders nothing per frame, and the
// life is sourced from the very trains you can watch — so it is automatically
// honest in live, simulated, AND resting modes (no train, no crowd).

import type * as THREE from "three";

export interface PlatformSite {
  x: number;
  z: number;
  y: number; // surface entrance height — figures gather on the paper, not underground
}

// Filled ONCE by Stations.tsx (index-aligned with PULSE); read once by
// PlatformLife.tsx to lay out its mote pool.
export const PLATFORM_SITES: PlatformSite[] = [];

// The underground halls, published for stations/UndergroundLife.tsx: the DEEP
// platform (rail-height floor) of each submerged station, its identity accent,
// and the researched art motif that paints it. Each carries a `pulseIndex`
// back into PLATFORM_PULSE (its owning station's slot index) so the submerged
// crowd and the art fresco read the very SAME dwell pulse the orb writes — no
// second train-proximity scan, automatically honest in live/simulated/resting.
export interface UndergroundSite {
  id: string; // station id — lets the camera resolve a dive target's floor by id
  pulseIndex: number; // index into PLATFORM_PULSE.value (the station's slot index)
  x: number;
  z: number;
  y: number; // platform-floor depth (rail height) — figures stand DOWN here
  accent: THREE.Color; // station identity accent (shared immutable instance)
  motif: number; // Motif enum value, or -1 for a submerged stop with no motif
  colorB: string; // the artwork's second pigment (hex)
  density: number; // repeated-element count for the motif
  speed: number; // animation-rate multiplier for the motif
  seed: number; // deterministic per-station seed
}

// Filled ONCE by Stations.tsx; read once by UndergroundLife.tsx to lay out its
// crowd + fresco pools.
export const UNDERGROUND_SITES: UndergroundSite[] = [];

// Written EVERY frame by Stations.tsx, read every frame by PlatformLife.tsx.
// A plain object so the reassigned Float32Array stays a live binding for
// importers (a bare `export let` would too, but this keeps the two fields
// together and the `ready` flag explicit).
export const PLATFORM_PULSE: { value: Float32Array; ready: boolean } = {
  value: new Float32Array(0),
  ready: false,
};

/** Stations.tsx calls this once, after it has built its slot list. */
export function initPlatformSites(sites: PlatformSite[]) {
  PLATFORM_SITES.length = 0;
  PLATFORM_SITES.push(...sites);
  PLATFORM_PULSE.value = new Float32Array(sites.length);
  PLATFORM_PULSE.ready = true;
}

/** Stations.tsx calls this once, after publishing the platform sites. */
export function initUndergroundSites(sites: UndergroundSite[]) {
  UNDERGROUND_SITES.length = 0;
  UNDERGROUND_SITES.push(...sites);
}

/** The underground hall with this station id, or undefined. Linear scan over the
 *  eight halls — cheap, called only when the camera engages/frames a dive. */
export function undergroundSiteById(id: string): UndergroundSite | undefined {
  return UNDERGROUND_SITES.find((s) => s.id === id);
}
