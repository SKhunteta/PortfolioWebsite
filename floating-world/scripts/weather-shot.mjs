// Visual verification for the dramatic-weather pass (fx/WeatherOverlay.tsx +
// world/weather.ts applyWeather): boot the page with each sky pinned and
// screenshot the print — the snow blanket (roofs capped, streets buried,
// snow-grey sky, the three-depth flake curtain), the storm's leaning hatch
// with a pinned bolt, and plain rain — at desktop and mobile widths, day and
// night for snow. Proves the shaders compile (a bad GLSL throws a pageerror)
// and the palette moves land on the page.
//
// Usage: node scripts/weather-shot.mjs [--url http://localhost:5199]

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

const CASES = [
  // The hero: a snow day from the drift camera — the whole blanket at once.
  { name: "snow-day-desktop", q: "weather=snow&phase=0.5&tier=desktop", viewport: { width: 1440, height: 900 } },
  // Low over downtown: capped roofs, buried streets, umbrellas up in the snow.
  { name: "snow-day-low", q: "weather=snow&phase=0.5&traffic=1&tier=desktop", viewport: { width: 1440, height: 900 }, low: true },
  // The lantern print under snow.
  { name: "snow-night-desktop", q: "weather=snow&phase=0.02&tier=desktop", viewport: { width: 1440, height: 900 } },
  // Storm with the bolt pinned lit — the leaning hatch plus Sanka Hakuu.
  { name: "storm-day-desktop", q: "weather=storm&phase=0.5&tier=desktop", viewport: { width: 1440, height: 900 }, strike: true },
  { name: "rain-day-desktop", q: "weather=rain&phase=0.5&tier=desktop", viewport: { width: 1440, height: 900 } },
  // Phones keep weather in the palette only (no overlay) — verify the blanket
  // still reads at mobile width.
  { name: "snow-day-mobile", q: "weather=snow&phase=0.5&tier=phone", viewport: { width: 390, height: 844 } },
];

for (const c of CASES) {
  const page = await browser.newPage({ viewport: c.viewport });
  page.on("pageerror", (e) => errors.push(`[${c.name}] ${e.message}`));
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" && /shader|program|glsl|webgl/i.test(t))
      errors.push(`[${c.name}] console: ${t}`);
  });

  await page.goto(`${BASE}/?${c.q}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { timeout: 20_000 });
  await page.waitForFunction(() => window.__linkMapCamera && window.__linkMapControls, null, {
    timeout: 20_000,
  });

  if (c.strike) await page.evaluate(() => window.__linkMap.strike(0.5));

  if (c.low) {
    // Park the camera low over downtown so the sidewalk umbrellas and the
    // capped town roofs fill the frame (the pedestrian-shot move).
    await page.evaluate(async ({ heart }) => {
      const cam = window.__linkMapCamera;
      const ctrl = window.__linkMapControls;
      const canvas = document.querySelector("canvas");
      const start = performance.now();
      await new Promise((res) => {
        const tick = () => {
          canvas.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: 1 }));
          if (ctrl) ctrl.target.set(heart.x, 0.02, heart.z);
          cam.position.set(heart.x + 1.3, 0.9, heart.z + 1.0);
          if (performance.now() - start > 3500) return res();
          requestAnimationFrame(tick);
        };
        tick();
      });
    }, { heart: HEART });
  } else {
    // Let the pinned weather's first frames settle (URL pins start IN the
    // weather, so this is about trains/labels booting, not the wash easing).
    await page.waitForTimeout(3000);
  }

  await page.waitForTimeout(600);
  const file = path.join(SHOTS, `weather-${c.name}.png`);
  await page.screenshot({ path: file });
  shots++;
  console.log(`shot ${file}`);
  await page.close();
}

await browser.close();

if (errors.length) {
  console.error(`\nFAIL — ${errors.length} runtime error(s):`);
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}
console.log(`\nOK — ${shots} screenshots, no shader/runtime errors.`);
