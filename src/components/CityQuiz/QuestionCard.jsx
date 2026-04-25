import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "./constants";

const QuestionCard = ({ question, index, total, onAnswer, onNext }) => {
  const [selected, setSelected] = useState(null);
  const revealed = selected !== null;
  const correct = selected === question.correctIndex;

  const handlePick = (i) => {
    if (revealed) return;
    setSelected(i);
    onAnswer(i === question.correctIndex);
  };

  const handleNext = () => {
    setSelected(null);
    onNext();
  };

  const categoryColor = CATEGORY_COLORS[question.category] || "#475569";
  const categoryLabel = CATEGORY_LABELS[question.category] || question.category;

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="flex items-center justify-between mb-4">
        <span
          className="text-xs uppercase tracking-widest text-gray-500"
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
        >
          Question {index + 1} of {total}
        </span>
        <span
          className="text-xs font-medium px-2 py-1 rounded-full text-white"
          style={{
            backgroundColor: categoryColor,
            fontFamily: '"DM Sans", system-ui, sans-serif',
          }}
        >
          {categoryLabel}
        </span>
      </div>

      <h2
        className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6 leading-snug"
        style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
      >
        {question.question}
      </h2>

      <div className="space-y-3 mb-6">
        {question.options.map((option, i) => {
          const isCorrectOption = i === question.correctIndex;
          const isPicked = selected === i;
          let style =
            "border-gray-300 bg-white text-gray-900 hover:border-gray-900 hover:bg-gray-50";
          if (revealed) {
            if (isCorrectOption) {
              style = "border-green-600 bg-green-50 text-green-900";
            } else if (isPicked) {
              style = "border-red-600 bg-red-50 text-red-900";
            } else {
              style = "border-gray-200 bg-gray-50 text-gray-500";
            }
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => handlePick(i)}
              disabled={revealed}
              className={`w-full text-left px-4 py-3 rounded-md border-2 transition-colors ${style} disabled:cursor-default`}
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              <span className="font-mono text-xs mr-3 opacity-60">
                {String.fromCharCode(65 + i)}
              </span>
              {option}
              {revealed && isCorrectOption && (
                <span className="ml-2 text-green-700">✓</span>
              )}
              {revealed && isPicked && !isCorrectOption && (
                <span className="ml-2 text-red-700">✗</span>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-md bg-gray-50 border border-gray-200 p-4 mb-4"
          >
            <p
              className="text-sm font-semibold mb-1"
              style={{
                fontFamily: '"DM Sans", system-ui, sans-serif',
                color: correct ? "#15803D" : "#B91C1C",
              }}
            >
              {correct ? "Correct!" : "Not quite."}
            </p>
            <p
              className="text-sm text-gray-700 mb-2"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              {question.explanation}
            </p>
            {question.sources && question.sources.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {question.sources.map((src, i) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-700 hover:underline"
                    style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                  >
                    {src.title || src.url}
                  </a>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {revealed && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2.5 rounded-md bg-gray-900 text-white font-medium hover:bg-gray-700 transition-colors"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            {index + 1 === total ? "See your score" : "Next question →"}
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default QuestionCard;
