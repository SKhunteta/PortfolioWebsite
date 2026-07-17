// The watchdog's trip rules, pinned. The failure modes it guards are only
// visible on real GPUs (SwiftShader passed every historically broken
// composer config), so these tests drive the wrapper with a mock GL context
// and assert the counting logic itself: boot-window GL errors, persistent
// black, and the transient single-frame flicker (Jul 16 iPad/desktop strobe).

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EffectComposer } from "postprocessing";

type WatchdogModule = typeof import("../watchdog");

// Fresh module per test — WATCHDOG_STATS.tripped is page-lifetime state by
// design, which would otherwise leak between tests.
async function freshWatchdog(): Promise<WatchdogModule> {
  vi.resetModules();
  return import("../watchdog");
}

function makeGl(state: { black: boolean; error: number }) {
  return {
    NO_ERROR: 0,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    drawingBufferWidth: 200,
    drawingBufferHeight: 100,
    getError: () => {
      const e = state.error;
      state.error = 0; // the flag queue drains on read
      return e;
    },
    readPixels: (
      _x: number,
      _y: number,
      _w: number,
      _h: number,
      _fmt: number,
      _type: number,
      px: Uint8Array
    ) => {
      px.set(state.black ? [0, 0, 0, 255] : [212, 190, 156, 255]);
    },
  } as unknown as WebGL2RenderingContext;
}

function makeComposer(): EffectComposer {
  return { render: () => {} } as unknown as EffectComposer;
}

const WARMUP = 5; // SKIP_FRAMES in watchdog.ts

describe("composer watchdog", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("three transient single-frame blackouts trip black-flicker", async () => {
    const { armComposerWatchdog, WATCHDOG_STATS } = await freshWatchdog();
    const state = { black: false, error: 0 };
    const composer = makeComposer();
    const onTrip = vi.fn();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    armComposerWatchdog(composer, makeGl(state), onTrip);

    for (let i = 0; i < WARMUP + 10; i++) composer.render();
    for (let flash = 0; flash < 3 && !WATCHDOG_STATS.tripped; flash++) {
      state.black = true;
      composer.render(); // one black presented frame…
      state.black = false;
      for (let i = 0; i < 20; i++) composer.render(); // …then a healthy stretch
    }

    expect(WATCHDOG_STATS.blackEvents).toBe(3);
    expect(WATCHDOG_STATS.tripped).toBe("black-flicker");
    expect(onTrip).toHaveBeenCalledWith("black-flicker");
  });

  it("one blackout that recovers does NOT trip (a lone dropped frame is not a pattern)", async () => {
    const { armComposerWatchdog, WATCHDOG_STATS } = await freshWatchdog();
    const state = { black: false, error: 0 };
    const composer = makeComposer();
    const onTrip = vi.fn();
    armComposerWatchdog(composer, makeGl(state), onTrip);

    for (let i = 0; i < WARMUP + 10; i++) composer.render();
    state.black = true;
    composer.render();
    composer.render(); // a two-frame blackout is still one event
    state.black = false;
    for (let i = 0; i < 200; i++) composer.render();

    expect(WATCHDOG_STATS.blackEvents).toBe(1);
    expect(WATCHDOG_STATS.tripped).toBeNull();
    expect(onTrip).not.toHaveBeenCalled();
  });

  it("persistent black trips black-frames after ~half a second", async () => {
    const { armComposerWatchdog, WATCHDOG_STATS } = await freshWatchdog();
    const state = { black: true, error: 0 };
    const composer = makeComposer();
    const onTrip = vi.fn();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    armComposerWatchdog(composer, makeGl(state), onTrip);

    for (let i = 0; i < WARMUP + 30 && !WATCHDOG_STATS.tripped; i++) composer.render();

    expect(WATCHDOG_STATS.tripped).toBe("black-frames");
    expect(onTrip).toHaveBeenCalledWith("black-frames");
  });

  it("the flicker sentinel outlives the boot window", async () => {
    const { armComposerWatchdog, WATCHDOG_STATS } = await freshWatchdog();
    const state = { black: false, error: 0 };
    const composer = makeComposer();
    const onTrip = vi.fn();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    armComposerWatchdog(composer, makeGl(state), onTrip);

    // Sail far past the 120-frame boot window, healthy the whole way.
    for (let i = 0; i < 1000; i++) composer.render();

    for (let flash = 0; flash < 3 && !WATCHDOG_STATS.tripped; flash++) {
      state.black = true;
      composer.render();
      state.black = false;
      for (let i = 0; i < 300; i++) composer.render();
    }

    expect(WATCHDOG_STATS.tripped).toBe("black-flicker");
  });

  it("persistent GL errors in the boot window trip gl-errors", async () => {
    const { armComposerWatchdog, WATCHDOG_STATS } = await freshWatchdog();
    const state = { black: false, error: 0 };
    const gl = makeGl(state);
    const composer = makeComposer();
    const onTrip = vi.fn();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    armComposerWatchdog(composer, gl, onTrip);

    for (let i = 0; i < WARMUP + 25 && !WATCHDOG_STATS.tripped; i++) {
      state.error = 0x0502; // GL_INVALID_OPERATION, re-raised every frame
      composer.render();
    }

    expect(WATCHDOG_STATS.tripped).toBe("gl-errors");
    expect(onTrip).toHaveBeenCalledWith("gl-errors");
  });
});
