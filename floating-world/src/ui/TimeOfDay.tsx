// The quiet time-of-day dial: a subtle sun button in the top-right ink column
// that opens a thin slider to walk the print through any Seattle hour by hand.
// The piece normally keys to the REAL sun; this lets you pin the light where you
// like it — dawn wash, noon glare, lantern night — then hand it back with "live".
//
// It is a thin driver over the existing phase override (world/sun.ts): the slider
// is a 0..1 position across today's real Seattle solar day, mapped to the honest
// sun phase and pushed through setPhaseOverride, so water, kasumi, city lights —
// everything that reads sunPhase() — follows for free, exactly as ?phase= and
// observe mode do. Scrubbing quietly stops observe (the two can't both drive the
// sky), and "live" clears the pin back to the real sun.

import { useState } from "react";
import { setPhaseOverride, sunPhaseForFraction, seattleClockAt, seattleHourAt } from "../world/sun";
import { isObserving, stopObserve } from "../world/observe";

// A short word for the position so the dial reads like the rest of the HUD's
// prose, not a clock. The sun's phase saturates to full day for hours around
// solar noon (all of them would read "midday"), so the word is keyed to the
// actual Seattle wall-clock hour instead, with night/dawn/dusk still deferring
// to the real light so a dark winter afternoon doesn't call itself "evening".
function timeWord(frac: number): string {
  const p = sunPhaseForFraction(frac);
  const rising = sunPhaseForFraction(frac + 0.01) >= p;
  if (p < 0.1) return "night";
  if (p < 0.5) return rising ? "dawn" : "dusk";

  const hour = seattleHourAt(frac);
  if (hour < 11) return "morning";
  if (hour < 14) return "midday";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function TimeOfDay() {
  const [open, setOpen] = useState(false);
  // null = following the real sun; a number (0..1 across the solar day) = a
  // hand-pinned time.
  const [frac, setFrac] = useState<number | null>(null);

  const pinned = frac !== null;

  const scrub = (f: number) => {
    if (isObserving()) stopObserve(); // one hand on the sky at a time
    setFrac(f);
    setPhaseOverride(sunPhaseForFraction(f));
  };

  const toLive = () => {
    setFrac(null);
    setPhaseOverride(null);
  };

  return (
    <div className={`hud-time ${open ? "hud-time-open" : ""}`}>
      <button
        type="button"
        className={`hud-time-toggle ${pinned ? "hud-time-on" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Change the time of day"
        title={pinned ? "the light is pinned — tap to adjust" : "set the time of day"}
      >
        <span className="hud-dot" />
        {pinned ? timeWord(frac) : "time"}
      </button>

      {open && (
        <div className="hud-time-panel">
          <input
            className="hud-time-range"
            type="range"
            min={0}
            max={1}
            step={0.01}
            // Start a fresh scrub near solar noon (the bright washi) if unpinned.
            value={frac ?? 0.5}
            onChange={(e) => scrub(parseFloat(e.target.value))}
            aria-label="Time of day"
          />
          <div className="hud-time-readout">
            {pinned ? (
              <>
                <span>
                  {timeWord(frac)} · {seattleClockAt(frac)}
                </span>
                <button type="button" className="hud-time-live" onClick={toLive}>
                  live
                </button>
              </>
            ) : (
              <span>drag to set the light · now: live sun</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
