// Dev/test handles, meow-9 style. The smoke harness and curious consoles
// read __linkMapStats; __linkMap pokes the piece.

import { TRAINS, useUi } from "../trains/store";
import { UNDERGROUND_SITES } from "../stations/platformPulse";
import { FLIGHTS, airlinerPoseAt } from "../map/Airliners";
import { CLOCK } from "../world/clock";
import { setPhaseOverride } from "../world/sun";
import { startObserve, stopObserve, toggleObserve, setObserveReelPin } from "../world/observe";
import { setTideOverride } from "../world/tide";
import { setBloomOverride } from "../world/bloom";
import {
  setWeatherOverride,
  setStrikePin,
  WeatherKind,
  WEATHER,
  LIGHTNING,
} from "../world/weather";
import { TIER, PROFILE } from "../world/device";
import { setAudioEnabled } from "../audio/engine";
import { WATCHDOG_STATS } from "../fx/watchdog";

const stats = {
  fps: 0,
  mode: "connecting",
  trains: 0,
  tier: TIER,
  hover: null as string | null,
  // The live post stack: the tier's off/lite/full, or "off(fallback:…)" when
  // the composer watchdog tripped. watchdog is a live reference to its
  // counters ({frames, glErrorFrames, blackFrames, tripped}) — the smoke
  // harness fails on any nonzero error/black count.
  composer: PROFILE.composer as string,
  watchdog: WATCHDOG_STATS,
};

let frames = 0;
let windowStart = performance.now();

/** Called once per rendered frame (from App's StatsDriver). */
export function markFrame() {
  frames++;
  const now = performance.now();
  const elapsed = now - windowStart;
  if (elapsed >= 1000) {
    stats.fps = (frames * 1000) / elapsed;
    frames = 0;
    windowStart = now;
    stats.mode = useUi.getState().mode;
    stats.trains = TRAINS.size;
    stats.hover = useUi.getState().hoverStationId;
    const fallback = useUi.getState().composerFallback;
    stats.composer = fallback ? `off(fallback:${fallback})` : PROFILE.composer;
  }
}

export function installHandles() {
  const w = window as unknown as Record<string, unknown>;
  w.__linkMapStats = stats;
  w.__linkMap = {
    setPhase: (p: number | null) => setPhaseOverride(p),
    // Run the print through a whole day — the sweep lingers on sunset and hurries
    // through noon — while the camera flies its curated reel of the city (low
    // over the tunnel, riding the rail and the jets, past the cyclists and the
    // lake). Pass a boolean to force on/off.
    observe: (on?: boolean) => (on === undefined ? toggleObserve() : on ? startObserve() : stopObserve()),
    // Freeze the running sweep at a display day fraction (0..1; ~0.8 = the dusk
    // rail-to-Rainier vista) so a stop can be screenshotted without waiting for
    // the day to arrive. Pass null to unfreeze. Same effect as ?reel=.
    reelAt: (frac: number | null) => setObserveReelPin(frac),
    setTide: (level: number | null) => setTideOverride(level),
    setBloom: (level: number | null) => setBloomOverride(level),
    setWeather: (k: WeatherKind | null) => setWeatherOverride(k),
    // Live weather/lightning state for the smoke harness — lets a test wait
    // for the storm's next deterministic strike instead of screenshotting blind.
    weatherState: () => ({ ...WEATHER, ...LIGHTNING }),
    // Hold a bolt fully lit at a chosen seed (0..1 → screen position) so a
    // screenshot can catch the strike; strike(null) releases the pin.
    strike: (seed: number | null = 0.5) => setStrikePin(seed),
    // The ambient room tone (world-keyed Web Audio). Toggle from the console
    // as well as the HUD button; note a real user gesture is still needed the
    // first time for the browser to un-suspend the audio context.
    sound: (on: boolean) => setAudioEnabled(on),
    follow: (index: number) => {
      const ids = [...TRAINS.keys()];
      useUi.getState().setFollowTrain(ids[index] ?? null);
    },
    followId: (id: string) => useUi.getState().setFollowTrain(id),
    // Ride one of the airborne jets (index into Airliners' FLIGHTS).
    followPlane: (index: number) => useUi.getState().setFollowPlane(index),
    // Descend into an underground hall by station id — the camera holds over its
    // platform floor so the art fresco reads up through the paper (same mood a
    // double-tap on the hall engages). release() rises back out.
    dive: (id: string) => useUi.getState().setDiveStation(id),
    // The diveable underground halls and their platform-floor positions, for the
    // smoke harness / a curious console to descend deterministically.
    diveList: () => UNDERGROUND_SITES.map((s) => ({ id: s.id, x: s.x, z: s.z, y: s.y })),
    release: () => useUi.getState().setFollowTrain(null),
    // For the smoke harness / a curious console: the airborne jets' live world
    // positions, so a plane can be located and chased deterministically.
    planeList: () =>
      FLIGHTS.map((f, i) => {
        const p = airlinerPoseAt(f, CLOCK.t, { x: 0, z: 0, y: 0, yaw: 0, pitch: 0, roll: 0 });
        return { index: i, x: p.x, y: p.y, z: p.z };
      }),
    // For the smoke harness: pick a train on a known curve deterministically.
    trainList: () =>
      [...TRAINS.values()].map((t) => ({
        id: t.id,
        lineId: t.lineId,
        directionId: t.dir.directionId,
        s: t.sRendered,
        // Ridership: the eased ink weight, and the real feed occupancy (or null
        // when the estimate is carrying it) — see world/ridership.ts.
        load: t.load,
        occupancy: t.occupancy,
      })),
  };
}
