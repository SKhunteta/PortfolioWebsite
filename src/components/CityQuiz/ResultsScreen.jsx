import React from "react";
import { motion } from "framer-motion";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "./constants";

const verdictFor = (pct) => {
  if (pct >= 0.9) return { title: "Local legend", emoji: "🏆" };
  if (pct >= 0.7) return { title: "You know your city", emoji: "🌆" };
  if (pct >= 0.5) return { title: "Solid resident", emoji: "🚶" };
  if (pct >= 0.3) return { title: "Rookie urbanist", emoji: "🗺️" };
  return { title: "Tourist mode", emoji: "📸" };
};

const ResultsScreen = ({ data, answers, onPlayAgain, onTryAnother }) => {
  const total = data.questions.length;
  const correctCount = answers.filter(Boolean).length;
  const pct = total > 0 ? correctCount / total : 0;
  const verdict = verdictFor(pct);

  const missed = data.questions
    .map((q, i) => ({ q, correct: answers[i] }))
    .filter((entry) => !entry.correct);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">{verdict.emoji}</div>
        <h2
          className="text-3xl sm:text-4xl font-bold mb-2"
          style={{ fontFamily: '"DM Serif Display", Georgia, serif', color: "#1A1A1A" }}
        >
          {verdict.title}
        </h2>
        <p
          className="text-lg text-gray-600"
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
        >
          You got <strong className="text-gray-900">{correctCount} of {total}</strong> right about{" "}
          <strong className="text-gray-900">{data.city}</strong>.
        </p>
      </div>

      {data.categoryCounts && Object.keys(data.categoryCounts).length > 0 && (
        <div className="mb-6">
          <p
            className="text-xs uppercase tracking-widest text-gray-500 mb-2"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            Categories covered
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.categoryCounts).map(([cat, count]) => (
              <span
                key={cat}
                className="text-xs px-2.5 py-1 rounded-full text-white"
                style={{
                  backgroundColor: CATEGORY_COLORS[cat] || "#475569",
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                }}
              >
                {CATEGORY_LABELS[cat] || cat} · {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {missed.length > 0 && (
        <div className="mb-8">
          <h3
            className="text-lg font-semibold text-gray-900 mb-3"
            style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
          >
            What you missed
          </h3>
          <div className="space-y-3">
            {missed.map(({ q }) => (
              <div
                key={q.id}
                className="rounded-md border border-gray-200 bg-white p-3"
              >
                <p
                  className="text-sm font-medium text-gray-900 mb-1"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  {q.question}
                </p>
                <p
                  className="text-sm text-green-700 mb-1"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  Answer: {q.options[q.correctIndex]}
                </p>
                <p
                  className="text-xs text-gray-600"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  {q.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.freshness?.asOf && (
        <p
          className="text-xs text-gray-400 mb-6 italic"
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
        >
          Facts as of {data.freshness.asOf}
          {data.freshness.unverified && " · partially unverified"}
          {data.freshness.volatileFacts?.length > 0 &&
            ` · volatile: ${data.freshness.volatileFacts.join(", ")}`}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onPlayAgain}
          className="flex-1 px-5 py-2.5 rounded-md bg-gray-900 text-white font-medium hover:bg-gray-700 transition-colors"
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
        >
          Replay {data.city}
        </button>
        <button
          type="button"
          onClick={onTryAnother}
          className="flex-1 px-5 py-2.5 rounded-md border border-gray-900 text-gray-900 font-medium hover:bg-gray-100 transition-colors"
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
        >
          Try another city
        </button>
      </div>
    </motion.div>
  );
};

export default ResultsScreen;
