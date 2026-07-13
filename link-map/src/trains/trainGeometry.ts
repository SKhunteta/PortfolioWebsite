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
    rects.push({ x: SIDE.x + x, y: SIDE.y + 15, w: 26, h: 18 });
  }
  // door windows glow too
  rects.push({ x: SIDE.x + 65, y: SIDE.y + 15, w: 8, h: 16 });
  rects.push({ x: SIDE.x + 167, y: SIDE.y + 15, w: 8, h: 16 });
  return rects;
}

// Sound Transit brand, tuned for the piece: deep navy, the paired wave.
const NAVY = "#132f63";
const NAVY_DEEP = "#0d2148";
const WHITE = "#e9edf1";
const TEAL = "#38b8a8";
const GREEN = "#3aa14f";
const GLASS = "#0c141d";

/** The double wave along the lower body — teal crest over green trough,
 *  white showing between, riding on the navy skirt (the ST signature). */
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

  // --- side band (top->bottom): navy roofline, white, BIG glass band,
  //     white, teal-over-green double wave, navy skirt ---
  const grad = ctx.createLinearGradient(0, SIDE.y, 0, SIDE.y + SIDE.h);
  grad.addColorStop(0, "#cfd6dc"); // shoulder shading
  grad.addColorStop(0.2, WHITE);
  grad.addColorStop(0.8, "#dde2e7");
  grad.addColorStop(1, "#c3cad1");
  ctx.fillStyle = grad;
  ctx.fillRect(SIDE.x, SIDE.y, SIDE.w, SIDE.h);
  // navy roofline cap
  ctx.fillStyle = NAVY;
  ctx.fillRect(SIDE.x, SIDE.y, SIDE.w, 7);
  // big glass band: near-continuous glazing with thin white pillars + doors
  ctx.fillStyle = GLASS;
  ctx.fillRect(SIDE.x, SIDE.y + 13, SIDE.w, 22);
  ctx.fillStyle = "#f2f5f8";
  for (let x = 30; x < SIDE.w; x += 34) ctx.fillRect(SIDE.x + x, SIDE.y + 13, 2, 22);
  ctx.fillStyle = "#aeb9c2"; // door leaves read slightly grey
  ctx.fillRect(SIDE.x + 62, SIDE.y + 13, 14, 34);
  ctx.fillRect(SIDE.x + 164, SIDE.y + 13, 14, 34);
  ctx.fillStyle = GLASS; // door windows
  ctx.fillRect(SIDE.x + 65, SIDE.y + 15, 8, 16);
  ctx.fillRect(SIDE.x + 167, SIDE.y + 15, 8, 16);
  // navy skirt, then the waves stacked on it
  ctx.fillStyle = NAVY;
  ctx.fillRect(SIDE.x, SIDE.y + 52, SIDE.w, 12);
  paintWave(ctx, SIDE.y + 54, GREEN, 3.5, 2);
  paintWave(ctx, SIDE.y + 54, "#eef2f5", 3.5, 5); // white gap between waves
  paintWave(ctx, SIDE.y + 54, TEAL, 4, 8);
  ctx.fillStyle = NAVY; // skirt edge back on top
  ctx.fillRect(SIDE.x, SIDE.y + 60, SIDE.w, 4);
  // "SoundTransit" hint on the upper white (unreadable-small, but the eye
  // expects a mark there)
  ctx.fillStyle = "#8a97a5";
  ctx.fillRect(SIDE.x + 96, SIDE.y + 9, 26, 2);
  ctx.fillRect(SIDE.x + 214, SIDE.y + 9, 16, 2);
  // section-end bevels (the articulation joints read as dark seams)
  ctx.fillStyle = "#1a2230";
  ctx.fillRect(SIDE.x, SIDE.y, 3, SIDE.h);
  ctx.fillRect(SIDE.x + SIDE.w - 3, SIDE.y, 3, SIDE.h);

  // --- front: the navy nose cap — black windshield high, headlight
  //     clusters low, ST mark on the bumper ---
  ctx.fillStyle = NAVY;
  ctx.fillRect(FRONT.x, FRONT.y, FRONT.w, FRONT.h);
  const noseGrad = ctx.createLinearGradient(0, FRONT.y, 0, FRONT.y + FRONT.h);
  noseGrad.addColorStop(0, NAVY);
  noseGrad.addColorStop(1, NAVY_DEEP);
  ctx.fillStyle = noseGrad;
  ctx.fillRect(FRONT.x, FRONT.y, FRONT.w, FRONT.h);
  // white flank wedges curving in from the sides
  ctx.fillStyle = WHITE;
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
  // ST mark on the bumper
  ctx.fillStyle = WHITE;
  ctx.fillRect(FRONT.x + 28, FRONT.y + 50, 8, 6);
  ctx.fillStyle = TEAL;
  ctx.fillRect(FRONT.x + 28, FRONT.y + 53, 8, 3);

  // --- roof: pale equipment deck with navy edge trim ---
  ctx.fillStyle = "#b6bfc6";
  ctx.fillRect(ROOF.x, ROOF.y, ROOF.w, ROOF.h);
  ctx.fillStyle = NAVY;
  ctx.fillRect(ROOF.x, ROOF.y, ROOF.w, 6); // edge trim (z extremes)
  ctx.fillRect(ROOF.x, ROOF.y + ROOF.h - 6, ROOF.w, 6);
  ctx.fillStyle = "#8d979f"; // equipment boxes
  for (let i = 0; i < 3; i++) ctx.fillRect(ROOF.x + 10, ROOF.y + 12 + i * 15, 44, 9);

  // --- dark (underside, pantograph) ---
  ctx.fillStyle = "#12161b";
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
