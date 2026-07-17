// Composer watchdog — the self-healing answer to a bug class that headless
// verification cannot see. Every historically broken composer config (MSAA on
// any buffer → black page, SMAA's depth-copy feedback → per-frame GL errors)
// passed SwiftShader while breaking real GPUs (PRs #192/#197/#198/#216/#218).
// So for the first ~120 rendered frames the composer tiers probe for the two
// known catastrophic signatures and, on a trip, fall back to composer OFF —
// the painted-glow phone path, which has never failed on any hardware.
//
// The third signature is TRANSIENT: single-frame black flashes minutes into a
// session (iPad + desktop screen recording, Jul 16 — one presented frame goes
// black in big rectangular blocks, then the very next frame is perfect). The
// boot window can't see those, so the black probe now stays armed for the
// life of the page as a cheap flicker sentinel: one 1×1 readPixels at center
// per frame, escalating to the full five-point probe only when that pixel
// reads black. Recurring flashes (FLICKER_TRIP distinct events) trip the same
// composer-off fallback — a slightly aliased print beats a strobing one.
//
// The probe wraps composer.render: preserveDrawingBuffer is false, so pixels
// are only readable synchronously in the same frame after the final screen
// pass — wrapping render puts us exactly there without any useFrame priority
// (canon: no priorities; R3F v8 would disable auto-render).
//
// False-positive guards: both palettes clear to a nonzero scene.background
// (washi #e8d7ac day / aubergine #432b35 night) from frame 1 and the vignette
// (0.32) never crushes it to 0, so "every probe ≤ BLACK_EPS" is a true
// blackout even before the basemap loads. A hidden tab sets frameloop
// "never", so the wrapped render simply doesn't run — no wall-clock timers
// anywhere, backgrounding can't trip it. Steady-state cost is the single
// center readPixels per frame (the GL error drain unhooks with the boot
// window) — trivial next to the composer's own passes.
//
// Recovery from a tripped state is manual by design (the failure modes are
// permanent, not transient): sessionStorage.removeItem("fw:composer-fallback")
// and reload, or just open a new tab. Known limitation: the fallback keeps
// this context's antialias:false (Canvas gl props are fixed at creation), so
// the healed page is slightly more aliased than a native phone boot —
// legibility over beauty in a failure state.

import type { EffectComposer as EffectComposerImpl } from "postprocessing";

export type WatchdogReason = "gl-errors" | "black-frames" | "black-flicker";

export const FALLBACK_KEY = "fw:composer-fallback";

const PROBE_FRAMES = 120; // ~2 s at 60 fps: the boot window for the GL-error probe
const SKIP_FRAMES = 5; // context warm-up
const BLACK_TRIP = 30; // consecutive all-black frames ≈ half a second
const ERROR_TRIP = 20; // frames with any GL error (SMAA-class bugs err every frame)
const FLICKER_TRIP = 3; // distinct transient blackouts — three strobes is a pattern
const BLACK_EPS = 2; // per-channel 0..255

/** Live counters for ?debug and the smoke harness (dev/handles.ts exposes it). */
export const WATCHDOG_STATS = {
  frames: 0,
  glErrorFrames: 0,
  blackFrames: 0,
  blackEvents: 0,
  tripped: null as WatchdogReason | null,
};

export function storedFallback(): WatchdogReason | null {
  try {
    const v = sessionStorage.getItem(FALLBACK_KEY);
    return v === "gl-errors" || v === "black-frames" || v === "black-flicker" ? v : null;
  } catch {
    return null; // private mode / storage disabled
  }
}

// Center + the four quadrant midpoints — cheap, and no palette or camera
// framing leaves all five on a black pixel while the page is healthy. The
// center point doubles as the steady-state sentinel: only when IT reads black
// do the other four get read at all.
const PROBE_POINTS: ReadonlyArray<readonly [number, number]> = [
  [0.5, 0.5],
  [0.25, 0.25],
  [0.75, 0.25],
  [0.25, 0.75],
  [0.75, 0.75],
];

export function armComposerWatchdog(
  composer: EffectComposerImpl,
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  // Injected (Composer.tsx passes useUi's setter) — the watchdog stays
  // store-agnostic so trains/store.ts can import storedFallback() without a
  // circular module edge.
  onTrip: (reason: WatchdogReason) => void
): void {
  if (WATCHDOG_STATS.tripped) return;
  const original = composer.render.bind(composer);
  const px = new Uint8Array(4);
  let frame = 0;
  let consecutiveBlack = 0;
  let errorFrames = 0;
  let blackEvents = 0;

  const trip = (reason: WatchdogReason) => {
    WATCHDOG_STATS.tripped = reason;
    composer.render = original;
    try {
      sessionStorage.setItem(FALLBACK_KEY, reason);
    } catch {
      /* private mode — the fallback still holds for this page's lifetime */
    }
    console.warn(
      `[sound-and-rail] composer watchdog tripped (${reason}) — falling back to composer off`
    );
    onTrip(reason);
  };

  const probeBlack = (): boolean => {
    // The final pass just rendered to screen, so the default framebuffer is
    // bound and still valid this frame.
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    for (const [fx, fy] of PROBE_POINTS) {
      gl.readPixels((w * fx) | 0, (h * fy) | 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      if (px[0] > BLACK_EPS || px[1] > BLACK_EPS || px[2] > BLACK_EPS) return false;
      // Anything past the center sentinel only runs on a black center pixel —
      // a healthy frame pays for exactly one 1×1 readPixels.
    }
    return true;
  };

  composer.render = (deltaTime?: number) => {
    original(deltaTime);

    frame++;
    WATCHDOG_STATS.frames = frame;
    if (frame <= SKIP_FRAMES) return;

    // (a) The SMAA-class signature: gl.getError() != NO_ERROR frame after
    // frame — boot window only (the broken configs err from frame 1). Drain
    // the flag queue (WebGL holds several) but bound the loop.
    if (frame <= PROBE_FRAMES) {
      let sawError = false;
      for (let i = 0; i < 8 && gl.getError() !== gl.NO_ERROR; i++) sawError = true;
      if (sawError) {
        errorFrames++;
        WATCHDOG_STATS.glErrorFrames = errorFrames;
        if (errorFrames >= ERROR_TRIP) return trip("gl-errors");
      }
    }

    // (b) The MSAA-class signature (a page that composites to black and stays
    // there) and (c) the flicker signature (single presented frames going
    // black, then recovering) — armed for the life of the page.
    if (probeBlack()) {
      consecutiveBlack++;
      WATCHDOG_STATS.blackFrames = Math.max(WATCHDOG_STATS.blackFrames, consecutiveBlack);
      if (consecutiveBlack === 1) {
        blackEvents++;
        WATCHDOG_STATS.blackEvents = blackEvents;
        if (blackEvents >= FLICKER_TRIP) return trip("black-flicker");
      }
      if (consecutiveBlack >= BLACK_TRIP) return trip("black-frames");
    } else {
      consecutiveBlack = 0;
    }
  };
}
