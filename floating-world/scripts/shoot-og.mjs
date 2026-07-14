// One-off: capture the OG link-preview thumbnail (public/og.png) — the piece
// as it renders today, pinned to a sunset sky and a deliberate zoomed 3/4 map
// framing that keeps downtown + both lines and crops the far-shore island
// ridges (they lean on the Red-Fuji mountain shader, which the software-GL
// screenshot renderer flattens into vermilion blobs — a real GPU shows them as
// faint ghosted ridges). Mocks the vehicle feed so trains glide, hides all HUD
// chrome, supersamples at 2x and downsamples to the standard 1200x630 OG size.
//
// Prereqs: dev server on :5199 (`npm run dev -- --port 5199`).
// Usage:   node scripts/shoot-og.mjs [phase] [outfile] [camX,camY,camZ] [settleMs]
// The committed thumbnail was: phase 0.24, cam 2.4,12.2,6.0.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const PHASE = process.argv[2] ?? "0.24";
const OUT = process.argv[3] ?? "/tmp/og-preview.png";
const CAM = (process.argv[4] ?? "2.4,12.2,6.0").split(",").map(Number);
const SETTLE = Number(process.argv[5] ?? 6500);
const BASE = "http://127.0.0.1:5199";
const W = 1200, H = 630;
const TARGET = [1.4, 0, 0.4]; // CONFIG.camera heart

// Synthesize a simulated fleet the same way the backend does, so trains glide
// even without the live feed. Falls back to an empty fleet if the sibling
// backend isn't checked out.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let payload = JSON.stringify({ mode: "resting", vehicles: [], fetchedAt: new Date(0).toISOString() });
try {
  const { simulateVehicles } = await import(
    path.join(ROOT, "../portfolio-backend/services/linkSim.js")
  );
  const schedule = JSON.parse(
    fs.readFileSync(path.join(ROOT, "../portfolio-backend/data/linkmap-schedule.json"), "utf8")
  );
  const now = Date.now();
  payload = JSON.stringify({
    mode: "simulated",
    vehicles: simulateVehicles(schedule, now),
    fetchedAt: new Date(now).toISOString(),
  });
} catch (e) {
  console.warn("no backend sim — capturing an empty (resting) fleet:", e.message);
}

const HIDE_CSS = `
  [class^="hud-"], [class*=" hud-"],
  [class^="fw-"],  [class*=" fw-"],
  [class^="station-panel"], [class*=" station-panel"] { display: none !important; }
`;

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-angle=swiftshader", "--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));

await page.route("**/api/linkmap/vehicles", (route) =>
  route.fulfill({ status: 200, contentType: "application/json", body: payload })
);

await page.goto(`${BASE}/?phase=${PHASE}&tier=desktop`, { waitUntil: "domcontentloaded" });
await page.addStyleTag({ content: HIDE_CSS });
await page.waitForSelector("canvas", { timeout: 20000 });
await page.waitForFunction(() => (window).__linkMapStats?.trains > 0, null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(SETTLE);

// Pin a deliberate framing: bump lastInteraction (a wheel event) so the drift
// rig stops touching the camera, then place camera + target and hold.
await page.evaluate(({ cam, target }) => {
  const w = window;
  const canvas = document.querySelector("canvas");
  canvas.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: 1 }));
  const camera = w.__linkMapCamera;
  const controls = w.__linkMapControls;
  if (camera && controls) {
    controls.target.set(target[0], target[1], target[2]);
    camera.position.set(cam[0], cam[1], cam[2]);
    camera.updateProjectionMatrix();
    controls.update();
  }
}, { cam: CAM, target: TARGET });

await page.waitForTimeout(2500); // let the pose settle + trails re-develop

const stats = await page.evaluate(() => (window).__linkMapStats);
console.log("stats", JSON.stringify(stats));

const hi = await page.locator("canvas").screenshot();
const dataUrl = `data:image/png;base64,${hi.toString("base64")}`;
const shrink = await browser.newPage();
const out = await shrink.evaluate(async ({ url, w, h }) => {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return c.toDataURL("image/png");
}, { url: dataUrl, w: W, h: H });

fs.writeFileSync(OUT, Buffer.from(out.split(",")[1], "base64"));
console.log("wrote", OUT);
await browser.close();
