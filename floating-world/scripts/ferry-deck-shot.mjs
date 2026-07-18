// One-off visual verification for the ferry deck reveal (map/FerryDeck.tsx):
// boot the page, pin a cold day, fly the camera in tight on a moving ferry, and
// screenshot. Proves the LOD reveal wakes and the passengers/breath/cars draw.
//
// Usage: node scripts/ferry-deck-shot.mjs [--url http://localhost:5199]

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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

// Day so the warm figures + parked cars read; ?cold=on so breath puffs.
await page.goto(`${BASE}/?phase=day&cold=on&tier=desktop`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas", { timeout: 20_000 });
await page.waitForFunction(() => (window).__linkMap?.ferryList, null, { timeout: 20_000 });

// Hold the camera tight on a moving ferry for a few seconds. A dispatched wheel
// event each tick keeps CameraRig out of its idle drift (idleFor stays short),
// so the camera stays where we park it and FerryDeck reads a close distance.
const held = await page.evaluate(async () => {
  const cam = window.__linkMapCamera;
  const ferries = window.__linkMap.ferryList();
  // Pick the Bainbridge car ferry that's under way (yaw set, not at the dock).
  const target = ferries[0];
  const canvas = document.querySelector("canvas");
  const start = performance.now();
  await new Promise((res) => {
    const tick = () => {
      canvas.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: 1 }));
      const f = window.__linkMap.ferryList()[target.index]; // live pose
      const ctrl = window.__linkMapControls;
      if (ctrl) ctrl.target.set(f.x, 0.02, f.z);
      // Sit low and just off the bow quarter, ~0.9 km out — well inside the
      // ~1.7 km full-reveal radius.
      cam.position.set(f.x - 0.7, 0.35, f.z + 0.6);
      if (performance.now() - start > 3500) res();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const f = window.__linkMap.ferryList()[target.index];
  return { cam: { x: cam.position.x, y: cam.position.y, z: cam.position.z }, ferry: f, cold: window.__linkMap.weatherState().cold };
});

await page.screenshot({ path: path.join(SHOTS, "ferry-deck.png") });
console.log("held:", JSON.stringify(held));
console.log("errors:", errors.length ? errors : "none");
await browser.close();
