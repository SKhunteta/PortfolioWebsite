// Dev/test handles, meow-9 style. The smoke harness and curious consoles
// read __linkMapStats; __linkMap pokes the piece.

import { TRAINS, useUi } from "../trains/store";
import { setPhaseOverride } from "../world/sun";
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
    setWeather: (k: WeatherKind | null) => setWeatherOverride(k),
    follow: (index: number) => {
      const ids = [...TRAINS.keys()];
      useUi.getState().setFollowTrain(ids[index] ?? null);
    },
    followId: (id: string) => useUi.getState().setFollowTrain(id),
    release: () => useUi.getState().setFollowTrain(null),
    // For the smoke harness: pick a train on a known curve deterministically.
    trainList: () =>
      [...TRAINS.values()].map((t) => ({
        id: t.id,
        lineId: t.lineId,
        directionId: t.dir.directionId,
        s: t.sRendered,
      })),
  };
}
