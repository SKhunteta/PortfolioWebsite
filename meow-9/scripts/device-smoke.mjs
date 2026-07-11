// Per-tier device regression harness. Boots the app in emulated phone /
// tablet / desktop contexts and asserts: the detected tier, the cat count,
// touch hit-target sizes, that the button cluster fits the viewport, and
// that the hero cat stays framed during the Observer close-up in portrait
// (the aspect-compensated-FOV regression). Screenshots land in
// scripts/shots/ for eyeballing.
//
// Usage:
//   npm run dev -- --port 5173   (in another terminal)
//   node scripts/device-smoke.mjs [baseUrl]
//
// The iPad-with-trackpad ("masquerade") branch can't be reached under
// emulation — Playwright caps emulated maxTouchPoints at 1 — so that
// context forces ?tier=tablet, which is exactly what the override exists
// for. Test the real branch on hardware via `npm run dev -- --host`.

import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:5173/";
const SHOT_DIR = new URL("./shots/", import.meta.url).pathname;
mkdirSync(SHOT_DIR, { recursive: true });

const CONTEXTS = {
  "phone-portrait": {
    ctx: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    expect: { tier: "phone", cats: 10, touch: true },
    portraitShot: true,
  },
  "phone-landscape": {
    ctx: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    expect: { tier: "phone", cats: 10, touch: true },
  },
  "phone-narrow": {
    ctx: { viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    expect: { tier: "phone", cats: 10, touch: true },
  },
  ipad: {
    ctx: { viewport: { width: 1024, height: 1366 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    expect: { tier: "tablet", cats: 16, touch: true },
  },
  "ipad-trackpad": {
    ctx: {
      viewport: { width: 1366, height: 1024 },
      deviceScaleFactor: 2,
      hasTouch: true,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    },
    urlSuffix: "?tier=tablet", // masquerade branch not emulable; forced
    expect: { tier: "tablet", cats: 16 },
  },
  desktop: {
    ctx: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
    expect: { tier: "desktop", cats: 16, touch: false },
  },
};

let failures = 0;
const check = (name, cond, detail) => {
  if (!cond) {
    failures++;
    console.error(`  ✗ ${name}: ${detail}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
};

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
});

for (const [name, spec] of Object.entries(CONTEXTS)) {
  console.log(`\n── ${name}`);
  const ctx = await browser.newContext(spec.ctx);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE + (spec.urlSuffix ?? ""), { waitUntil: "networkidle" });
  await page.waitForTimeout(4000); // shader warm-up

  const probe = await page.evaluate(() => ({
    device: window.__meowDevice,
    cats: window.__meowTrack.bodies.filter(Boolean).length,
  }));
  check("tier", probe.device.tier === spec.expect.tier, `got ${probe.device.tier}, want ${spec.expect.tier}`);
  if (spec.expect.touch !== undefined) {
    check("inputTouch", probe.device.inputTouch === spec.expect.touch, `got ${probe.device.inputTouch}`);
  }
  check("cats", probe.cats === spec.expect.cats, `got ${probe.cats}, want ${spec.expect.cats}`);

  // UI ergonomics: every control inside the viewport; 44px targets on touch.
  const vw = spec.ctx.viewport.width;
  const boxes = await page.$$eval("button, input[type=range]", (els) =>
    els.map((el) => {
      const b = el.getBoundingClientRect();
      return { text: el.textContent || el.getAttribute("aria-label") || "?", left: b.left, right: b.right, height: b.height };
    })
  );
  for (const b of boxes) {
    check(`"${b.text.trim()}" fits`, b.right <= vw + 1 && b.left >= -1, `spans ${b.left.toFixed(0)}..${b.right.toFixed(0)} in ${vw}`);
    if (spec.expect.touch) {
      check(`"${b.text.trim()}" ≥44px`, b.height >= 43.5, `height ${b.height.toFixed(1)}`);
    }
  }

  await page.screenshot({ path: `${SHOT_DIR}${name}-idle.png` });

  // Observer close-up framing (the portrait-FOV regression): jump to shot 1
  // ("The Residents", anchored on cat0) and assert cat0 projects inside NDC.
  if (spec.portraitShot) {
    await page.evaluate(() => window.__meowObserver.getState().jumpTo(1));
    await page.waitForTimeout(6500); // past the cut fade, mid-shot
    const ndc = await page.evaluate(() => {
      const p = window.__meowTrack.point("cat0").clone();
      p.project(window.__meowCamera);
      return { x: p.x, y: p.y };
    });
    check("cat0 framed in portrait", Math.abs(ndc.x) < 0.9 && Math.abs(ndc.y) < 0.9, `NDC ${ndc.x.toFixed(2)}, ${ndc.y.toFixed(2)}`);
    await page.screenshot({ path: `${SHOT_DIR}${name}-tour.png` });
    await page.evaluate(() => window.__meowObserver.getState().stop());
  }

  check("no page errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

await browser.close();
console.log(failures ? `\n${failures} check(s) FAILED` : "\nall device checks passed");
process.exit(failures ? 1 : 0);
