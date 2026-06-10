import { useState } from "react";
import { Link } from "react-router-dom";
import EmotionMeter from "./EmotionMeter";
import EarningsCounter from "./EarningsCounter";
import { EMOTIONS } from "./constants";

const NeuralHUD = ({
  emotionLevels,
  dominantEmotion,
  earnings,
  contaminationActive,
  progressPercent,
  frozen,
  reducedMotion,
}) => {
  const [expanded, setExpanded] = useState(false);
  const dominant = EMOTIONS[dominantEmotion];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 bg-mr-surface/90 backdrop-blur border-b ${
        contaminationActive
          ? reducedMotion
            ? "border-mr-warning"
            : "border-mr-warning animate-mr-pulse-warning"
          : "border-mr-border"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-4">
          {/* Uplink status */}
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                contaminationActive ? "bg-mr-warning" : "bg-mr-accent"
              } ${reducedMotion ? "" : "animate-pulse"}`}
            />
            <span className="font-mono text-[10px] sm:text-xs tracking-widest text-mr-text-secondary uppercase truncate">
              {frozen
                ? "Uplink: disconnected"
                : contaminationActive
                  ? "Contamination detected"
                  : "Meridian uplink: active"}
            </span>
          </div>

          {/* Dominant emotion chip (mobile) + meters toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="md:hidden font-mono text-[10px] px-2 py-1 rounded border border-mr-border text-mr-text-secondary"
              aria-expanded={expanded}
            >
              <span style={{ color: dominant?.color }}>●</span>{" "}
              {dominant?.label ?? "—"} {expanded ? "▴" : "▾"}
            </button>
            <EarningsCounter earnings={earnings} frozen={frozen} />
            <Link
              to="/"
              className="font-mono text-[10px] uppercase tracking-wider text-mr-text-muted hover:text-mr-text-secondary transition-colors hidden sm:inline"
            >
              Exit
            </Link>
          </div>
        </div>

        {/* Meters: always visible on md+, expandable on mobile */}
        <div
          className={`${expanded ? "grid" : "hidden"} md:grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-1.5 pt-2`}
        >
          {Object.keys(EMOTIONS).map((emotion) => (
            <EmotionMeter
              key={emotion}
              emotion={emotion}
              level={emotionLevels[emotion] ?? 0}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
      </div>

      {/* Reading progress */}
      <div className="h-0.5 bg-mr-panel">
        <div
          className="h-full bg-mr-accent/60"
          style={{
            width: `${progressPercent}%`,
            transition: reducedMotion ? "none" : "width 0.6s ease-out",
          }}
        />
      </div>
    </header>
  );
};

export default NeuralHUD;
