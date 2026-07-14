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
import { setWeatherOverride, WeatherKind } from "../world/weather";
import { TIER } from "../world/device";

const stats = {
  fps: 0,
  mode: "connecting",
  trains: 0,
  tier: TIER,
  hover: null as string | null,
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
