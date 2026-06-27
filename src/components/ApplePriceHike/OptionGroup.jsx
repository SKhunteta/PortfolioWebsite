import React from "react";
import { formatSigned } from "./pricing";
import { SF, MONO, COLORS } from "./theme";

// One ladder of upgrade rungs (memory or storage). Each rung shows the
// post-hike upcharge above the base config; the base rung is "Included".
// Modeled rungs carry a small dotted marker so nothing is mistaken for an
// exact, sourced figure.
const OptionGroup = ({ title, options, selected, onSelect, era = "after" }) => {
  if (!options || options.length === 0) return null;

  return (
    <div>
      <p
        className="text-[11px] uppercase tracking-widest mb-2"
        style={{ fontFamily: MONO, color: COLORS.muted }}
      >
        {title}
      </p>
      <div className="flex flex-col gap-2">
        {options.map((opt) => {
          const active = opt.gb === selected;
          const add = opt.add[era];
          const modeled = opt.confidence === "modeled" && add !== 0;
          return (
            <button
              key={opt.gb}
              onClick={() => onSelect(opt.gb)}
              aria-pressed={active}
              className="flex items-center justify-between rounded-xl border px-4 py-3 transition-all"
              style={{
                fontFamily: SF,
                borderColor: active ? COLORS.ink : COLORS.hairline,
                backgroundColor: active ? COLORS.surface : "transparent",
                boxShadow: active ? "0 2px 10px rgba(0,0,0,0.05)" : "none",
              }}
            >
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: COLORS.ink }}>
                  {opt.label}
                </span>
                {modeled && (
                  <span
                    title="Upgrade price modeled — Apple did not publish a tier table for the hike"
                    className="text-[10px] px-1.5 py-0.5 rounded-full border border-dotted"
                    style={{ fontFamily: MONO, color: COLORS.rise, borderColor: COLORS.rise }}
                  >
                    modeled
                  </span>
                )}
              </span>
              <span
                className="text-xs"
                style={{ fontFamily: MONO, color: add === 0 ? COLORS.muted : COLORS.ink }}
              >
                {add === 0 ? "Included" : formatSigned(add)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OptionGroup;
