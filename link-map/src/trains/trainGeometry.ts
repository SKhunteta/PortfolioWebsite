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
  // A strip of passenger windows along the side band, with two door gaps.
  const rects = [];
  for (let i = 0; i < 9; i++) {
    const x = SIDE.x + 12 + i * 26;
    if (i === 2 || i === 6) continue; // doors
    rects.push({ x, y: SIDE.y + 16, w: 20, h: 16 });
  }
  return rects;
}

export function buildLiveryTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // --- side band: white body, window band, blue skirt, green wave ---
  const grad = ctx.createLinearGradient(0, SIDE.y, 0, SIDE.y + SIDE.h);
  grad.addColorStop(0, "#c9d0d6"); // rounded shoulder shading
  grad.addColorStop(0.18, "#e9edf1");
  grad.addColorStop(0.75, "#dfe4e8");
  grad.addColorStop(1, "#b7bfc7");
  ctx.fillStyle = grad;
  ctx.fillRect(SIDE.x, SIDE.y, SIDE.w, SIDE.h);
  // window band
  ctx.fillStyle = "#0e151d";
  ctx.fillRect(SIDE.x, SIDE.y + 14, SIDE.w, 20);
  // blue skirt
  ctx.fillStyle = "#0077c8";
  ctx.fillRect(SIDE.x, SIDE.y + 46, SIDE.w, 18);
  // the green wave
  ctx.strokeStyle = "#3dae2b";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, SIDE.y + 46);
  ctx.bezierCurveTo(60, SIDE.y + 34, 120, SIDE.y + 52, 180, SIDE.y + 40);
  ctx.bezierCurveTo(215, SIDE.y + 34, 235, SIDE.y + 44, 256, SIDE.y + 40);
  ctx.stroke();
  // doors
  ctx.fillStyle = "#8f9aa4";
  ctx.fillRect(SIDE.x + 62, SIDE.y + 12, 3, 40);
  ctx.fillRect(SIDE.x + 166, SIDE.y + 12, 3, 40);
  // section-end bevels (the articulation joints read as dark seams)
  ctx.fillStyle = "#20262e";
  ctx.fillRect(SIDE.x, SIDE.y, 4, SIDE.h);
  ctx.fillRect(SIDE.x + SIDE.w - 4, SIDE.y, 4, SIDE.h);

  // --- front: windshield over white, blue bumper ---
  ctx.fillStyle = "#dfe4e8";
  ctx.fillRect(FRONT.x, FRONT.y, FRONT.w, FRONT.h);
  ctx.fillStyle = "#0e151d";
  ctx.beginPath(); // windshield trapezoid
  ctx.moveTo(FRONT.x + 10, FRONT.y + 8);
  ctx.lineTo(FRONT.x + 54, FRONT.y + 8);
  ctx.lineTo(FRONT.x + 48, FRONT.y + 34);
  ctx.lineTo(FRONT.x + 16, FRONT.y + 34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#0077c8";
  ctx.fillRect(FRONT.x, FRONT.y + 48, FRONT.w, 16);
  ctx.fillStyle = "#f5efd8"; // headlight housings
  ctx.fillRect(FRONT.x + 10, FRONT.y + 40, 10, 7);
  ctx.fillRect(FRONT.x + 44, FRONT.y + 40, 10, 7);

  // --- roof ---
  ctx.fillStyle = "#99a3ac";
  ctx.fillRect(ROOF.x, ROOF.y, ROOF.w, ROOF.h);
  ctx.fillStyle = "#7f8992";
  for (let i = 0; i < 3; i++) ctx.fillRect(ROOF.x + 10, ROOF.y + 12 + i * 16, 44, 8);

  // --- dark (underside, pantograph) ---
  ctx.fillStyle = "#14181d";
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
  // headlight dots on the front
  ctx.fillRect(FRONT.x + 10, FRONT.y + 40, 10, 7);
  ctx.fillRect(FRONT.x + 44, FRONT.y + 40, 10, 7);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 2;
  return texture;
}
