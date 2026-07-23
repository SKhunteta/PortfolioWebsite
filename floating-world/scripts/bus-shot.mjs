// One-off visual verification for the bus fleet (map/Buses.tsx): boot the
// page, fly the camera low over downtown's major streets, and screenshot
// day + night at desktop and mobile widths. Proves the shader compiles (a bad
// GLSL throws a pageerror) and that ?buses=1 puts the full fleet on stage
// regardless of the real Seattle hour at test time.
//
// Usage: node scripts/bus-shot.mjs [--url http://localhost:5199]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "scripts", "shots");
const urlArg = process.argv.indexOf("--url");
const BASE = urlArg >= 0 ? process.argv[urlArg + 1] : "http://localhost:5199";
fs.mkdirSync(SHOTS, { recursive: true });

// Beacon Hill's trunk corridor south of downtown — low town fabric, and the
// deterministic fleet layout parks several buses of the route here, so the
// frame catches more than one (verified by replaying the fleet hash in node).
const SPOT = { x: 2.0, z: 7.0 };

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
      if (m.type() === "error" && /shader|program|glsl|webgl/i.test(t))
        errors.push(`[${view.name}/${look.name}] console: ${t}`);
    });

    // ?buses=1 pins the full service span and ?traffic=0 clears the street
    // cars, so every vehicle on a road stroke here is a bus.
    await page.goto(`${BASE}/?phase=${look.phase}&buses=1&traffic=0&tier=${view.tier}`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector("canvas", { timeout: 20_000 });
    await page.waitForFunction(() => (window).__linkMapCamera && (window).__linkMapControls, null, {
      timeout: 20_000,
    });

    // Fly low over downtown and hold there a few seconds — a wheel event each
    // tick keeps CameraRig out of its idle drift while we park the camera.
    await page.evaluate(async ({ heart }) => {
      const cam = window.__linkMapCamera;
      const ctrl = window.__linkMapControls;
      const canvas = document.querySelector("canvas");
      const start = performance.now();
      await new Promise((res) => {
        const tick = () => {
          canvas.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: 1 }));
          if (ctrl) ctrl.target.set(heart.x, 0.02, heart.z);
          // A low oblique over the corridor — close enough to pick out a
          // single bus and its curb dwell.
          cam.position.set(heart.x + 0.85, 0.62, heart.z + 0.7);
          if (performance.now() - start > 3500) return res();
          requestAnimationFrame(tick);
        };
        tick();
      });
    }, { heart: SPOT });

    await page.waitForTimeout(600);
    const file = path.join(SHOTS, `buses-${view.name}-${look.name}.png`);
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
