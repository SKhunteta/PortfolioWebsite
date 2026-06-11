import React, { useState } from "react";
import StatCard from "./StatCard";

const SANS = '"DM Sans", system-ui, sans-serif';
const MONO = '"JetBrains Mono", "IBM Plex Mono", monospace';

const formatValue = (n, kind, unit) => {
  if (kind === "percent") return `${Math.round(n)}%`;
  if (kind === "money_millions") return `$${Math.round(n).toLocaleString()}M`;
  if (kind === "count") return `${Math.round(n).toLocaleString()}${unit ? ` ${unit}` : ""}`;
  return `${Math.round(n).toLocaleString()}${unit ? ` ${unit}` : ""}`;
};

// Custom slider thumb: the default range thumb is too small a touch target on
// phones, so this enlarges it to a 28px circle (≥44px including track height).
const SLIDER_CSS = `
.aichip-range { -webkit-appearance: none; appearance: none; background: transparent; }
.aichip-range::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: #E0DACF; }
.aichip-range::-moz-range-track { height: 4px; border-radius: 2px; background: #E0DACF; }
.aichip-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 28px; height: 28px; margin-top: -12px; border-radius: 9999px; background: #1A1A1A; border: 3px solid #F3EFE8; box-shadow: 0 1px 4px rgba(0,0,0,0.25); cursor: pointer; }
.aichip-range::-moz-range-thumb { width: 28px; height: 28px; border-radius: 9999px; background: #1A1A1A; border: 3px solid #F3EFE8; box-shadow: 0 1px 4px rgba(0,0,0,0.25); cursor: pointer; }
`;

// Estimate-before-reveal. Slider input (touch-first, no typing), then the stat
// card flips with the real figure and the reader's guess marked against it.
// `onReveal` reports the locked guess upward so the ending can recap every
// guess against the truth.
const GuessTheNumber = ({ guess, fact, reducedMotion = false, onReveal }) => {
  const [value, setValue] = useState(Math.round((guess.min + guess.max) / 2));
  const [revealed, setRevealed] = useState(false);
  // Once a guess is locked, the reader can collapse the reveal down to a compact
  // one-liner so the (tall) track + stat card don't force endless scrolling on a
  // phone. Starts expanded so the payoff still lands the moment they lock in.
  const [collapsed, setCollapsed] = useState(false);

  // The fact's numeric may be in raw units (e.g. dollars) while the slider
  // works in display units (e.g. $M); factScale converts between them.
  const scale = guess.factScale || 1;
  const truth = fact.numeric != null ? fact.numeric / scale : null;

  // Reduced-motion / linear article: just show the answer.
  if (reducedMotion) {
    return (
      <div className="rounded-lg border bg-white p-4" style={{ borderColor: "#E8E4DF" }}>
        <p className="text-sm mb-3" style={{ fontFamily: SANS, color: "#1A1A1A" }}>
          {guess.prompt}
        </p>
        <StatCard fact={fact} />
      </div>
    );
  }

  const pct = (n) => ((n - guess.min) / (guess.max - guess.min)) * 100;
  const truthPct = truth != null ? Math.max(0, Math.min(100, pct(truth))) : null;

  const lockIn = () => {
    setRevealed(true);
    if (onReveal) {
      onReveal({
        factId: fact.id,
        prompt: guess.prompt,
        guessed: value,
        truth,
        kind: guess.kind,
        unit: guess.unit,
      });
    }
  };

  return (
    <div className="rounded-lg border bg-white p-4 sm:p-5" style={{ borderColor: "#E8E4DF" }}>
      <style>{SLIDER_CSS}</style>
      <p className="text-sm font-medium mb-4" style={{ fontFamily: SANS, color: "#1A1A1A" }}>
        {guess.prompt}
      </p>

      {!revealed ? (
        <>
          <p className="text-3xl sm:text-4xl font-bold mb-3" style={{ fontFamily: '"DM Serif Display", Georgia, serif', color: "#1A1A1A" }}>
            {formatValue(value, guess.kind, guess.unit)}
          </p>
          <input
            type="range"
            min={guess.min}
            max={guess.max}
            step={guess.step}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            aria-label={guess.prompt}
            className="aichip-range w-full h-8 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] mt-1" style={{ fontFamily: MONO, color: "#B8B2AA" }}>
            <span>{formatValue(guess.min, guess.kind, guess.unit)}</span>
            <span>{formatValue(guess.max, guess.kind, guess.unit)}</span>
          </div>
          <button
            type="button"
            onClick={lockIn}
            className="mt-4 w-full rounded-md px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2"
            style={{ fontFamily: SANS, backgroundColor: "#1A1A1A", color: "#FAFAF7" }}
          >
            Lock in your guess
          </button>
        </>
      ) : (
        <>
          {/* Summary + minimize toggle. Always visible once locked so the reader
              can collapse/expand the details without losing what they guessed. */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-xs" style={{ fontFamily: SANS, color: "#6B6B6B" }}>
              You guessed <strong style={{ color: "#1A1A1A" }}>{formatValue(value, guess.kind, guess.unit)}</strong>
              {collapsed && (
                <>
                  {" · actual "}
                  <strong style={{ color: "#1A1A1A" }}>{fact.value}</strong>
                </>
              )}
              .
            </p>
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Show the details" : "Minimize the details"}
              className="shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2"
              style={{ fontFamily: SANS, color: "#6B6B6B", backgroundColor: "#F3EFE8" }}
            >
              {collapsed ? "Details" : "Minimize"}
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                aria-hidden="true"
                style={{
                  transform: collapsed ? "rotate(0deg)" : "rotate(180deg)",
                  transition: reducedMotion ? "none" : "transform 0.2s ease",
                }}
              >
                <path d="M2 3.5 L5 6.5 L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {!collapsed && (
            <>
              {/* Guess vs. truth track */}
              <div className="relative h-10 mb-4">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2" style={{ backgroundColor: "#E8E4DF" }} />
                {/* Reader's guess */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${Math.max(0, Math.min(100, pct(value)))}%` }}
                >
                  <span className="w-3 h-3 rounded-full border-2 bg-white" style={{ borderColor: "#9A9A9A" }} />
                  <span className="text-[9px] mt-0.5 whitespace-nowrap" style={{ fontFamily: MONO, color: "#9A9A9A" }}>
                    you
                  </span>
                </div>
                {/* The truth */}
                {truthPct != null && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
                    style={{ left: `${truthPct}%` }}
                  >
                    <span className="w-0.5 h-5" style={{ backgroundColor: "#1A1A1A" }} />
                    <span className="text-[9px] mt-0.5 whitespace-nowrap font-semibold" style={{ fontFamily: MONO, color: "#1A1A1A" }}>
                      truth
                    </span>
                  </div>
                )}
              </div>

              <StatCard fact={fact} />
            </>
          )}
        </>
      )}
    </div>
  );
};

export { formatValue };
export default GuessTheNumber;
