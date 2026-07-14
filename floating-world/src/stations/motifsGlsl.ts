// The eight underground halls, painted in light. Each function draws one
// station's real signature artwork as a procedural glowing fresco in the local
// disc of its fresco quad (vLocal in [-1,1], the quad edge at radius 1), keyed
// to the shared world clock (t) and its station's live dwell pulse. They return
//   vec2(intensity, mixB)
// where intensity is the additive glow (may climb past 1.0 to catch bloom on a
// pulse peak — a train arriving) and mixB selects between the station's accent
// (0, colorA from station-identity.json) and the artwork's second pigment
// (1, colorB from motifs.ts). The caller multiplies by a soft rim falloff and
// the fog factor, so motifs need only fill the disc.
//
// Woodblock rule, not photo rule: these are painterly reads of the pieces
// (Beacon Hill's drifting sea-forms, Capitol Hill's kissing jets, UW's geologic
// strata, Symphony's blinking cave-glyphs, Westlake's terra-cotta vines,
// Pioneer Square's clocks in the granite vault, Roosevelt's gold ziggurat,
// U District's light tubes), NOT reproductions. Deterministic: every "random"
// is a hash of an element index + the per-instance seed, so reloads are
// identical (the scene's determinism rule). GLSL ES 1.0-safe — constant loop
// bounds with a density gate inside, no dynamic array indexing.

// Motif branch ids — MUST match the Motif enum in motifs.ts.
export const MOTIF_IDS = {
  SeaForms: 0,
  JetKiss: 1,
  GeoGlyphs: 2,
  LedGlyphs: 3,
  TerracottaVines: 4,
  ArtifactClocks: 5,
  GoldPyramid: 6,
  LightTubes: 7,
} as const;

export const MOTIFS_GLSL = /* glsl */ `
  // --- shared helpers -------------------------------------------------------
  float mHash(float n) { return fract(sin(n * 127.1) * 43758.5453123); }
  float sdSeg(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }

  // --- Beacon Hill · "Space Forms" (Dan Corson) -----------------------------
  // Bioluminescent sea-creatures drifting under a cobalt ceiling: soft
  // metaballs on slow orbits, each trailing a tentacle wisp; teal-white cores.
  vec2 motifSeaForms(vec2 p, float t, float seed, float pulse, float density) {
    float glow = 0.0, hi = 0.0;
    for (int i = 0; i < 6; i++) {
      if (float(i) >= density) continue;
      float fi = float(i);
      float ph = seed * 3.0 + fi * 1.7;
      vec2 c = vec2(sin(t * 0.6 + ph) * 0.5, cos(t * 0.5 + ph * 1.3) * 0.45);
      float r = 0.13 + 0.06 * mHash(ph);
      float d2 = dot(p - c, p - c);
      glow += exp(-d2 / (r * r)) * (0.7 + 0.5 * pulse);
      hi = max(hi, exp(-d2 / (r * r * 0.3)));
      vec2 tail = c + vec2(sin(t + ph) * 0.2, -0.3 - 0.1 * sin(t * 2.0 + ph));
      glow += 0.25 * smoothstep(0.05, 0.0, sdSeg(p, c, tail)) * (0.5 + 0.5 * pulse);
    }
    return vec2(min(glow, 1.6), clamp(hi, 0.0, 1.0));
  }

  // --- Capitol Hill · "Jet Kiss" (Mike Ross) --------------------------------
  // Two swept jets nose-to-nose over the deep platform; a gold kiss-spark
  // flares at the meeting point and blooms when a train pulls in.
  vec2 motifJetKiss(vec2 p, float t, float seed, float pulse, float density) {
    float approach = 0.06 * sin(t * 0.8 + seed);
    vec2 bL = vec2(-0.07 - approach, 0.05), bR = vec2(0.07 + approach, -0.05);
    float jets = smoothstep(0.06, 0.0, sdSeg(p, vec2(-0.78, 0.14), bL));
    jets += smoothstep(0.06, 0.0, sdSeg(p, vec2(0.78, -0.14), bR));
    // swept wings: short strokes across each fuselage midpoint
    vec2 mL = vec2(-0.42, 0.09), mR = vec2(0.42, -0.09);
    jets += 0.6 * smoothstep(0.045, 0.0, sdSeg(p, mL + vec2(0.0, 0.08), mL - vec2(0.06, -0.06)));
    jets += 0.6 * smoothstep(0.045, 0.0, sdSeg(p, mR + vec2(0.0, -0.08), mR - vec2(-0.06, 0.06)));
    float spark = exp(-dot(p, p) / 0.012) * (0.6 + 1.6 * pulse);
    return vec2(min(clamp(jets, 0.0, 1.0) * 0.9 + spark, 2.4), clamp(spark, 0.0, 1.0));
  }

  // --- U of Washington · "Subterraneum" (Leo Saul Berk) ---------------------
  // Backlit geologic glyphs 100 ft down: tilted strata bands with lit glyph
  // marks that flicker on as the borehole light finds them.
  vec2 motifGeoGlyphs(vec2 p, float t, float seed, float pulse, float density) {
    float g = 0.0, bright = 0.0;
    for (int i = 0; i < 7; i++) {
      if (float(i) >= density) continue;
      float fi = float(i);
      float slope = (mHash(fi + seed) - 0.5) * 0.25;
      float y = -0.82 + 1.64 * (fi + 0.5) / density;
      float line = abs(p.y - y - p.x * slope);
      g += smoothstep(0.03, 0.0, line) * (0.4 + 0.3 * mHash(fi * 2.0 + seed));
      float gx = (mHash(fi * 3.1 + seed) - 0.5) * 1.2;
      float blink = step(0.5, fract(t * 0.3 + mHash(fi + seed) * 3.0));
      float gd = length((p - vec2(gx, y + gx * slope)) * vec2(1.0, 3.0));
      float mark = smoothstep(0.07, 0.0, gd) * blink * (0.5 + 0.6 * pulse);
      g += mark; bright = max(bright, mark);
    }
    return vec2(min(g, 1.6), smoothstep(0.5, 1.0, bright));
  }

  // --- Symphony · "Electric Lascaux" (Robert Teeple) ------------------------
  // A field of red LED cave-glyphs blinking overhead — a fast, independent
  // twinkle across the grid, brightest when the platform is busy.
  vec2 motifLedGlyphs(vec2 p, float t, float seed, float pulse, float density) {
    vec2 gp = (p * 0.5 + 0.5) * density;
    vec2 cell = floor(gp);
    vec2 f = fract(gp) - 0.5;
    float id = cell.x + cell.y * density + seed * 13.0;
    float cross = max(
      smoothstep(0.12, 0.02, abs(f.x)) * step(abs(f.y), 0.34),
      smoothstep(0.12, 0.02, abs(f.y)) * step(abs(f.x), 0.34));
    float blink = step(0.55, fract(mHash(id) * 91.7 + t * 0.9));
    float disc = step(length(p), 1.0);
    float lit = cross * blink * disc * (0.6 + 0.8 * pulse);
    return vec2(min(lit * 1.4, 2.0), blink * 0.3);
  }

  // --- Westlake · carved terra-cotta (Jack Mackie) --------------------------
  // Art Deco vines and leaves rooting the park into the tunnel: sinuous
  // climbing tendrils in terracotta with green leaf-dabs.
  vec2 motifVines(vec2 p, float t, float seed, float pulse, float density) {
    float vine = 0.0, leaf = 0.0;
    for (int i = 0; i < 6; i++) {
      if (float(i) >= density) continue;
      float fi = float(i);
      float x0 = -0.8 + 1.6 * (fi + 0.5) / density;
      float sway = 0.12 * sin(p.y * 3.0 + t * 0.5 + fi) + 0.05 * sin(p.y * 7.0 + fi * 2.0);
      vine += smoothstep(0.025, 0.0, abs(p.x - x0 - sway)) * (0.5 + 0.2 * mHash(fi + seed));
      for (int j = 0; j < 3; j++) {
        float fy = -0.6 + 0.6 * float(j);
        vec2 lc = vec2(x0 + 0.12 * sin(fy * 3.0 + t * 0.5 + fi) + 0.06,
                       fy + 0.15 * mHash(fi * 3.0 + float(j)));
        leaf += smoothstep(0.09, 0.0, length((p - lc) * vec2(1.6, 1.0)));
      }
    }
    return vec2(min(vine * 0.8 + leaf * 0.7 * (0.6 + 0.5 * pulse), 1.5), clamp(leaf, 0.0, 1.0));
  }

  // --- Pioneer Square · artifact clocks (Ericson & Ziegler) -----------------
  // A tall granite vault, gray at the floor rising to pink, hung with old
  // clock faces whose hands turn slowly.
  vec2 motifClocks(vec2 p, float t, float seed, float pulse, float density) {
    float grad = clamp(p.y * 0.5 + 0.5, 0.0, 1.0);
    float glow = 0.12 * grad;
    float clock = 0.0;
    for (int i = 0; i < 3; i++) {
      if (float(i) >= density) continue;
      float fi = float(i);
      vec2 c = vec2((mHash(fi + seed) - 0.5) * 1.3, (mHash(fi * 2.0 + seed) - 0.5) * 1.2);
      float ring = smoothstep(0.02, 0.0, abs(length(p - c) - 0.18));
      float ang = t * (0.4 + 0.2 * fi) + fi;
      ring += smoothstep(0.02, 0.0, sdSeg(p, c, c + vec2(cos(ang), sin(ang)) * 0.15));
      glow += ring * (0.6 + 0.5 * pulse);
      clock += ring;
    }
    return vec2(min(glow, 1.4), clamp((1.0 - grad) * 0.5 - clock, 0.0, 1.0));
  }

  // --- Roosevelt · "Building Blocks" (R & R Studios) ------------------------
  // A gold stepped pyramid over the daylit descent: nested narrowing steps
  // with a climbing shimmer and a pale-gold apex.
  vec2 motifPyramid(vec2 p, float t, float seed, float pulse, float density) {
    float edge = 0.0;
    for (int i = 0; i < 6; i++) {
      if (float(i) >= density) continue;
      float fi = float(i);
      float frac = (fi + 0.5) / density;
      float y = -0.7 + 1.3 * frac;
      float halfw = 0.7 * (1.0 - frac);
      float top = smoothstep(0.02, 0.0, abs(p.y - (y + 0.06))) * step(abs(p.x), halfw);
      float side = smoothstep(0.02, 0.0, abs(abs(p.x) - halfw)) * step(abs(p.y - y), 0.06);
      edge += max(top, side) + step(abs(p.y - y), 0.06) * step(abs(p.x), halfw) * 0.12;
    }
    float shimmer = 0.7 + 0.3 * sin(t * 1.5 - p.y * 4.0);
    float apex = smoothstep(0.25, 0.0, length(p - vec2(0.0, 0.62)));
    return vec2(min(edge * shimmer * (0.6 + 0.5 * pulse), 1.6), clamp(apex, 0.0, 1.0));
  }

  // --- U District · light tubes (Lead Pencil Studio) ------------------------
  // Orange and blue light tubes tracing 85 ft down: alternating vertical bars
  // with a bright pip flowing upward through each.
  vec2 motifTubes(vec2 p, float t, float seed, float pulse, float density) {
    float g = (p.x * 0.5 + 0.5) * density;
    float idx = floor(g);
    float f = fract(g) - 0.5;
    float tube = smoothstep(0.28, 0.08, abs(f)) * step(length(p), 1.0);
    float flow = fract(p.y * 0.5 + 0.5 - t * 0.4 + mHash(idx + seed));
    float pip = smoothstep(0.12, 0.0, abs(flow - 0.5));
    float inten = tube * (0.45 + 0.3 * pip + 0.6 * pulse * pip);
    return vec2(min(inten * 1.4, 1.8), mod(idx, 2.0));
  }

  // --- dispatcher -----------------------------------------------------------
  vec2 motifSample(float motif, vec2 p, float t, float seed, float pulse, float density) {
    if (motif < 0.5)  return motifSeaForms(p, t, seed, pulse, density);
    if (motif < 1.5)  return motifJetKiss(p, t, seed, pulse, density);
    if (motif < 2.5)  return motifGeoGlyphs(p, t, seed, pulse, density);
    if (motif < 3.5)  return motifLedGlyphs(p, t, seed, pulse, density);
    if (motif < 4.5)  return motifVines(p, t, seed, pulse, density);
    if (motif < 5.5)  return motifClocks(p, t, seed, pulse, density);
    if (motif < 6.5)  return motifPyramid(p, t, seed, pulse, density);
    return motifTubes(p, t, seed, pulse, density);
  }
`;
