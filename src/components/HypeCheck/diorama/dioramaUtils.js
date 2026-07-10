// Pure logic for the "Enter the room" diorama mode. Everything here is
// renderer-agnostic on purpose: no three.js imports, so the main bundle
// stays light and jsdom can unit-test the math that drives the scene.

import { OVERWHELM } from "../constants";

// ——— Capability check ———

// jsdom (and some very old devices) return null from getContext, which
// is exactly the signal we want: no WebGL → fall back to explore mode.
export const supportsWebGL = () => {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
};

// ——— Scene layout ———

// The figure plane is ~2 world units tall, centered a little above the
// floor; everything else is placed relative to it.
export const FIGURE = {
  WIDTH: 2 * (445 / 465),
  HEIGHT: 2,
  CENTER_Y: 1.02,
};

export const CAMERA = {
  // Zoomed all the way in ends framed on the figure, like the meme crop.
  MIN_DISTANCE: 2.4,
  MAX_DISTANCE: 9,
  START: [3.2, 2.1, 4.6],
  TARGET: [0, FIGURE.CENTER_Y, 0],
  // Never under the floor, never straight overhead.
  MIN_POLAR: 0.35,
  MAX_POLAR: Math.PI / 2 - 0.06,
};

const GOLDEN_ANGLE = 2.399963229728653;

// Deterministic 3D placement for each term: a loose ring around the
// chair at varying radius, height, and size, so orbiting the camera
// makes words pass between the lens and the figure. Pure function of
// index — no randomness, so renders and tests are reproducible.
export const wordPlacementFor = (index) => {
  const angle = index * GOLDEN_ANGLE;
  const radius = 2.3 + (index % 5) * 0.55;
  const height = 0.45 + ((index * 7) % 11) * 0.21;
  return {
    angle,
    radius,
    height,
    fontSize: 0.17 + ((index * 3) % 4) * 0.035,
    // Alternate direction and vary pace so the cloud reads alive, not
    // like a carousel.
    speedFactor: (index % 2 === 0 ? 1 : -1) * (0.6 + (index % 3) * 0.3),
    bobPhase: (index % 6) * (Math.PI / 3),
  };
};

export const wordPositionAt = (placement, elapsed, orbitSpeed) => {
  const angle = placement.angle + elapsed * orbitSpeed * placement.speedFactor;
  const bob = Math.sin(elapsed * 0.6 + placement.bobPhase) * 0.08;
  return [
    Math.cos(angle) * placement.radius,
    placement.height + bob,
    Math.sin(angle) * placement.radius,
  ];
};

// ——— Overwhelm-driven atmosphere ———

const norm = (overwhelm) =>
  Math.min(1, Math.max(0, overwhelm / OVERWHELM.MAX));

// Exponential fog: a thin haze when calm, closing in as the meter climbs.
export const fogDensityFor = (overwhelm) => 0.028 + norm(overwhelm) * 0.075;

// Base angular speed (rad/s) for the word orbit, scaled per word by
// its speedFactor.
export const orbitSpeedFor = (overwhelm) => 0.05 + norm(overwhelm) * 0.22;

// Camera shake only kicks in at overload, ramping from 0 to full.
export const shakeAmplitudeFor = (overwhelm) => {
  if (overwhelm < OVERWHELM.OVERLOAD_AT) return 0;
  const t =
    (overwhelm - OVERWHELM.OVERLOAD_AT) /
    (OVERWHELM.MAX - OVERWHELM.OVERLOAD_AT);
  return 0.035 * t;
};

// How far word colors are pulled toward gray as the room overwhelms.
export const desaturationFor = (overwhelm) => norm(overwhelm) * 0.55;

// ——— Color math (plain hex, no THREE.Color) ———

const hexToRgb = (hex) => {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const rgbToHex = ([r, g, b]) =>
  `#${[r, g, b]
    .map((c) => Math.round(c).toString(16).padStart(2, "0"))
    .join("")}`;

export const mixHex = (from, to, t) => {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return rgbToHex(a.map((c, i) => c + (b[i] - c) * t));
};

// Matches the hype-* Tailwind palette.
export const CATEGORY_COLORS = {
  alive: "#4ADE80",
  dead: "#F87171",
  fake: "#A78BFA",
};

const UNANSWERED_COLOR = "#F5F5F5";
const GRAY = "#8A8A8A";

// Full look for a floating word: unanswered words are bright white and
// clickable; answered ones dim and tint by category (green alive / red
// dead / purple fake). High overwhelm desaturates everything.
export const wordAppearanceFor = (term, answer, overwhelm) => {
  const base = answer ? CATEGORY_COLORS[term.category] : UNANSWERED_COLOR;
  return {
    color: mixHex(base, GRAY, desaturationFor(overwhelm)),
    opacity: answer ? 0.45 : 1,
    interactive: !answer,
  };
};

export const FIGURE_STAGE_SRCS = [1, 2, 3, 4, 5, 6].map(
  (stage) => `/images/hype-check/figure-stage-${stage}.jpg`
);
