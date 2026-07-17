// The quiet chrome: a title that fades once you settle in, the honest
// live/simulated/resting badge, a chase hint, the ?debug readout — and the
// piece's one spoken sentence: an intro that tells you the trains are real,
// then gets out of the way. All DOM, outside the canvas.

import { useEffect, useRef, useState } from "react";
import { useUi, TRAINS, Mode } from "../trains/store";
import { STATION_BY_ID } from "../map/network";
import { identityForName } from "../stations/identity";
import { toggleObserve } from "../world/observe";
import { useAudioUi } from "../audio/engine";
import { useWeather } from "../world/weather";
import { TIER } from "../world/device";
import { SOUND_FEATURE_ENABLED, OBSERVE_FEATURE_ENABLED } from "../world/config";
import { HAS_BASEMAP } from "../map/basemap";
import { PrintFrame } from "./PrintFrame";
import { TimeOfDay } from "./TimeOfDay";

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

// The intro never lies either — each mode gets its own honest sentence.
function introText(mode: Mode, trainCount: number): string | null {
  const n = trainCount;
  switch (mode) {
    case "live":
      return n === 1
        ? "One train is on the tracks right now — this is it, live."
        : `${n} trains are on the tracks right now — these are them, live.`;
    case "simulated":
      return n === 1
        ? "The live feed is asleep — this one train runs on the real timetable, simulated and honest about it."
        : `The live feed is asleep — these ${n} trains run on the real timetable, simulated and honest about it.`;
    case "resting":
      return "The network is asleep. An empty map is the truth — trains return with the morning.";
    default:
      return null;
  }
}

export function Hud() {
  const mode = useUi((s) => s.mode);
  const following = useUi((s) => s.followTrainId);
  const followingPlane = useUi((s) => s.followPlaneIndex);
  const caption = useUi((s) => s.caption);
  const observing = useUi((s) => s.observing);
  const observeShotLabel = useUi((s) => s.observeShotLabel);
  const touring = useUi((s) => s.touring);
  const soundOn = useAudioUi((s) => s.enabled);
  const toggleSound = useAudioUi((s) => s.toggle);
  // The underground hall the camera has dived into — its name and real artwork
  // name the quiet caption while you're down there ("Capitol Hill · 'Jet Kiss'").
  const diveId = useUi((s) => s.diveStationId);
  const diveStation = diveId ? STATION_BY_ID.get(diveId) : undefined;
  const diveArt = diveStation ? identityForName(diveStation.name)?.art : undefined;
  // Speaks only after a real fetch (or a ?weather= pin) — see world/weather.
  const weatherWord = useWeather((s) => s.label);
  const [settled, setSettled] = useState(false);
  const [intro, setIntro] = useState<string | null>(null);
  const introDone = useRef(false);
  const [debug, setDebug] = useState<{
    fps: number;
    trains: number;
    composer: string;
    // Flicker forensics, readable on-device without a console: the train
    // feed guard's catch count and the composer watchdog's transient
    // blackout count (both live references on __linkMapStats).
    badFixes: number;
    blackEvents: number;
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 14000);
    return () => clearTimeout(t);
  }, []);

  // The one sentence, spoken once per visit: the moment the first poll
  // resolves, say what's real. The CSS animation carries the fade; unmount
  // after it ends.
  useEffect(() => {
    if (introDone.current || mode === "connecting") return;
    introDone.current = true;
    setIntro(introText(mode, TRAINS.size));
    const t = setTimeout(() => setIntro(null), 7000);
    return () => clearTimeout(t);
  }, [mode]);

  // Captions clear themselves after the fade so a remount can't resurrect
  // a stale arrival.
  useEffect(() => {
    if (!caption) return;
    const t = setTimeout(() => useUi.getState().setCaption(null), 8000);
    return () => clearTimeout(t);
  }, [caption]);

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("debug")) return;
    const id = setInterval(() => {
      const stats = (
        window as unknown as Record<
          string,
          {
            fps?: number;
            composer?: string;
            trainGuard?: { badFixes: number };
            watchdog?: { blackEvents: number };
          }
        >
      ).__linkMapStats;
      setDebug({
        fps: Math.round(stats?.fps ?? 0),
        trains: TRAINS.size,
        composer: stats?.composer ?? "?",
        badFixes: stats?.trainGuard?.badFixes ?? 0,
        blackEvents: stats?.watchdog?.blackEvents ?? 0,
      });
    }, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {/* The printed sheet's frame: seal-cartouches + foreground botany. */}
      <PrintFrame settled={settled} />

      <div className={`hud-title ${settled ? "hud-settled" : ""}`}>
        <h1>Sound &amp; Rail</h1>
        <p>Seattle light rail · a woodblock print in motion</p>
      </div>

      <div className={`hud-badge hud-badge-${mode}`} title={MODE_HINT[mode]}>
        <span className="hud-dot" />
        {MODE_LABEL[mode]}
      </div>

      {/* The weather word — real conditions, spoken as quietly as the badge. */}
      {weatherWord && <div className="hud-weather">{weatherWord}</div>}

      {intro && (
        <div
          className="hud-intro hud-intro-dismissable"
          onClick={() => setIntro(null)}
          role="button"
          tabIndex={0}
          aria-label="Dismiss"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setIntro(null);
          }}
        >
          <p>{intro}</p>
        </div>
      )}

      {caption && (
        <div key={caption.key} className="hud-caption">
          {caption.text}
        </div>
      )}

      {(following || followingPlane !== null) && (
        <div className="hud-chase">
          {followingPlane !== null ? "riding the jet" : "following"} · esc to let go
        </div>
      )}

      {/* Descended into an underground hall: name the place and its real artwork,
          with the way back out. Shares the chase line's styling. */}
      {diveStation && (
        <div className="hud-chase">
          {diveStation.name}
          {diveArt ? ` · ${diveArt}` : ""} · esc to rise
        </div>
      )}

      {/* The unattended tour's one quiet line: it says why the camera drifts
          the whole line on its own, and that any touch hands you the wheel.
          Suppressed while chasing (the two never overlap). */}
      {touring && !observing && !following && followingPlane === null && !diveId && (
        <div className="hud-tour">touring the line · move to take the wheel</div>
      )}

      {/* Observe's reel narrates where the slow cinematic flight has taken you —
          "the underground", "the cyclists", "riding the jet". Shares the quiet
          tour caption's styling; only up while Observe is panning. */}
      {observing && observeShotLabel && !following && followingPlane === null && !diveId && (
        <div className="hud-tour">{observeShotLabel}</div>
      )}

      {/* The optional day-runner: sweeps the print through a whole Seattle day
          and back, on demand. Off by default — the piece stays keyed to the
          real sun until you ask to watch it breathe. */}
      {OBSERVE_FEATURE_ENABLED && (
        <button
          type="button"
          className={`hud-observe ${observing ? "hud-observe-on" : ""}`}
          onClick={toggleObserve}
          aria-pressed={observing}
          title={
            observing
              ? "stop — return to the real sun over Seattle"
              : "run the print through a whole day"
          }
        >
          <span className="hud-dot" />
          {observing ? "observing" : "observe"}
        </button>
      )}

      {/* The manual time-of-day dial: pin the light to any Seattle hour by hand,
          or hand it back to the real sun. Subtle twin of the observe button,
          stacked just below it in the same top-right ink column. */}
      <TimeOfDay />

      {/* The room tone: a generative ambient print-hum keyed to the same sun,
          weather and trains as the paint. Off by default — a breathing sheet
          shouldn't ambush anyone with sound, and browsers block autoplay.
          Temporarily disabled via SOUND_FEATURE_ENABLED (world/config.ts) —
          code stays intact, just not exposed in the HUD right now. */}
      {SOUND_FEATURE_ENABLED && (
        <button
          type="button"
          className={`hud-sound ${soundOn ? "hud-sound-on" : ""}`}
          onClick={toggleSound}
          aria-pressed={soundOn}
          title={
            soundOn
              ? "mute — the print falls silent"
              : "let the print breathe — ambient sound keyed to the light"
          }
        >
          <span className="hud-dot" />
          {soundOn ? "sound" : "muted"}
        </button>
      )}

      {/* ODbL attribution — shown only when OSM geography is on screen. */}
      {HAS_BASEMAP && <div className="hud-attrib">map data © OpenStreetMap</div>}

      {debug && (
        <div className="hud-debug">
          {debug.fps} fps · {TRAINS.size} trains · {mode} · {TIER} · {debug.composer} · guard{" "}
          {debug.badFixes} · black {debug.blackEvents}
        </div>
      )}
    </>
  );
}
