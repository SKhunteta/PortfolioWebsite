// Visual verification for the three always-on street-and-tower features:
//
//   STREETCARS  the Seattle Streetcar pair (map/Streetcars.tsx) — the SLU
//               line up Westlake and the First Hill line on Broadway, rails
//               plus the skittles fleet.
//   ELEVATORS   the Space Needle's elevator beads (map/NeedleElevators.tsx)
//               climbing the shaft face.
//   BRIDGE      the Fremont Bridge bascule (map/FremontBridge.tsx), frozen
//               fully raised with the sailboat mid-cut via ?bridge=open.
//
// Shots land in scripts/shots/. A bad shader throws a pageerror and fails.
//
// Usage: node scripts/street-rail-shot.mjs [--url http://localhost:5199]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "scripts", "shots");
const urlArg = process.argv.indexOf("--url");
const BASE = urlArg >= 0 ? process.argv[urlArg + 1] : "http://localhost:5199";
fs.mkdirSync(SHOTS, { recursive: true });

const network = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src", "data", "network.json"), "utf8")
);
const PROJ = network.meta.projection;
const toXZ = (lat, lng) => ({
  x: (lng - PROJ.originLng) * PROJ.kmPerDegLng,
  z: (PROJ.originLat - lat) * PROJ.kmPerDegLat,
});

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-angle=swiftshader", "--no-sandbox"],
});

const errors = [];
let shots = 0;

async function shoot({ name, viewport, tier, phase, query, fly }) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (e) => errors.push(`[${name}] ${e.message}`));
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" && /shader|program|glsl|webgl/i.test(t))
      errors.push(`[${name}] console: ${t}`);
  });

  await page.goto(`${BASE}/?phase=${phase}&tier=${tier}&weather=clear${query ?? ""}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("canvas", { timeout: 20_000 });
  await page.waitForFunction(() => window.__linkMapCamera && window.__linkMapControls, null, {
    timeout: 20_000,
  });

  if (fly) {
    // Park the camera; a wheel event each tick keeps CameraRig out of its
    // idle drift while we hold the pose (the bus-shot pattern).
    await page.evaluate(async ({ cam: c, tgt }) => {
      const cam = window.__linkMapCamera;
      const ctrl = window.__linkMapControls;
      const canvas = document.querySelector("canvas");
      const start = performance.now();
      await new Promise((res) => {
        const tick = () => {
          canvas.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: 1 }));
          if (ctrl) ctrl.target.set(tgt[0], tgt[1], tgt[2]);
          cam.position.set(c[0], c[1], c[2]);
          if (performance.now() - start > 3500) return res();
          requestAnimationFrame(tick);
        };
        tick();
      });
    }, fly);
  } else {
    await page.waitForTimeout(4000);
  }

  await page.waitForTimeout(600);
  const file = path.join(SHOTS, `streetrail-${name}.png`);
  await page.screenshot({ path: file });
  shots++;
  console.log(`shot ${file}`);
  await page.close();
}

const DESKTOP = { width: 1440, height: 900 };
const at = (lat, lng, dx, dy, dz, ty = 0.02) => {
  const { x, z } = toXZ(lat, lng);
  return { cam: [x + dx, dy, z + dz], tgt: [x, ty, z] };
};

// The Fremont cut, leaves up, boat mid-crossing.
const BRIDGE = at(47.6484, -122.34965, 0.55, 0.42, 0.6, 0.02);
// The Needle, framed tall so the beads on the shaft face read.
const NEEDLE = at(47.6205, -122.3493, 1.7, 1.1, 2.3, 0.4);
// Westlake & Mercer — SLU cars and their rails in the open blocks.
const SLU = at(47.625, -122.339, 0.7, 0.5, 0.6, 0.02);
// Broadway & Marion — the First Hill line on the hill.
const FIRST_HILL = at(47.6062, -122.321, 0.7, 0.5, 0.6, 0.02);

await shoot({ name: "bridge-open-day", viewport: DESKTOP, tier: "desktop", phase: "0.5", query: "&bridge=open", fly: BRIDGE });
await shoot({ name: "bridge-closed-day", viewport: DESKTOP, tier: "desktop", phase: "0.5", query: "&bridge=off", fly: BRIDGE });
await shoot({ name: "needle-beads-day", viewport: DESKTOP, tier: "desktop", phase: "0.5", fly: NEEDLE });
await shoot({ name: "needle-beads-night", viewport: DESKTOP, tier: "desktop", phase: "0.02", fly: NEEDLE });
await shoot({ name: "slu-day", viewport: DESKTOP, tier: "desktop", phase: "0.5", fly: SLU });
await shoot({ name: "firsthill-day", viewport: DESKTOP, tier: "desktop", phase: "0.5", fly: FIRST_HILL });
// Drift framing sanity — nothing new may shout at page scale.
await shoot({ name: "drift-day", viewport: DESKTOP, tier: "desktop", phase: "0.5", query: "&bridge=open" });
// Mobile width (project rule: verify ~375px too).
await shoot({ name: "mobile-day", viewport: { width: 390, height: 844 }, tier: "phone", phase: "0.5", query: "&bridge=open" });

await browser.close();

if (errors.length) {
  console.error(`\n${errors.length} page error(s):`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`\n${shots} shots, no page errors.`);
