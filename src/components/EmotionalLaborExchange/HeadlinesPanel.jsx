import React from "react";
import { EMOTIONS } from "./constants";

const HeadlinesPanel = ({ headlines }) => {
  if (!headlines || headlines.length === 0) return null;

  return (
    <section>
      <h2 className="font-serif text-xl text-ele-text mb-4">
        Market-Moving Headlines
      </h2>
      <div className="space-y-0 bg-white rounded-lg shadow-sm overflow-hidden">
        {headlines.map((headline, i) => {
          const emotionMeta = EMOTIONS[headline.emotion];
          const accentColor = emotionMeta?.accentColor || "#9CA3AF";
          const isUp = headline.impact === "up";

          return (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-3 border-l-3 border-b border-ele-border last:border-b-0"
              style={{ borderLeftWidth: "3px", borderLeftColor: accentColor }}
            >
              <span
                className={`mt-0.5 text-sm font-mono ${isUp ? "text-ele-up" : "text-ele-down"}`}
              >
                {isUp ? "\u25B2" : "\u25BC"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-sans-ele text-sm text-ele-text leading-snug">
                  {headline.text}
                </p>
              </div>
              <span
                className="shrink-0 px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: accentColor + "18",
                  color: accentColor,
                }}
              >
                {emotionMeta?.name || headline.emotion}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default HeadlinesPanel;
