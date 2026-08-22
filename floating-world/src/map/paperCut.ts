// The incision. Diving into an underground hall used to read the tunnel
// through the translucent sheet; now the dive CUTS the print: an irregular
// deckled aperture tears open over the hall — exposed washi fibers fringing
// the torn edge, sumi ink drunk into the paper around the cut — and a short
// stack of paper sheets steps down inside it, sliding past each other in
// parallax, so the hall sits at the bottom of something carved beneath the
// print rather than merely rendered below a plane.
//
// This module is the pure half: the one eased cut signal every carved layer
// reads (palette-by-reference — materials hold PAPER_CUT_VEC itself), and
// the sheet-stack layout the PaperCut component instances from. Node-safe,
// no three/react imports beyond the math class; vitest-covered
// (__tests__/paperCut.test.ts).

import { Vector3 } from "three";
import { CONFIG } from "../world/config";

// ---------------------------------------------------------------------------
// Geometry of the cut. Everything is derived so the aperture always clears
// the hall's ring wall (HallShells WALL_RADIUS_K × the seal radius) — a cut
// that landed ON the lamplit wall would read as paper shearing through the
// room it exists to reveal.

/** The hall ring wall's radius (km) — HallShells' WALL_RADIUS_K contract. */
export const HALL_WALL_R = CONFIG.station.sealRadiusKm * 3.3;

/** Fully-open surface aperture radius (km), before the deckle wobbles it. */
export const CUT_SURFACE_R = 0.98;
/** Surface deckle amplitude (relative): the torn edge wanders ±ampK·baseR·0.85. */
export const CUT_SURFACE_AMP = 0.12;
/** Ink ring width (km): how far the pooled sumi bleeds out from the cut. */
export const CUT_INK_W = 0.26;

/** Sheets in the parallax stack (between the surface and the tunnel roof). */
export const SHEET_COUNT = 4;
/** Sheet deckle amplitude — a hair tamer than the surface tear. */
export const SHEET_AMP = 0.09;
/** How far a sheet's paper body reaches before fading out (km). Kept close
 *  to the surface tear: the sheets exist to wall the incision, and a wide
 *  skirt read as a dark stain through the translucent ground from the drift. */
export const SHEET_BODY_R = 1.2;
/** Where the fade has fully dissolved the sheet (km). */
export const SHEET_FADE_R = 1.7;

export interface CutSheet {
  y: number; // sheet depth (km, negative — between the surface and the tunnel)
  radius: number; // fully-open aperture radius (km)
  seed: number; // deckle seed — every tear its own shape
  shade: number; // paper luminance multiplier (deeper = darker in the pit)
}

/**
 * The stack, deepest first (instances draw in index order, and the painter's
 * order needs shallow sheets to land over deep ones). Depths run from just
 * under the surface down to a hair above the hall ring wall's top edge
 * y-range... specifically between the wall's top (−0.04) and the tunnel roof
 * (−0.22), never touching either; apertures terrace inward with depth but the
 * deepest still clears the ring wall even at the deckle's deepest bite.
 */
export function buildCutSheets(): CutSheet[] {
  const wallTop = -0.04; // HallShells WALL_TOP_Y — the paper's underside
  const tunnelY = CONFIG.ribbon.y.tunnel;
  const sheets: CutSheet[] = [];
  for (let i = 0; i < SHEET_COUNT; i++) {
    const f = (i + 1) / (SHEET_COUNT + 1); // 0..1, exclusive of both faces
    sheets.push({
      y: wallTop + (tunnelY - wallTop) * f,
      // Terrace: the top sheet opens a bit inside the surface tear, each
      // deeper sheet a step further in — the stepped cross-section of a
      // carved paper block.
      radius: CUT_SURFACE_R * (0.92 - 0.22 * f),
      seed: 11.3 + i * 7.7,
      shade: 1.0 - 0.34 * f, // the pit darkens with depth (gently — still paper)
    });
  }
  sheets.reverse(); // deepest first
  return sheets;
}

/** The deckle's deepest possible bite into an aperture of this base radius
 *  (mirrors the GLSL: radius × (1 − amp·(1.7·0.5 + 0.6·0.5))). */
export function minDeckledRadius(baseR: number, amp: number): number {
  return baseR * (1 - amp * (1.7 * 0.5 + 0.6 * 0.5));
}

// ---------------------------------------------------------------------------
// The live signal. ONE Vector3 shared by reference into every carved
// material's `uCut` uniform (the palette-by-reference move): xy is the dived
// hall's world XZ, z the eased 0..1 cut strength. PaperCut.tsx is the single
// writer, once per frame; everyone else only ever reads.

export const PAPER_CUT_VEC = new Vector3(0, 0, 0);

/** Ease rate (per second) — matches the Buildings skylight so the tear, the
 *  fading town and the camera's glide breathe together. */
export const CUT_EASE_RATE = 1.6;

/**
 * Advance the eased strength toward open (a dive holds) or closed. Pure —
 * PaperCut.tsx feeds it CLOCK.dt and writes the result into PAPER_CUT_VEC.
 */
export function easeCutStrength(current: number, diving: boolean, dt: number): number {
  return diving ? Math.min(1, current + dt * CUT_EASE_RATE) : Math.max(0, current - dt * CUT_EASE_RATE);
}
