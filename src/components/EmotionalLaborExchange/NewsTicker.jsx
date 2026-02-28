import React from "react";
import { EMOTIONS } from "./constants";

const NewsTicker = ({ headlines }) => {
  if (!headlines || headlines.length === 0) return null;

  // Duplicate for seamless infinite scroll
  const doubled = [...headlines, ...headlines];

  return (
    <div className="overflow-hidden bg-white/60 border-y border-ele-border">
      <div className="flex animate-ticker-scroll hover:[animation-play-state:paused] whitespace-nowrap py-3">
        {doubled.map((headline, i) => {
          const emotionMeta = EMOTIONS[headline.emotion];
          const accentColor = emotionMeta?.accentColor || "#9CA3AF";
          const isUp = headline.impact === "up";

          return (
            <div
              key={i}
              className="inline-flex items-center gap-2 mx-6 font-sans-ele text-sm shrink-0"
            >
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: accentColor + "18",
                  color: accentColor,
                }}
              >
                {emotionMeta?.name || headline.emotion}
              </span>
              <span className="text-ele-text">{headline.text}</span>
              <span className={isUp ? "text-ele-up" : "text-ele-down"}>
                {isUp ? "\u25B2" : "\u25BC"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NewsTicker;
