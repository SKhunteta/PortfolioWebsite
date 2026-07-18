// One-off visual verification for the surface crowd (map/Pedestrians.tsx): boot
// the page, fly the camera low over downtown (where the crowd concentrates),
// and screenshot day + night at desktop and mobile widths. Proves the shader
// compiles (a bad GLSL throws a pageerror), the walks are populated, and the
// crowd thins overnight via trafficIntensity.
//
// Usage: node scripts/pedestrian-shot.mjs [--url http://localhost:5199]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "scripts", "shots");
const urlArg = process.argv.indexOf("--url");
const BASE = urlArg >= 0 ? process.argv[urlArg + 1] : "http://localhost:5199";
fs.mkdirSync(SHOTS, { recursive: true });

const HEART = { x: 1.4, z: 0.4 }; // config.camera.heartX/Z — downtown

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

    // ?traffic=1 makes the crowd fullest (rush-hour density) so the walks are
    // clearly populated regardless of the real Seattle hour at test time.
    await page.goto(`${BASE}/?phase=${look.phase}&traffic=1&tier=${view.tier}`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector("canvas", { timeout: 20_000 });
    await page.waitForFunction(() => (window).__linkMapCamera && (window).__linkMapControls, null, {
      timeout: 20_000,
    });

    // Fly low over downtown and hold there for a few seconds so the drift orbit
    // doesn't carry us off. A wheel event each tick keeps CameraRig out of its
    // idle drift while we park the camera.
    await page.evaluate(async ({ heart }) => {
      const cam = window.__linkMapCamera;
      const ctrl = window.__linkMapControls;
      const canvas = document.querySelector("canvas");
      const start = performance.now();
      await new Promise((res) => {
        const tick = () => {
          canvas.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: 1 }));
          if (ctrl) ctrl.target.set(heart.x, 0.02, heart.z);
          // Low and close: ~1.6 km out, ~0.9 km up — down among the sidewalks.
          cam.position.set(heart.x + 1.3, 0.9, heart.z + 1.0);
          if (performance.now() - start > 3500) return res();
          requestAnimationFrame(tick);
        };
        tick();
      });
    }, { heart: HEART });

    await page.waitForTimeout(600);
    const file = path.join(SHOTS, `pedestrians-${view.name}-${look.name}.png`);
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
