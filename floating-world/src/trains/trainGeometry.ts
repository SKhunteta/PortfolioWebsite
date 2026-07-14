// The toy S700: primitives only, no external assets. Unit-space geometries
// (instance matrices scale them to toy size) plus two shared canvas
// textures — livery and an emissive mask (separate canvases because
// premultiplied alpha would corrupt livery RGB under partial alpha).
//
// UVs are never edited: the shader derives texture regions from local
// position + normal (sides / front / roof / underside), which keeps the
// raked-nose vertex surgery trivial.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CONFIG } from "../world/config";

// --- geometries -------------------------------------------------------------

/** Cab section: unit box, nose raked back at the +X end (windshield slant)
 *  and pinched slightly narrower. Used at BOTH ends (Link LRVs are
 *  double-cabbed); the trailing cab is the same geometry yawed 180°. */
export function buildCabGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(1, 1, 1, 3, 1, 1);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const rake = CONFIG.train.model.noseRakeFrac;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    if (x > 0.49) {
      const y = pos.getY(i);
      // Slant the front face back from bumper to roof, round the shoulders in.
      pos.setX(i, 0.5 - rake * (y + 0.5) * 0.5);
      pos.setZ(i, pos.getZ(i) * 0.85);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/** Mid section: unit box with the pantograph (thin crossed boxes + contact
 *  bar) merged in above the roof. The shader paints anything above the
 *  roofline dark, so the pantograph needs no UV care. */
export function buildMidGeometry(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
  const armA = new THREE.BoxGeometry(0.22, 0.02, 0.02);
  armA.rotateZ(0.9);
  armA.translate(-0.04, 0.62, 0);
  const armB = new THREE.BoxGeometry(0.22, 0.02, 0.02);
  armB.rotateZ(-0.9);
  armB.translate(0.04, 0.62, 0);
  const bar = new THREE.BoxGeometry(0.03, 0.02, 0.3);
  bar.translate(0, 0.74, 0);
  const merged = mergeGeometries([body, armA, armB, bar], false)!;
  merged.computeVertexNormals();
  return merged;
}

// --- canvases ---------------------------------------------------------------
// Layout (256×128): side band occupies the top half (u 0..1, v 0..0.5 of the
// texture = canvas rows 64..127 flipped); bottom half splits into front
// (x 0..63), roof (64..127), dark (128..191) squares.

const W = 256;
const H = 128;

// Canvas y=0 is the top; THREE.CanvasTexture flips so texture v=0 is the
// canvas BOTTOM. Regions here are expressed in canvas pixels.
const SIDE = { x: 0, y: 0, w: 256, h: 64 }; // texture v 0.5..1
const FRONT = { x: 0, y: 64, w: 64, h: 64 };
const ROOF = { x: 64, y: 64, w: 64, h: 64 };
const DARK = { x: 128, y: 64, w: 64, h: 64 };

function windowRects(): { x: number; y: number; w: number; h: number }[] {
  // Glass panels between the pillars of the big glazing band, skipping the
  // door leaves at x 62-76 and 164-178.
  const rects = [];
  for (let x = 2; x < SIDE.w - 2; x += 34) {
    if ((x > 40 && x < 84) || (x > 142 && x < 186)) continue;
    rects.push({ x: SIDE.x + x, y: SIDE.y + 20, w: 26, h: 14 });
  }
  // door windows glow too
  rects.push({ x: SIDE.x + 65, y: SIDE.y + 20, w: 8, h: 14 });
  rects.push({ x: SIDE.x + 167, y: SIDE.y + 20, w: 8, h: 14 });
  return rects;
}

/** Rounded-rect path (arcTo — ES2021-safe, unlike ctx.roundRect). */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The Sound Transit logo mark: a blue badge with two white "sound" arcs. */
function drawStMark(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.fillStyle = ST_BLUE;
  roundedRect(ctx, x, y, s, s, s * 0.22);
  ctx.fill();
  ctx.strokeStyle = "#f4efe2";
  ctx.lineWidth = Math.max(1, s * 0.14);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(x + s * 0.34, y + s * 0.6, s * 0.26, -0.6, 1.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + s * 0.6, y + s * 0.4, s * 0.26, Math.PI - 0.6, Math.PI + 1.9);
  ctx.stroke();
  ctx.restore();
}

/** "SoundTransit" (Sound bold) + "Link" wordmarks, one set per section,
 *  matching the branding along the upper white band of a real Link LRV. */
function drawBrand(ctx: CanvasRenderingContext2D, x0: number, y0: number) {
  const s = 9;
  const cy = y0 + 11;
  ctx.textBaseline = "middle";
  // SoundTransit (left)
  const lx = x0 + 10;
  drawStMark(ctx, lx, y0 + 6, s);
  const tx = lx + s + 3;
  ctx.fillStyle = ST_BLUE;
  ctx.font = "bold 9px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText("Sound", tx, cy);
  const sw = ctx.measureText("Sound").width;
  ctx.font = "9px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText("Transit", tx + sw, cy);
  // Link (right)
  const rx = x0 + 196;
  drawStMark(ctx, rx, y0 + 6, s);
  ctx.fillStyle = ST_BLUE;
  ctx.font = "bold 9px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText("Link", rx + s + 3, cy);
}

// Sound Transit's identity kit, reprinted in woodblock pigment: sumi ink
// where the navy was, warm washi body, ST turquoise (aqua) crest over
// Prussian (ai) trough for the signature double wave, and the real
// SoundTransit / Link wordmarks in ST blue — the ink outline is what keeps
// the toy legible on bright paper.
const INK = "#2a2119";
const INK_DEEP = "#1a1410";
const WASHI = "#efe5cd";
const AI = "#2b4a77"; // Prussian blue — the lower wave
const AQUA = "#57b3ac"; // ST turquoise — the crest wave
const INDIGO = "#1f2f4d";
const GLASS = "#17130e";
const ST_BLUE = "#1f3a5f"; // SoundTransit / Link wordmarks + logo badge

/** The double wave along the lower body — ST turquoise crest over Prussian
 *  trough, washi showing between, riding on the indigo skirt (the Sound
 *  Transit signature, printed). */
function paintWave(ctx: CanvasRenderingContext2D, baseY: number, color: string, amp: number, lift: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, SIDE.y + SIDE.h);
  ctx.lineTo(SIDE.x + SIDE.w, SIDE.y + SIDE.h);
  ctx.lineTo(SIDE.x + SIDE.w, baseY);
  for (let x = SIDE.w; x >= 0; x -= 4) {
    const y = baseY - lift - amp * Math.sin((x / SIDE.w) * Math.PI * 5 + 0.6);
    ctx.lineTo(SIDE.x + x, y);
  }
  ctx.closePath();
  ctx.fill();
}

export function buildLiveryTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // --- side band (top->bottom): ink roofline, SoundTransit/Link wordmarks,
  //     BIG glass band, washi, turquoise-over-Prussian double wave, indigo
  //     skirt ---
  const grad = ctx.createLinearGradient(0, SIDE.y, 0, SIDE.y + SIDE.h);
  grad.addColorStop(0, "#d8cdb6"); // shoulder shading
  grad.addColorStop(0.2, WASHI);
  grad.addColorStop(0.8, "#e6dcc4");
  grad.addColorStop(1, "#cdbfa4");
  ctx.fillStyle = grad;
  ctx.fillRect(SIDE.x, SIDE.y, SIDE.w, SIDE.h);
  // sumi roofline cap
  ctx.fillStyle = INK;
  ctx.fillRect(SIDE.x, SIDE.y, SIDE.w, 5);
  // real SoundTransit + Link wordmarks along the upper white band
  drawBrand(ctx, SIDE.x, SIDE.y);
  // big glass band: near-continuous glazing with thin washi pillars + doors
  const GY = SIDE.y + 18; // glass top, below the wordmark band
  ctx.fillStyle = GLASS;
  ctx.fillRect(SIDE.x, GY, SIDE.w, 18);
  ctx.fillStyle = "#f2ead6";
  for (let x = 30; x < SIDE.w; x += 34) ctx.fillRect(SIDE.x + x, GY, 2, 18);
  ctx.fillStyle = "#bfae8e"; // door leaves read slightly darker paper
  ctx.fillRect(SIDE.x + 62, GY, 14, 30);
  ctx.fillRect(SIDE.x + 164, GY, 14, 30);
  ctx.fillStyle = GLASS; // door windows
  ctx.fillRect(SIDE.x + 65, GY + 2, 8, 14);
  ctx.fillRect(SIDE.x + 167, GY + 2, 8, 14);
  // The signature double wave rides LOW on the body (photo reference:
  // turquoise crest, washi gap, Prussian-blue trough, thin indigo skirt at
  // the very bottom). paintWave fills from its line DOWN, so layers paint
  // top-first: each later call must sit lower or it buries the ones before
  // it — the old trough→gap→crest order left only the crest visible.
  paintWave(ctx, SIDE.y + 58, AQUA, 4, 9);
  paintWave(ctx, SIDE.y + 58, WASHI, 3.5, 5.5); // washi gap between waves
  paintWave(ctx, SIDE.y + 58, AI, 3.5, 2);
  paintWave(ctx, SIDE.y + SIDE.h, INDIGO, 3, 3); // thin indigo skirt, wavy top edge
  // section-end bevels (the articulation joints read as ink seams — wider
  // than link-map's: the outline carries the toy on bright paper)
  ctx.fillStyle = INK_DEEP;
  ctx.fillRect(SIDE.x, SIDE.y, 5, SIDE.h);
  ctx.fillRect(SIDE.x + SIDE.w - 5, SIDE.y, 5, SIDE.h);

  // --- front: the ink nose cap — black windshield high, headlight
  //     clusters low, ST mark on the bumper ---
  ctx.fillStyle = INK;
  ctx.fillRect(FRONT.x, FRONT.y, FRONT.w, FRONT.h);
  const noseGrad = ctx.createLinearGradient(0, FRONT.y, 0, FRONT.y + FRONT.h);
  noseGrad.addColorStop(0, INK);
  noseGrad.addColorStop(1, INK_DEEP);
  ctx.fillStyle = noseGrad;
  ctx.fillRect(FRONT.x, FRONT.y, FRONT.w, FRONT.h);
  // washi flank wedges curving in from the sides
  ctx.fillStyle = WASHI;
  ctx.beginPath();
  ctx.moveTo(FRONT.x, FRONT.y + 6);
  ctx.quadraticCurveTo(FRONT.x + 9, FRONT.y + 28, FRONT.x, FRONT.y + 50);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(FRONT.x + FRONT.w, FRONT.y + 6);
  ctx.quadraticCurveTo(FRONT.x + FRONT.w - 9, FRONT.y + 28, FRONT.x + FRONT.w, FRONT.y + 50);
  ctx.closePath();
  ctx.fill();
  // destination display (amber, glows via the emissive mask)
  ctx.fillStyle = "#3a2c10";
  ctx.fillRect(FRONT.x + 22, FRONT.y + 6, 20, 5);
  // black windshield, slightly rounded
  ctx.fillStyle = GLASS;
  ctx.beginPath();
  ctx.moveTo(FRONT.x + 12, FRONT.y + 13);
  ctx.lineTo(FRONT.x + 52, FRONT.y + 13);
  ctx.quadraticCurveTo(FRONT.x + 54, FRONT.y + 24, FRONT.x + 49, FRONT.y + 36);
  ctx.lineTo(FRONT.x + 15, FRONT.y + 36);
  ctx.quadraticCurveTo(FRONT.x + 10, FRONT.y + 24, FRONT.x + 12, FRONT.y + 13);
  ctx.closePath();
  ctx.fill();
  // headlight clusters low on the flanks
  ctx.fillStyle = "#e8e2cf";
  ctx.fillRect(FRONT.x + 8, FRONT.y + 42, 12, 6);
  ctx.fillRect(FRONT.x + 44, FRONT.y + 42, 12, 6);
  // ST mark on the bumper — the SoundTransit logo badge on a washi field
  ctx.fillStyle = WASHI;
  roundedRect(ctx, FRONT.x + 26, FRONT.y + 48, 12, 11, 2);
  ctx.fill();
  drawStMark(ctx, FRONT.x + 27, FRONT.y + 49, 9);

  // --- roof: warm equipment deck with ink edge trim ---
  ctx.fillStyle = "#c4b795";
  ctx.fillRect(ROOF.x, ROOF.y, ROOF.w, ROOF.h);
  ctx.fillStyle = INK;
  ctx.fillRect(ROOF.x, ROOF.y, ROOF.w, 6); // edge trim (z extremes)
  ctx.fillRect(ROOF.x, ROOF.y + ROOF.h - 6, ROOF.w, 6);
  ctx.fillStyle = "#9a8d6c"; // equipment boxes
  for (let i = 0; i < 3; i++) ctx.fillRect(ROOF.x + 10, ROOF.y + 12 + i * 15, 44, 9);

  // --- dark (underside, pantograph) ---
  ctx.fillStyle = "#161006";
  ctx.fillRect(DARK.x, DARK.y, DARK.w, DARK.h);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function buildEmissiveTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, H);
  // lit windows
  ctx.fillStyle = "#ffffff";
  for (const r of windowRects()) ctx.fillRect(r.x, r.y, r.w, r.h);
  // headlight clusters + destination display on the nose
  ctx.fillRect(FRONT.x + 8, FRONT.y + 42, 12, 6);
  ctx.fillRect(FRONT.x + 44, FRONT.y + 42, 12, 6);
  ctx.fillStyle = "#c99b4a"; // amber sign, dimmer than the headlights
  ctx.fillRect(FRONT.x + 22, FRONT.y + 6, 20, 5);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 2;
  return texture;
}
