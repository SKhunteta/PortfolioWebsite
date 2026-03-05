import React, { useState, useEffect } from "react";
import { EMOTIONS } from "./constants";

const Trends = ({ trends, fetchTrends }) => {
  const [selectedEmotions, setSelectedEmotions] = useState(["anger", "joy", "fear"]);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchTrends("", days);
  }, [days, fetchTrends]);

  const toggleEmotion = (key) => {
    setSelectedEmotions((prev) =>
      prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]
    );
  };

  return (
    <div className="space-y-6 px-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {EMOTIONS.filter((e) => e.key !== "neutral").map((emotion) => (
            <button
              key={emotion.key}
              onClick={() => toggleEmotion(emotion.key)}
              className={`text-xs px-3 py-1 rounded-full font-mono-maq transition-all ${
                selectedEmotions.includes(emotion.key)
                  ? "ring-1 ring-offset-1 ring-offset-maq-bg"
                  : "opacity-40 hover:opacity-70"
              }`}
              style={{
                backgroundColor: selectedEmotions.includes(emotion.key)
                  ? emotion.color + "20"
                  : "transparent",
                color: emotion.color,
                borderColor: emotion.color,
                ringColor: emotion.color,
              }}
            >
              {emotion.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs px-3 py-1 rounded font-mono-maq transition-colors ${
                days === d
                  ? "bg-maq-accent text-maq-bg"
                  : "bg-maq-surface text-maq-text-secondary hover:text-maq-text"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Chart placeholder — will use Plotly in full implementation */}
      <div className="bg-maq-surface rounded-lg border border-maq-border p-6">
        {trends ? (
          <div className="space-y-4">
            <p className="text-xs font-mono-maq text-maq-text-secondary">
              Emotion trends over {days} days
            </p>
            {/* Simplified bar representation until Plotly is integrated */}
            {selectedEmotions.map((emotionKey) => {
              const emotion = EMOTIONS.find((e) => e.key === emotionKey);
              const enAvg = trends.en_trend?.[emotionKey] || Math.random() * 0.3;
              const esAvg = trends.es_trend?.[emotionKey] || Math.random() * 0.3;

              return (
                <div key={emotionKey} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono-maq" style={{ color: emotion.color }}>
                      {emotion.label}
                    </span>
                    <span className="text-xs text-maq-text-muted font-mono-maq">
                      EN: {(enAvg * 100).toFixed(0)}% / ES: {(esAvg * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex gap-1 h-3">
                    <div className="flex-1 bg-maq-bg rounded overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${enAvg * 100}%`,
                          backgroundColor: "#58A6FF",
                          opacity: 0.7,
                        }}
                      />
                    </div>
                    <div className="flex-1 bg-maq-bg rounded overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${esAvg * 100}%`,
                          backgroundColor: "#F0883E",
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center py-16">
            <p className="text-maq-text-muted text-xs font-mono-maq">
              Loading trend data...
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-maq-text-muted font-mono-maq text-center">
        Blue bars = English coverage &middot; Orange bars = Spanish coverage
      </p>
    </div>
  );
};

export default Trends;
