// Shared GLSL for the dive incision (see map/paperCut.ts for the idea and
// the pure layout/signal half). Include NOISE_GLSL before either chunk —
// the deckle and the fibers are wcNoise.
//
// Two tiers:
//   PAPER_CUT_GLSL     — the `uCut` uniform + the deckled edge + `cutKeep()`,
//                        the one-line alpha carve for anything stamped ON the
//                        sheet (roads, parks, the water block, seals, the
//                        street life). Every carved material binds `uCut` to
//                        the SAME shared Vector3 (PAPER_CUT_VEC), so the one
//                        per-frame write in PaperCut.tsx drives them all.
//   PAPER_CUT_SURFACE_GLSL — GroundPlane's full treatment on top of that:
//                        `cutSurface()` carves the hole, pools sumi ink into
//                        the paper around the cut, and pales the fringe of
//                        exposed washi fibers hanging into the opening.
//
// Both early-out to zero cost while no dive is held (uCut.z eases to 0).

import {
  CUT_SURFACE_R,
  CUT_SURFACE_AMP,
  CUT_INK_W,
} from "./paperCut";

export const PAPER_CUT_GLSL = /* glsl */ `
  uniform vec3 uCut; // xy = dived hall's world XZ, z = eased cut strength 0..1

  // The aperture blossoms open with the eased strength (smoothstepped so the
  // tear starts gently and settles gently).
  float cutOpen() {
    float s = clamp(uCut.z, 0.0, 1.0);
    return s * s * (3.0 - 2.0 * s);
  }

  // Deckled torn-edge radius at this fragment's bearing from the cut center.
  // Angular noise is sampled ON the unit circle (never on the raw angle) so
  // the edge closes seamlessly at ±π: broad lobes shape the tear, a fine
  // nibble gives the paper tooth. The seed de-correlates the sheets so no
  // two tears in the stack line up.
  // NaN-safe bearing: never normalize() (a zero-length vector would put NaN
  // into the frame, and one NaN pixel through the bloom chain paints big
  // black blocks on the real-GPU family SwiftShader can't reproduce).
  vec2 cutDir(vec2 d) {
    return d / max(length(d), 1e-3);
  }
  float cutEdgeR(vec2 d, float baseR, float ampK, float seed) {
    vec2 c = cutDir(d);
    float lobes = wcNoise(c * 2.7 + seed) - 0.5;
    float nib = wcNoise(c * 9.0 + seed * 3.1) - 0.5;
    return baseR * cutOpen() * (1.0 + ampK * (1.7 * lobes + 0.6 * nib));
  }

  // Alpha keep-factor for pigment stamped ON the sheet: 1 clear of the cut,
  // 0 inside it — print carved away with the paper it was printed on.
  float cutKeep(vec2 world) {
    if (uCut.z < 0.004) return 1.0;
    vec2 d = world - uCut.xy;
    float er = cutEdgeR(d, ${CUT_SURFACE_R.toFixed(3)}, ${CUT_SURFACE_AMP.toFixed(3)}, 4.7);
    return smoothstep(er - 0.012, er + 0.012, length(d));
  }
`;

export const PAPER_CUT_SURFACE_GLSL = /* glsl */ `
  // GroundPlane's full incision: returns the alpha keep-factor and tints
  // the color in place — sumi pooled into the sheet around the cut, and the
  // pale heart of the torn washi where its fibers hang into the opening.
  // Ink is pigment (darkens, never lightens) and the fiber pale stays under
  // the bright-paper bloom line.
  float cutSurface(vec2 world, inout vec3 color) {
    if (uCut.z < 0.004) return 1.0;
    vec2 d = world - uCut.xy;
    float r = length(d);
    float er = cutEdgeR(d, ${CUT_SURFACE_R.toFixed(3)}, ${CUT_SURFACE_AMP.toFixed(3)}, 4.7);
    if (r > er + ${CUT_INK_W.toFixed(3)}) return 1.0; // clear of cut and ink both
    // Dark ink drunk into the paper around the cut — uneven, pooled, fading
    // out over the ink ring's width like a brush loaded too wet.
    float ink = (1.0 - smoothstep(er, er + ${CUT_INK_W.toFixed(3)}, r))
      * (0.45 + 0.55 * wcNoise(d * 6.5 + 2.2));
    // Exposed washi fibers: sparse strands of the sheet's unsized heart
    // reaching into the opening, each bearing its own length.
    vec2 c = cutDir(d);
    float fib = wcNoise(c * 48.0 + 9.1);
    float reach = 0.015 + 0.08 * fib * fib;
    float strand = smoothstep(er - reach, er - reach * 0.15, r) * smoothstep(0.30, 0.72, fib);
    float inside = 1.0 - smoothstep(er - 0.006, er + 0.006, r);
    color = mix(color, vec3(0.13, 0.11, 0.10), cutOpen() * ink * (1.0 - inside) * 0.6);
    // The fiber pale is a LIFT of the local paper tone (never a fixed white):
    // cream teeth on the day sheet, a dim warm fringe on the lantern print —
    // clamped under the bright-paper bloom line either way.
    color = mix(color, min(color * 1.55 + vec3(0.05), vec3(0.94)), inside * strand);
    return mix(1.0, strand * 0.92, inside);
  }
`;
