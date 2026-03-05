import React from "react";
import { Link } from "react-router-dom";

const PREVIEW_EMOTIONS = [
  { label: "Anger", labelEs: "Ira", en: 0.42, es: 0.18, color: "#F85149" },
  { label: "Fear", labelEs: "Miedo", en: 0.15, es: 0.38, color: "#D29922" },
  { label: "Joy", labelEs: "Alegría", en: 0.08, es: 0.22, color: "#3FB950" },
  { label: "Sadness", labelEs: "Tristeza", en: 0.25, es: 0.12, color: "#58A6FF" },
];

const MaquinaTeaser = () => {
  return (
    <div className="section-container py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-xl overflow-hidden shadow-custom-lg"
          style={{ backgroundColor: "#0D1117" }}
        >
          <div className="p-6 sm:p-8 md:p-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-baseline gap-3 mb-1">
                  <span
                    className="text-2xl sm:text-3xl font-bold tracking-tight"
                    style={{ fontFamily: '"IBM Plex Mono", monospace', color: "#E6EDF3" }}
                  >
                    La Máquina
                  </span>
                  <span
                    className="text-xs font-medium uppercase tracking-widest hidden sm:inline"
                    style={{ fontFamily: '"IBM Plex Mono", monospace', color: "#8B949E" }}
                  >
                    Bilingüe
                  </span>
                </div>
                <p
                  className="text-xs"
                  style={{ fontFamily: '"IBM Plex Mono", monospace', color: "#484F58" }}
                >
                  Cross-lingual emotion analysis &middot; EN / ES
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs px-2 py-0.5 rounded font-medium"
                  style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    color: "#58A6FF",
                    backgroundColor: "#58A6FF15",
                  }}
                >
                  EN
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded font-medium"
                  style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    color: "#F0883E",
                    backgroundColor: "#F0883E15",
                  }}
                >
                  ES
                </span>
              </div>
            </div>

            {/* Preview divergence bars */}
            <div className="space-y-3 mb-6">
              {PREVIEW_EMOTIONS.map((emotion) => (
                <div key={emotion.label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs"
                      style={{ fontFamily: '"IBM Plex Mono", monospace', color: emotion.color }}
                    >
                      {emotion.label} / {emotion.labelEs}
                    </span>
                    <span
                      className="text-xs"
                      style={{ fontFamily: '"IBM Plex Mono", monospace', color: "#484F58" }}
                    >
                      {emotion.en > emotion.es ? "EN +" : "ES +"}
                      {Math.abs(emotion.en - emotion.es).toFixed(0) * 100}%
                    </span>
                  </div>
                  <div className="flex gap-1 h-2">
                    <div
                      className="rounded-full"
                      style={{
                        width: `${emotion.en * 100}%`,
                        backgroundColor: "#58A6FF",
                        opacity: 0.7,
                      }}
                    />
                    <div
                      className="rounded-full"
                      style={{
                        width: `${emotion.es * 100}%`,
                        backgroundColor: "#F0883E",
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Description + CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p
                className="text-sm max-w-md"
                style={{ fontFamily: '"IBM Plex Mono", monospace', color: "#8B949E" }}
              >
                The same news feels different in Spanish. A cross-lingual emotion
                pipeline that names what bilingual readers already sense.
              </p>
              <Link
                to="/la-maquina-bilingue"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors shrink-0"
                style={{
                  fontFamily: '"IBM Plex Mono", monospace',
                  backgroundColor: "#58A6FF",
                  color: "#0D1117",
                }}
              >
                Enter La Máquina
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaquinaTeaser;
