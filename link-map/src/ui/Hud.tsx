// The quiet chrome: a title that fades once you settle in, the honest
// live/simulated/resting badge, a chase hint, and the ?debug readout.
// All DOM, outside the canvas.

import { useEffect, useState } from "react";
import { useUi, TRAINS, Mode } from "../trains/store";
import { TIER } from "../world/device";
import { HAS_BASEMAP } from "../map/basemap";

const MODE_LABEL: Record<Mode, string> = {
  live: "live",
  simulated: "simulated",
  resting: "resting",
  connecting: "tuning in…",
};

const MODE_HINT: Record<Mode, string> = {
  live: "real trains, right now",
  simulated: "synthesized from the timetable",
  resting: "the network sleeps",
  connecting: "",
};

export function Hud() {
  const mode = useUi((s) => s.mode);
  const following = useUi((s) => s.followTrainId);
  const [settled, setSettled] = useState(false);
  const [debug, setDebug] = useState<{ fps: number; trains: number } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 14000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("debug")) return;
    const id = setInterval(() => {
      const stats = (window as unknown as Record<string, { fps?: number }>).__linkMapStats;
      setDebug({ fps: Math.round(stats?.fps ?? 0), trains: TRAINS.size });
    }, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <div className={`hud-title ${settled ? "hud-settled" : ""}`}>
        <h1>The Link, Alive</h1>
        <p>Seattle light rail · a listening map</p>
      </div>

      <div className={`hud-badge hud-badge-${mode}`} title={MODE_HINT[mode]}>
        <span className="hud-dot" />
        {MODE_LABEL[mode]}
      </div>

      {following && <div className="hud-chase">following · esc to let go</div>}

      {/* ODbL attribution — shown only when OSM geography is on screen. */}
      {HAS_BASEMAP && <div className="hud-attrib">map data © OpenStreetMap</div>}

      {debug && (
        <div className="hud-debug">
          {debug.fps} fps · {TRAINS.size} trains · {mode} · {TIER}
        </div>
      )}
    </>
  );
}
