// Repro sweep for "big black squares flashing at high altitude": dolly the
// camera continuously from mid drift out to max distance while capturing
// frames rapidly, day and night, clean and mid-dive. Reports per-frame
// near-black coverage (proper PNG decode this time — colorType-aware) so a
// flashing black region shows as a spike between consecutive frames.
//
// Usage: node scripts/highalt-sweep.mjs [--url http://localhost:5199] [--tag name]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "scripts", "shots");
const urlArg = process.argv.indexOf("--url");
const BASE = urlArg >= 0 ? process.argv[urlArg + 1] : "http://localhost:5199";
const tagArg = process.argv.indexOf("--tag");
const TAG = tagArg >= 0 ? process.argv[tagArg + 1] : "head";
fs.mkdirSync(SHOTS, { recursive: true });

function darkFraction(png) {
  let off = 8;
  let w = 0, h = 0, colorType = 6, idat = [];
  while (off < png.length) {
    const len = png.readUInt32BE(off);
    const type = png.toString("ascii", off + 4, off + 8);
    const data = png.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9]; }
    if (type === "IDAT") idat.push(data);
    off += 12 + len;
    if (type === "IEND") break;
  }
  const bpp = colorType === 2 ? 3 : 4;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    const row = raw.subarray(p, p + stride);
    p += stride;
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = x >= bpp && prev ? prev[x - bpp] : 0;
      let v = row[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }
  let dark = 0;
  const total = w * h;
  for (let i = 0; i < total; i++) {
    const r = out[i * bpp], g = out[i * bpp + 1], b = out[i * bpp + 2];
    if (r < 40 && g < 40 && b < 40) dark++;
  }
  return dark / total;
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-angle=swiftshader", "--no-sandbox"],
});

const errors = [];
const report = [];

for (const look of [
  { name: "day", phase: "0.5" },
  { name: "night", phase: "0.02" },
]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(`[${look.name}] ${e.message}`));
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" && /shader|program|glsl|webgl/i.test(t))
      errors.push(`[${look.name}] console: ${t}`);
  });
  await page.goto(`${BASE}/?phase=${look.phase}&tier=desktop`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { timeout: 20_000 });
  await page.waitForFunction(() => window.__linkMapCamera && window.__linkMapControls, null, {
    timeout: 20_000,
  });
  await page.waitForTimeout(1500);

  for (const state of ["clean", "dived"]) {
    if (state === "dived") {
      await page.evaluate(() => {
        const halls = window.__linkMap.diveList();
        halls.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
        window.__linkMap.dive(halls[0].id);
      });
      await page.waitForTimeout(1000);
    }
    // Continuous dolly out: each capture step advances the camera along the
    // out-vector (fighting any rig lerp by setting it every rAF), oblique
    // rather than top-down — the way a visitor actually zooms away.
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      await page.evaluate(async ({ t }) => {
        const cam = window.__linkMapCamera;
        const ctrl = window.__linkMapControls;
        const canvas = document.querySelector("canvas");
        const start = performance.now();
        const y = 6 + t * 78; // 6 km → 84 km up
        const back = 4 + t * 34; // oblique southward offset
        await new Promise((res) => {
          const tick = () => {
            canvas.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: 1 }));
            ctrl.target.set(1.4, 0, 0.4);
            cam.position.set(1.4, y, 0.4 + back);
            if (performance.now() - start > 120) return res();
            requestAnimationFrame(tick);
          };
          tick();
        });
      }, { t });
      const buf = await page.screenshot();
      const frac = darkFraction(buf);
      report.push({ key: `${look.name}-${state}-${i}`, frac, buf });
    }
  }
  await page.close();
}

await browser.close();

// Print all fractions; save only the outliers (max per group + any spike).
let prev = null;
for (const r of report) {
  const spike = prev !== null && Math.abs(r.frac - prev) > 0.03;
  console.log(`${r.key} dark=${(r.frac * 100).toFixed(2)}%${spike ? "  <-- SPIKE" : ""}`);
  prev = r.frac;
}
const sorted = [...report].sort((a, b) => b.frac - a.frac).slice(0, 4);
for (const r of sorted) {
  fs.writeFileSync(path.join(SHOTS, `sweep-${TAG}-${r.key}.png`), r.buf);
}
if (errors.length) {
  console.error("errors:");
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}
console.log("highalt-sweep: done (top-dark frames saved)");
