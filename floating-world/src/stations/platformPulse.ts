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

export interface PlatformSite {
  x: number;
  z: number;
  y: number; // surface entrance height — figures gather on the paper, not underground
}

// Filled ONCE by Stations.tsx (index-aligned with PULSE); read once by
// PlatformLife.tsx to lay out its mote pool.
export const PLATFORM_SITES: PlatformSite[] = [];

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
