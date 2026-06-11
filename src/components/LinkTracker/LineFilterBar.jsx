import React from "react";
import { LINES, LINES_FOR_ERA, ERAS } from "./constants";

const ERA_OPTIONS = [
  { id: ERAS.CURRENT, label: "Present" },
  { id: ERAS.FUTURE, label: "Future (ST3)" },
];

const LineFilterBar = ({ era, onSetEra, activeLines, onToggleLine }) => {
  return (
    <div className="border-b border-link-border bg-link-bg/80 backdrop-blur-sm sticky top-[52px] z-[1000]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Present / Future era toggle */}
          <div
            className="shrink-0 flex rounded-full border border-link-border overflow-hidden"
            role="group"
            aria-label="Map era"
          >
            {ERA_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onSetEra(opt.id)}
                aria-pressed={era === opt.id}
                className={`px-3 py-1.5 text-xs font-sans font-semibold transition-colors duration-150 cursor-pointer ${
                  era === opt.id
                    ? "bg-link-text text-white"
                    : "bg-transparent text-link-text-muted hover:text-link-text"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-link-border shrink-0 mx-1" />

          <span className="text-xs text-link-text-muted shrink-0 font-sans">
            Lines:
          </span>
          {LINES_FOR_ERA[era].map((key) => {
            const line = LINES[key];
            const isActive = activeLines.has(key);
            const termini = line.descriptions[era];
            return (
              <button
                key={key}
                onClick={() => onToggleLine(key)}
                title={termini || line.name}
                aria-pressed={isActive}
                className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all duration-200 border cursor-pointer"
                style={{
                  backgroundColor: isActive ? line.color : "transparent",
                  borderColor: line.color,
                  color: isActive ? "#FFFFFF" : line.color,
                  opacity: isActive ? 1 : 0.5,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: isActive ? "#FFFFFF" : line.color,
                  }}
                />
                {line.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LineFilterBar;
