// The sky dial: a quiet twin of the time-of-day dial, stacked below it in the
// top-right ink column. A toggle that opens a small tray of skies — clear,
// cloudy, fog, drizzle, rain, storm, snow — so a visitor (or a gallery docent)
// can paint any weather onto the print by hand, then give the sky back with
// "real".
//
// It is a thin driver over the existing weather override (world/weather.ts):
// each chip calls setWeatherOverride, so the washes, kasumi, umbrellas, snow
// dusting and the storm's lightning all follow for free, exactly as ?weather=
// does — and a hand-pinned sky still eases in like a wash, never a switch.
// The HUD's weather word carries "· by hand" while pinned, so a painted storm
// never claims to be the real one.

import { useState } from "react";
import { setWeatherOverride, weatherOverride, WeatherKind } from "../world/weather";

// Tray order walks the sky from dry to wild; the words stay lowercase prose
// like the rest of the HUD.
const SKIES: { kind: WeatherKind; word: string }[] = [
  { kind: "clear", word: "clear" },
  { kind: "cloudy", word: "cloudy" },
  { kind: "fog", word: "fog" },
  { kind: "drizzle", word: "drizzle" },
  { kind: "rain", word: "rain" },
  { kind: "storm", word: "storm" },
  { kind: "snow", word: "snow" },
];

export function WeatherDial() {
  const [open, setOpen] = useState(false);
  // null = following the real Seattle sky; a kind = a hand-painted one.
  // Starts pinned if the page loaded with ?weather=.
  const [pinned, setPinned] = useState<WeatherKind | null>(() => weatherOverride());

  const paint = (kind: WeatherKind) => {
    setPinned(kind);
    setWeatherOverride(kind);
  };

  const toReal = () => {
    setPinned(null);
    setWeatherOverride(null);
  };

  return (
    <div className={`hud-sky ${open ? "hud-sky-open" : ""}`}>
      <button
        type="button"
        className={`hud-sky-toggle ${pinned ? "hud-sky-on" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Change the weather"
        title={pinned ? "the sky is painted by hand — tap to adjust" : "paint the weather"}
      >
        <span className="hud-dot" />
        {pinned ?? "sky"}
      </button>

      {open && (
        <div className="hud-sky-panel">
          <div className="hud-sky-chips" role="group" aria-label="Weather">
            {SKIES.map(({ kind, word }) => (
              <button
                key={kind}
                type="button"
                className={`hud-sky-chip ${pinned === kind ? "hud-sky-chip-on" : ""}`}
                onClick={() => paint(kind)}
                aria-pressed={pinned === kind}
              >
                {word}
              </button>
            ))}
          </div>
          <div className="hud-sky-readout">
            {pinned ? (
              <>
                <span>{pinned} · by hand</span>
                <button type="button" className="hud-sky-real" onClick={toReal}>
                  real
                </button>
              </>
            ) : (
              <span>tap a sky · now: real weather</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
