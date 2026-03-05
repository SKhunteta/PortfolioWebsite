import React, { useState } from "react";
import { EMOTIONS } from "./constants";

const DivergenceExplorer = ({ pairs }) => {
  const [selectedPair, setSelectedPair] = useState(null);
  const [sortBy, setSortBy] = useState("divergence");

  const sortedPairs = [...(pairs || [])].sort((a, b) => {
    if (sortBy === "divergence") {
      return (b.divergence_score || 0) - (a.divergence_score || 0);
    }
    return new Date(b.en_published) - new Date(a.en_published);
  });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between px-4">
        <h3 className="text-sm font-mono-maq text-maq-text-secondary">
          Emotion Divergence Explorer
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy("divergence")}
            className={`text-xs px-3 py-1 rounded font-mono-maq transition-colors ${
              sortBy === "divergence"
                ? "bg-maq-accent text-maq-bg"
                : "bg-maq-surface text-maq-text-secondary hover:text-maq-text"
            }`}
          >
            By Divergence
          </button>
          <button
            onClick={() => setSortBy("date")}
            className={`text-xs px-3 py-1 rounded font-mono-maq transition-colors ${
              sortBy === "date"
                ? "bg-maq-accent text-maq-bg"
                : "bg-maq-surface text-maq-text-secondary hover:text-maq-text"
            }`}
          >
            By Date
          </button>
        </div>
      </div>

      {/* Selected pair detail */}
      {selectedPair && (
        <div className="mx-4 p-4 bg-maq-surface-alt rounded-lg border border-maq-border">
          <div className="grid grid-cols-2 gap-6">
            {/* EN emotions */}
            <div>
              <p className="text-xs font-mono-maq text-maq-en mb-2">EN: {selectedPair.en_title}</p>
              <div className="space-y-1">
                {EMOTIONS.filter(e => e.key !== "neutral").map((emotion) => {
                  const val = selectedPair.en_emotions?.[emotion.key] || 0;
                  return (
                    <div key={emotion.key} className="flex items-center gap-2">
                      <span className="text-xs text-maq-text-muted w-16 font-mono-maq">{emotion.label}</span>
                      <div className="flex-1 h-2 bg-maq-bg rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${val * 100}%`, backgroundColor: emotion.color }}
                        />
                      </div>
                      <span className="text-xs text-maq-text-secondary w-10 text-right font-mono-maq">
                        {(val * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* ES emotions */}
            <div>
              <p className="text-xs font-mono-maq text-maq-es mb-2">ES: {selectedPair.es_title}</p>
              <div className="space-y-1">
                {EMOTIONS.filter(e => e.key !== "neutral").map((emotion) => {
                  const val = selectedPair.es_emotions?.[emotion.key] || 0;
                  return (
                    <div key={emotion.key} className="flex items-center gap-2">
                      <span className="text-xs text-maq-text-muted w-16 font-mono-maq">{emotion.label}</span>
                      <div className="flex-1 h-2 bg-maq-bg rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${val * 100}%`, backgroundColor: emotion.color }}
                        />
                      </div>
                      <span className="text-xs text-maq-text-secondary w-10 text-right font-mono-maq">
                        {(val * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pairs table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-maq-border">
              <th className="text-left py-2 px-4 text-xs text-maq-text-muted font-mono-maq font-normal">EN Headline</th>
              <th className="text-left py-2 px-4 text-xs text-maq-text-muted font-mono-maq font-normal">ES Headline</th>
              <th className="text-right py-2 px-4 text-xs text-maq-text-muted font-mono-maq font-normal">Match</th>
              <th className="text-right py-2 px-4 text-xs text-maq-text-muted font-mono-maq font-normal">Divergence</th>
            </tr>
          </thead>
          <tbody>
            {sortedPairs.map((pair, idx) => (
              <tr
                key={idx}
                onClick={() => setSelectedPair(pair)}
                className={`border-b border-maq-border/50 cursor-pointer transition-colors ${
                  selectedPair === pair
                    ? "bg-maq-surface-alt"
                    : "hover:bg-maq-surface"
                }`}
              >
                <td className="py-2 px-4 text-maq-text text-xs">{pair.en_title}</td>
                <td className="py-2 px-4 text-maq-text text-xs">{pair.es_title}</td>
                <td className="py-2 px-4 text-right text-xs font-mono-maq text-maq-text-secondary">
                  {pair.match_score ? `${(pair.match_score * 100).toFixed(0)}%` : "—"}
                </td>
                <td className="py-2 px-4 text-right text-xs font-mono-maq text-maq-accent">
                  {pair.divergence_score ? pair.divergence_score.toFixed(2) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(!pairs || pairs.length === 0) && (
        <p className="text-center text-maq-text-muted text-xs font-mono-maq py-10">
          No divergence data available yet
        </p>
      )}
    </div>
  );
};

export default DivergenceExplorer;
