import React, { useState } from "react";
import { getFact } from "./facts";
import { formatValue } from "./GuessTheNumber";

const SANS = '"DM Sans", system-ui, sans-serif';
const MONO = '"JetBrains Mono", "IBM Plex Mono", monospace';
const SERIF = '"DM Serif Display", Georgia, serif';

const SHARE_URL = "https://builtbyshrey.com/ai-chip";

// How far off a guess was, in words. Within 15% counts as close; otherwise the
// multiple is the story ("4x too high" is the shareable gap).
const verdict = (guessed, truth) => {
  if (truth == null || truth === 0) return null;
  const ratio = guessed / truth;
  if (ratio >= 0.85 && ratio <= 1.15) return "close";
  if (ratio > 1) return `${ratio >= 2 ? Math.round(ratio) : ratio.toFixed(1)}x too high`;
  const inv = 1 / ratio;
  return `${inv >= 2 ? Math.round(inv) : inv.toFixed(1)}x too low`;
};

const shareText = (entries) => {
  const lines = entries
    .map((e) => {
      const fact = getFact(e.factId);
      const v = verdict(e.guessed, e.truth);
      return `· ${fact.label}: I guessed ${formatValue(e.guessed, e.kind, e.unit)}, it's ${fact.value}${v && v !== "close" ? ` (${v})` : ""}`;
    })
    .join("\n");
  return `I traced an AI chip from Santa Clara to Quincy, Washington. My guesses against the supply chain:\n${lines}\n\nTrace it yourself: ${SHARE_URL}`;
};

// The ending's receipt: every guess the reader locked in, against the truth,
// with a share action. Renders nothing if the reader skipped every guess.
const RecapCard = ({ entries }) => {
  const [copied, setCopied] = useState(false);
  if (!entries || entries.length === 0) return null;

  const share = async () => {
    const text = shareText(entries);
    try {
      if (navigator.share) {
        await navigator.share({ title: "The Life of an AI Chip", text, url: SHARE_URL });
        return;
      }
    } catch {
      // fall through to clipboard (user may have dismissed the sheet)
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard unavailable; nothing else to do
    }
  };

  return (
    <div className="rounded-lg border bg-white p-4 sm:p-5 mt-4" style={{ borderColor: "#E8E4DF" }}>
      <p className="text-[11px] uppercase tracking-widest mb-3" style={{ fontFamily: MONO, color: "#9A9A9A" }}>
        Your guesses, against the supply chain
      </p>

      <ul className="flex flex-col divide-y" style={{ borderColor: "#F0ECE6" }}>
        {entries.map((e) => {
          const fact = getFact(e.factId);
          const v = verdict(e.guessed, e.truth);
          return (
            <li key={e.factId} className="py-2.5">
              <p className="text-xs mb-1" style={{ fontFamily: SANS, color: "#6B6B6B" }}>
                {fact.label}
              </p>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm" style={{ fontFamily: SANS, color: "#1A1A1A" }}>
                  you said <strong style={{ fontFamily: SERIF }}>{formatValue(e.guessed, e.kind, e.unit)}</strong>
                  {" · "}truth <strong style={{ fontFamily: SERIF }}>{fact.value}</strong>
                </span>
                {v && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                    style={{
                      fontFamily: MONO,
                      color: v === "close" ? "#047857" : "#92400E",
                      backgroundColor: v === "close" ? "#ECFDF5" : "#FFFBEB",
                    }}
                  >
                    {v}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={share}
        className="mt-4 w-full rounded-md px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2"
        style={{ fontFamily: SANS, backgroundColor: "#1A1A1A", color: "#FAFAF7" }}
      >
        {copied ? "Copied to clipboard" : "Share your gap"}
      </button>
    </div>
  );
};

export { verdict, shareText };
export default RecapCard;
