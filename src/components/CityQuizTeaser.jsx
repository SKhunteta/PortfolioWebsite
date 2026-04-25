import React from "react";
import { Link } from "react-router-dom";

const SAMPLE_QUESTION = {
  question: "What year did Seattle's Pike Place Market open to the public?",
  options: ["1907", "1923", "1889", "1945"],
  correctIndex: 0,
};

const CityQuizTeaser = () => {
  return (
    <div className="section-container py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-xl overflow-hidden shadow-custom-lg"
          style={{ backgroundColor: "#FAFAF7" }}
        >
          <div className="p-6 sm:p-8 md:p-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-baseline gap-3 mb-1">
                  <span
                    className="text-2xl sm:text-3xl font-bold tracking-tight"
                    style={{
                      fontFamily: '"DM Serif Display", Georgia, serif',
                      color: "#1A1A1A",
                    }}
                  >
                    City Quiz
                  </span>
                  <span
                    className="text-xs font-medium uppercase tracking-widest hidden sm:inline"
                    style={{
                      fontFamily: '"DM Sans", system-ui, sans-serif',
                      color: "#6B6B6B",
                    }}
                  >
                    How well do you know your city?
                  </span>
                </div>
                <p
                  className="text-xs italic"
                  style={{
                    fontFamily: '"DM Sans", system-ui, sans-serif',
                    color: "#9A9A9A",
                  }}
                >
                  Claude researches it on the web, double-checks itself, then quizzes you.
                </p>
              </div>
              <span
                className="text-xs px-2 py-1 rounded border"
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  borderColor: "#E8E4DF",
                  color: "#059669",
                }}
              >
                NEW
              </span>
            </div>

            {/* Sample question preview (locked) */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
              <p
                className="text-xs uppercase tracking-widest text-gray-500 mb-2"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                Sample · History
              </p>
              <p
                className="text-base font-semibold text-gray-900 mb-3"
                style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
              >
                {SAMPLE_QUESTION.question}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SAMPLE_QUESTION.options.map((opt, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 rounded-md border border-gray-200 text-sm text-gray-700 bg-gray-50"
                    style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                  >
                    <span className="font-mono text-xs mr-2 opacity-60">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </div>
                ))}
              </div>
            </div>

            {/* Description + CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p
                className="text-sm max-w-md"
                style={{
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  color: "#6B6B6B",
                }}
              >
                Type any city — Claude will pull live web research, fact-check
                its own answers, and quiz you on ten things you maybe didn&apos;t know.
              </p>
              <Link
                to="/city-quiz"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors shrink-0"
                style={{
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  backgroundColor: "#1A1A1A",
                  color: "#FAFAF7",
                }}
              >
                Start the quiz
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CityQuizTeaser;
