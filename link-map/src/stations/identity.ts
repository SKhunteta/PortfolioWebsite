// Each station's real-world face, researched from the built architecture and
// the STart public-art program: the signature color of its materials or
// artwork, how the platform actually sits (elevated deck, underground hall,
// street-level tracks), one line describing what the place looks like, and
// the artwork credit. Hand-authored in src/data/station-identity.json, keyed
// by normalized station name (see names.ts).
//
// The scene reads `accent` (per-orb tint, watercolor seal) and the panel
// reads the rest. Structural HEIGHT in the scene comes from the grade
// annotations via railHeightAt — never from `structure` — so a station can
// never float above or sink below its own track.

import * as THREE from "three";
import identityJson from "../data/station-identity.json";
import { byStationName } from "./names";

export interface StationIdentity {
  /** How the real platform sits — panel copy, not scene geometry. */
  structure: "elevated" | "underground" | "at-grade";
  /** Signature hex from the station's built materials or signature art. */
  accent: string;
  /** One quiet sentence: what the station actually looks like. */
  look: string;
  /** Artwork credit, e.g. "“Jet Kiss” · Mike Ross". */
  art?: string;
}

const IDENTITY = identityJson as Record<string, StationIdentity>;

/** Identity for a station by display name, or null if we have none. */
export function identityForName(name: string): StationIdentity | null {
  return byStationName(IDENTITY, name);
}

// Accent THREE.Colors are shared immutable instances — the hot path tints
// orbs every frame and must not allocate or mutate these.
const accentCache = new Map<string, THREE.Color>();
const FALLBACK_ACCENT = new THREE.Color("#8fb8d8"); // the old uniform station blue

export function accentForName(name: string): THREE.Color {
  const id = identityForName(name);
  if (!id) return FALLBACK_ACCENT;
  let c = accentCache.get(id.accent);
  if (!c) {
    c = new THREE.Color(id.accent);
    accentCache.set(id.accent, c);
  }
  return c;
}
