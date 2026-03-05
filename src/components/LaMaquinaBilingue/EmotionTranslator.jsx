import React, { useState } from "react";
import { EMOTIONS } from "./constants";

const EmotionTranslator = ({ analyzeHeadline }) => {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setAnalyzing(true);
    const data = await analyzeHeadline(input.trim());
    setResult(data);
    setAnalyzing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-mono-maq text-maq-text">
          Emotion Translator
        </h3>
        <p className="text-xs text-maq-text-secondary font-mono-maq">
          Paste any headline. See how it feels emotionally — and how it might feel in the other language.
        </p>
      </div>

      {/* Input */}
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste a headline in English or Spanish..."
          className="w-full bg-maq-surface border border-maq-border rounded-lg px-4 py-3 text-sm text-maq-text font-mono-maq placeholder:text-maq-text-muted focus:outline-none focus:border-maq-accent resize-none"
          rows={2}
        />
        <button
          onClick={handleAnalyze}
          disabled={analyzing || !input.trim()}
          className="absolute bottom-3 right-3 px-4 py-1.5 bg-maq-accent text-maq-bg text-xs font-mono-maq rounded hover:bg-maq-accent/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {analyzing ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-maq-surface rounded-lg border border-maq-border p-6 space-y-4">
          {/* Detected language */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-maq-text-muted font-mono-maq">Detected:</span>
            <span
              className="text-xs font-mono-maq font-bold"
              style={{ color: result.language === "en" ? "#58A6FF" : "#F0883E" }}
            >
              {result.language === "en" ? "English" : "Español"}
            </span>
            {result.latency_ms && (
              <span className="text-xs text-maq-text-muted font-mono-maq ml-auto">
                {result.latency_ms}ms
              </span>
            )}
          </div>

          {/* Emotion bars */}
          <div className="space-y-2">
            {EMOTIONS.filter((e) => e.key !== "neutral")
              .sort((a, b) => (result.emotions?.[b.key] || 0) - (result.emotions?.[a.key] || 0))
              .map((emotion) => {
                const value = result.emotions?.[emotion.key] || 0;
                return (
                  <div key={emotion.key} className="flex items-center gap-3">
                    <span className="text-xs text-maq-text-secondary w-16 font-mono-maq">
                      {emotion.label}
                    </span>
                    <div className="flex-1 h-3 bg-maq-bg rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(value * 100, 1)}%`,
                          backgroundColor: emotion.color,
                        }}
                      />
                    </div>
                    <span className="text-xs text-maq-text-secondary w-12 text-right font-mono-maq">
                      {(value * 100).toFixed(1)}%
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmotionTranslator;
