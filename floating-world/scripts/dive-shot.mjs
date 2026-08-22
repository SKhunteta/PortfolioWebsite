// One-off visual verification for the dive incision (map/paperCut.ts +
// map/PaperCut.tsx): boot the page, descend into a downtown hall through the
// existing __linkMap.dive() handle, and screenshot the tear mid-open and the
// settled hold, day + night. Proves every carved shader (ground, roads,
// parks, water, seals, street life, the sheet stack) still compiles (a bad
// GLSL throws a pageerror / console shader error), the aperture opens over
// the hall, and the terraced sheets render around the fresco.
//
// Usage: node scripts/dive-shot.mjs [--url http://localhost:5199]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "scripts", "shots");
const urlArg = process.argv.indexOf("--url");
const BASE = urlArg >= 0 ? process.argv[urlArg + 1] : "http://localhost:5199";
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-angle=swiftshader", "--no-sandbox"],
});

const errors = [];
let shots = 0;

for (const look of [
  { name: "day", phase: "0.5" },
  { name: "night", phase: "0.02" },
]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => errors.push(`[${look.name}] ${e.message}`));
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" && /shader|program|glsl|webgl/i.test(t))
      errors.push(`[${look.name}] console: ${t}`);
  });

  await page.goto(`${BASE}/?phase=${look.phase}&tier=desktop`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("canvas", { timeout: 20_000 });
  await page.waitForFunction(
    () => window.__linkMap && window.__linkMap.diveList && window.__linkMap.diveList().length > 0,
    null,
    { timeout: 20_000 }
  );
  // Let the opening drift render a few frames so the pre-dive state is warm.
  await page.waitForTimeout(1500);

  // Descend into the hall nearest the projection origin — Westlake, downtown,
  // where roads, buildings, seals and street life all cross the aperture (the
  // busiest possible carve).
  await page.evaluate(() => {
    const halls = window.__linkMap.diveList();
    halls.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
    window.__linkMap.dive(halls[0].id);
  });

  // Mid-tear: the aperture is still blossoming while the camera glides down.
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(SHOTS, `dive-${look.name}-tearing.png`) });
  shots++;

  // Settled hold: the camera precesses over the open incision.
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(SHOTS, `dive-${look.name}-hold.png`) });
  shots++;

  // Release: the cut heals closed — catch it half-healed to prove the ease-out.
  await page.evaluate(() => window.__linkMap.release());
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOTS, `dive-${look.name}-healing.png`) });
  shots++;

  await page.close();
}

await browser.close();

if (errors.length) {
  console.error("dive-shot: page/shader errors:");
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}
console.log(`dive-shot: OK — ${shots} shots in ${SHOTS}`);
