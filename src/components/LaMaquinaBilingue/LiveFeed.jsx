import React from "react";
import HeadlineCard from "./HeadlineCard";
import { LANGUAGE_CONFIG } from "./constants";

const LiveFeed = ({ pairs, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-maq-text-secondary font-mono-maq text-sm">
          Loading headlines...
        </p>
      </div>
    );
  }

  if (!pairs || pairs.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-maq-text-secondary font-mono-maq text-sm mb-2">
          No matched pairs yet
        </p>
        <p className="text-maq-text-muted text-xs font-mono-maq">
          Pairs appear once the pipeline matches EN and ES headlines covering the same story
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Column headers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: LANGUAGE_CONFIG.en.color }}
          />
          <span className="text-sm font-mono-maq text-maq-text-secondary">
            {LANGUAGE_CONFIG.en.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: LANGUAGE_CONFIG.es.color }}
          />
          <span className="text-sm font-mono-maq text-maq-text-secondary">
            {LANGUAGE_CONFIG.es.label}
          </span>
        </div>
      </div>

      {/* Paired headlines */}
      {pairs.map((pair, idx) => (
        <div
          key={idx}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-maq-surface rounded-lg border border-maq-border hover:border-maq-accent/30 transition-colors"
        >
          <HeadlineCard
            title={pair.en_title}
            source={pair.en_source}
            emotions={pair.en_emotions}
            language="en"
            publishedAt={pair.en_published}
          />
          <HeadlineCard
            title={pair.es_title}
            source={pair.es_source}
            emotions={pair.es_emotions}
            language="es"
            publishedAt={pair.es_published}
          />
          {pair.match_score && (
            <div className="col-span-full flex justify-center">
              <span className="text-xs font-mono-maq text-maq-text-muted">
                Match: {(pair.match_score * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default LiveFeed;
