/*
 * Build-time QR generator for the "You Are Here" kiosk.
 *
 * Usage:  node make-qr.mjs <url> [path/to/index.html]
 *
 * Requires the `qrcode` npm package to be resolvable (install it anywhere
 * and point NODE_PATH at its node_modules; it is deliberately NOT a
 * dependency of the deliverable — the emitted SVG is inlined into
 * index.html between <!--QR:BEGIN--> and <!--QR:END--> markers, so the
 * kiosk file stays 100% offline with no runtime QR library.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import QRCode from "qrcode";

const url = process.argv[2];
if (!url) {
  console.error("usage: node make-qr.mjs <url> [index.html]");
  process.exit(1);
}
const htmlPath =
  process.argv[3] ?? join(dirname(fileURLToPath(import.meta.url)), "index.html");

// Medium error correction: good balance of density and scan tolerance
// for a 240px+ on-screen code read from a couple of feet away.
const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
const size = qr.modules.size;
const data = qr.modules.data;

// One path of unit squares; 4-module quiet zone provided by the viewBox
// margin plus the light card the SVG sits on in the page.
let d = "";
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    if (data[y * size + x]) d += `M${x} ${y}h1v1h-1z`;
  }
}
const pad = 4;
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${size + 2 * pad} ${size + 2 * pad}" ` +
  `shape-rendering="crispEdges" role="img" aria-label="QR code: ${url}">` +
  `<rect x="${-pad}" y="${-pad}" width="${size + 2 * pad}" height="${size + 2 * pad}" fill="#f4f2ec"/>` +
  `<path d="${d}" fill="#101312"/></svg>`;

const html = readFileSync(htmlPath, "utf8");
const re = /<!--QR:BEGIN-->[\s\S]*?<!--QR:END-->/;
if (!re.test(html)) {
  console.error("QR markers not found in " + htmlPath);
  process.exit(1);
}
writeFileSync(htmlPath, html.replace(re, `<!--QR:BEGIN-->${svg}<!--QR:END-->`));
console.log(`Inlined ${size}x${size} QR for ${url} into ${htmlPath}`);
