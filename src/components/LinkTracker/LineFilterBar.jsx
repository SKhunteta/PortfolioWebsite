import React from "react";
import { LINES, LINE_ORDER } from "./constants";

const LineFilterBar = ({ activeLines, onToggleLine, operationalOnly, onToggleOperational }) => {
  return (
    <div className="border-b border-link-border bg-link-bg/80 backdrop-blur-sm sticky top-[52px] z-[1000]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs text-link-text-muted shrink-0 font-sans">
            Lines:
          </span>
          {LINE_ORDER.map((key) => {
            const line = LINES[key];
            const isActive = activeLines.has(key);
            return (
              <button
                key={key}
                onClick={() => onToggleLine(key)}
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

          <div className="w-px h-5 bg-link-border shrink-0 mx-1" />

          <button
            onClick={onToggleOperational}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all duration-200 border cursor-pointer ${
              operationalOnly
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "bg-transparent border-link-border text-link-text-muted hover:text-link-text"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${operationalOnly ? "bg-white" : "bg-emerald-500"}`} />
            {operationalOnly ? "Operational Only" : "All Stations"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LineFilterBar;
