// Visual verification for the bus fleet (map/Buses.tsx), both modes:
//
//   LIVE     /api/metro/vehicles is mocked via playwright route interception
//            with a fixture of ~900 coaches laid onto the real baked road
//            corridors (back-projected to lat/lon through the network.json
//            projection, exactly the transform the poller applies), a share
//            flagged RapidRide. Proves the poller folds, the pool renders at
//            fleet scale, the three photo liveries paint, and the page-scale
//            river of service reads from the drift camera.
//   AMBIENT  the endpoint is aborted, so the layer must fall back to the
//            deterministic corridor fleet (the pre-live behavior).
//
// Shots land in scripts/shots/. A bad shader throws a pageerror and fails.
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

// --- fixture: a rush-hour fleet on the real streets -------------------------

const basemap = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src", "data", "basemap.json"), "utf8")
);
const network = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src", "data", "network.json"), "utf8")
);
const PROJ = network.meta.projection;
const toLatLng = (x, z) => ({
  lat: PROJ.originLat - z / PROJ.kmPerDegLat,
  lon: PROJ.originLng + x / PROJ.kmPerDegLng,
});

// Deterministic hash so the fixture is identical run to run.
const hash = (n) => Math.abs((Math.sin(n * 91.37 + 12.7) * 43758.5453) % 1);

function buildFixture(count) {
  const lines = [...basemap.roads.major, ...basemap.roads.arterial].filter(
    (l) => l.length >= 2
  );
  const vehicles = [];
  for (let i = 0; i < count; i++) {
    const line = lines[Math.floor(hash(i * 3.1 + 0.7) * lines.length)];
    const j = Math.max(1, Math.floor(hash(i * 5.3 + 1.1) * line.length));
    const f = hash(i * 7.7 + 2.3);
    const x = line[j - 1][0] + (line[j][0] - line[j - 1][0]) * f;
    const z = line[j - 1][1] + (line[j][1] - line[j - 1][1]) * f;
    const { lat, lon } = toLatLng(x, z);
    const heading = Math.round(
      ((Math.atan2(line[j][0] - line[j - 1][0], -(line[j][1] - line[j - 1][1])) * 180) /
        Math.PI +
        360) %
        360
    );
    const bus = {
      id: `1_${4000 + i}`,
      lat: Math.round(lat * 1e5) / 1e5,
      lon: Math.round(lon * 1e5) / 1e5,
      hdg: heading,
      ts: Math.floor(Date.now() / 1000),
    };
    // A downtown-weighted RapidRide share, like the real E/C/D/H lines.
    if (hash(i * 11.9 + 4.7) < 0.12) bus.rr = 1;
    vehicles.push(bus);
  }
  return { mode: "live", vehicles, fetchedAt: new Date().toISOString() };
}

const FIXTURE = buildFixture(900);

// --- harness ----------------------------------------------------------------

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-angle=swiftshader", "--no-sandbox"],
});

const errors = [];
let shots = 0;

async function shoot({ name, viewport, tier, phase, mock, query, fly }) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (e) => errors.push(`[${name}] ${e.message}`));
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" && /shader|program|glsl|webgl/i.test(t))
      errors.push(`[${name}] console: ${t}`);
  });

  await page.route("**/api/metro/vehicles**", (route) => {
    if (mock === "live") {
      route.fulfill({ contentType: "application/json", body: JSON.stringify(FIXTURE) });
    } else {
      route.abort(); // backend down -> the layer must fall back to ambient
    }
  });

  // Weather pinned clear so the verification isn't at the mercy of whatever
  // fog the real Seattle sky is painting onto the page today.
  await page.goto(`${BASE}/?phase=${phase}&tier=${tier}&weather=clear${query ?? ""}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("canvas", { timeout: 20_000 });
  await page.waitForFunction(() => window.__linkMapCamera && window.__linkMapControls, null, {
    timeout: 20_000,
  });

  if (fly) {
    // Park the camera; a wheel event each tick keeps CameraRig out of its
    // idle drift while we hold the pose.
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
    await page.waitForTimeout(6000); // let the poll land and the fleet fade in
  }

  await page.waitForTimeout(600);
  const file = path.join(SHOTS, `buses-${name}.png`);
  await page.screenshot({ path: file });
  shots++;
  console.log(`shot ${file}`);
  await page.close();
}

const DESKTOP = { width: 1440, height: 900 };
// Beacon Hill's trunk corridor south of downtown — low town fabric, so
// individual coaches and their liveries read unobscured.
const CLOSE = {
  cam: [2.0 + 0.85, 0.62, 7.0 + 0.7],
  tgt: [2.0, 0.02, 7.0],
};

// The live fleet from the default drift framing, day and night.
await shoot({ name: "live-drift-day", viewport: DESKTOP, tier: "desktop", phase: "0.5", mock: "live" });
await shoot({ name: "live-drift-night", viewport: DESKTOP, tier: "desktop", phase: "0.02", mock: "live" });
// The three photo liveries up close.
await shoot({ name: "live-close-day", viewport: DESKTOP, tier: "desktop", phase: "0.5", mock: "live", fly: CLOSE });
// Mobile width (project rule: verify ~375px too).
await shoot({ name: "live-mobile-day", viewport: { width: 390, height: 844 }, tier: "phone", phase: "0.5", mock: "live" });
// Feed down -> ambient fallback still paints its corridor fleet.
await shoot({ name: "ambient-fallback", viewport: DESKTOP, tier: "desktop", phase: "0.5", mock: "down", query: "&traffic=0", fly: CLOSE });

await browser.close();

if (errors.length) {
  console.error(`\nFAIL — ${errors.length} runtime error(s):`);
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}
console.log(`\nOK — ${shots} screenshots, no shader/runtime errors.`);
