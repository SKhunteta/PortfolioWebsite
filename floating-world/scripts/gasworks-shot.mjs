// One-off visual verification for the Gasworks Park portrait
// (map/Landmarks.tsx): boot the page, fly the camera low over the Lake Union
// point, and screenshot day + night at desktop and mobile widths. Proves the
// aGasworks shader path compiles (a bad GLSL throws a pageerror), the
// cracking-tower ruin / play barn / Kite Hill render, and the kite-flyer hero
// stands the summit instead of floating at grade.
//
// Usage: node scripts/gasworks-shot.mjs [--url http://localhost:5199]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "scripts", "shots");
const urlArg = process.argv.indexOf("--url");
const BASE = urlArg >= 0 ? process.argv[urlArg + 1] : "http://localhost:5199";
fs.mkdirSync(SHOTS, { recursive: true });

// projectLatLng(47.6456, -122.3344) — the park's center on its point.
const PARK = { x: -0.17, z: -4.39 };

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-angle=swiftshader", "--no-sandbox"],
});

const errors = [];
let shots = 0;

for (const view of [
  { name: "desktop", viewport: { width: 1440, height: 900 }, tier: "desktop" },
  { name: "mobile", viewport: { width: 390, height: 844 }, tier: "phone" },
]) {
  for (const look of [
    { name: "day", phase: "0.5" },
    { name: "night", phase: "0.02" },
  ]) {
    const page = await browser.newPage({ viewport: view.viewport });
    page.on("pageerror", (e) => errors.push(`[${view.name}/${look.name}] ${e.message}`));
    page.on("console", (m) => {
      const t = m.text();
      // Surface WebGL program / shader compile failures, which log as errors.
      if (m.type() === "error" && /shader|program|glsl|webgl/i.test(t))
        errors.push(`[${view.name}/${look.name}] console: ${t}`);
    });

    await page.goto(`${BASE}/?phase=${look.phase}&tier=${view.tier}`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector("canvas", { timeout: 20_000 });
    await page.waitForFunction(() => (window).__linkMapCamera && (window).__linkMapControls, null, {
      timeout: 20_000,
    });

    // Park the camera low over the point, looking down onto the ruin and the
    // hill. A wheel event each tick keeps CameraRig out of its idle drift.
    await page.evaluate(async ({ park }) => {
      const cam = window.__linkMapCamera;
      const ctrl = window.__linkMapControls;
      const canvas = document.querySelector("canvas");
      const start = performance.now();
      await new Promise((res) => {
        const tick = () => {
          canvas.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: 1 }));
          if (ctrl) ctrl.target.set(park.x, 0.05, park.z);
          // Close in from the southeast over the lake: ~1.2 km out, ~0.7 km up.
          cam.position.set(park.x + 0.85, 0.7, park.z + 0.85);
          if (performance.now() - start > 3500) return res();
          requestAnimationFrame(tick);
        };
        tick();
      });
    }, { park: PARK });

    await page.waitForTimeout(600);
    const file = path.join(SHOTS, `gasworks-${view.name}-${look.name}.png`);
    await page.screenshot({ path: file });
    shots++;
    console.log(`shot ${file}`);
    await page.close();
  }
}

await browser.close();

if (errors.length) {
  console.error(`\nFAIL — ${errors.length} runtime error(s):`);
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}
console.log(`\nOK — ${shots} screenshots, no shader/runtime errors.`);
