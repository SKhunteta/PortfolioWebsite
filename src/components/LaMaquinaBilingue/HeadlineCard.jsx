import React from "react";
import { EMOTIONS, LANGUAGE_CONFIG } from "./constants";

const HeadlineCard = ({ title, source, emotions, language, publishedAt }) => {
  const langConfig = LANGUAGE_CONFIG[language];

  return (
    <div className="space-y-2">
      {/* Source + time */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-mono-maq font-medium"
          style={{ color: langConfig.color }}
        >
          {source}
        </span>
        {publishedAt && (
          <span className="text-xs text-maq-text-muted font-mono-maq">
            {new Date(publishedAt).toLocaleDateString(
              language === "es" ? "es-ES" : "en-US",
              { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
            )}
          </span>
        )}
      </div>

      {/* Headline text */}
      <p className="text-sm text-maq-text leading-snug">{title}</p>

      {/* Emotion mini-bar */}
      {emotions && (
        <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-maq-surface-alt">
          {EMOTIONS.filter((e) => e.key !== "neutral").map((emotion) => {
            const value = emotions[emotion.key] || 0;
            if (value < 0.05) return null;
            return (
              <div
                key={emotion.key}
                className="h-full rounded-full"
                style={{
                  backgroundColor: emotion.color,
                  width: `${Math.max(value * 100, 5)}%`,
                  opacity: 0.6 + value * 0.4,
                }}
                title={`${emotion.label}: ${(value * 100).toFixed(1)}%`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HeadlineCard;
