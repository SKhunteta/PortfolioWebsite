import React from "react";

const SANS = '"DM Sans", system-ui, sans-serif';
const MONO = '"JetBrains Mono", "IBM Plex Mono", monospace';

// Build the declarative (reduced-motion / linear-article) form of a choice.
export const choiceStatement = (choice) => {
  const live = choice.options.filter((o) => o.enabled);
  const names = live.map((o) => o.label);
  if (choice.oligopoly) {
    return `Suppliers available: ${names.join(", ")}.`;
  }
  if (choice.plural) {
    return `Many options compete here: ${names.join(", ")}.`;
  }
  if (live.length === 1) {
    return `There is one option: ${names[0]}.`;
  }
  return `Options: ${names.join(", ")}.`;
};

// The forced-choice spine. Exactly one enabled option at each chokepoint
// (except scene 1, which is genuinely plural, and scene 5's honest oligopoly).
const ForcedChoice = ({ choice, selectedId, onSelect, reducedMotion = false }) => {
  if (reducedMotion) {
    return (
      <div className="rounded-lg border bg-white p-4" style={{ borderColor: "#E8E4DF" }}>
        <p className="text-sm" style={{ fontFamily: SANS, color: "#1A1A1A" }}>
          {choiceStatement(choice)}
        </p>
      </div>
    );
  }

  const liveCount = choice.options.filter((o) => o.enabled).length;

  return (
    <div className="rounded-lg border bg-white p-4 sm:p-5" style={{ borderColor: "#E8E4DF" }}>
      <p className="text-[11px] uppercase tracking-widest mb-3" style={{ fontFamily: MONO, color: "#9A9A9A" }}>
        {choice.prompt}
      </p>

      <div className="flex flex-col gap-2">
        {choice.options.map((opt) => {
          const chosen = selectedId === opt.id;

          if (!opt.enabled) {
            // Tombstone: a company that exited or never arrived.
            return (
              <div
                key={opt.id}
                aria-disabled="true"
                className="rounded-md border px-3 py-2 opacity-60"
                style={{ borderColor: "#EAE6E0", backgroundColor: "#FAF8F5" }}
              >
                <span className="text-sm line-through" style={{ fontFamily: SANS, color: "#9A9A9A" }}>
                  {opt.label}
                </span>
                {opt.epitaph && (
                  <p className="text-[11px] mt-0.5 leading-snug" style={{ fontFamily: SANS, color: "#B0AAA1" }}>
                    {opt.epitaph}
                  </p>
                )}
              </div>
            );
          }

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              aria-pressed={chosen}
              className="rounded-md border px-3 py-2.5 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2"
              style={{
                fontFamily: SANS,
                borderColor: chosen ? "#1A1A1A" : "#D8D2C8",
                backgroundColor: chosen ? "#1A1A1A" : "#FFFFFF",
                color: chosen ? "#FAFAF7" : "#1A1A1A",
              }}
            >
              <span className="inline-flex items-center gap-2">
                {chosen && <span aria-hidden="true">✓</span>}
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      {selectedId && (
        <p className="text-[11px] mt-3 tracking-wide" style={{ fontFamily: MONO, color: "#047857" }}>
          {choice.selectedText}
        </p>
      )}

      {!selectedId && liveCount === 1 && (
        <p className="text-[11px] mt-3 tracking-wide" style={{ fontFamily: MONO, color: "#B8B2AA" }}>
          1 option available
        </p>
      )}
    </div>
  );
};

export default ForcedChoice;
