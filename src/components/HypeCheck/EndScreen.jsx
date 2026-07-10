import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TERMS, CHOICE_LABELS, KNOWLEDGE_CUTOFF } from "./constants";

const DOT_STYLES = {
  alive: "bg-hype-alive",
  dead: "bg-hype-dead",
  fake: "bg-hype-fake",
};

const EndScreen = ({ game }) => {
  const reducedMotion = useReducedMotion();
  const { score, total, tier, answers, restart } = game;
  const answerFor = (termId) => answers.find((a) => a.termId === termId);

  return (
    <motion.section
      initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12"
    >
      <div className="text-center mb-10">
        <p className="text-hype-muted text-xs uppercase tracking-[0.3em] mb-3 font-sans-ele">
          Final verdict
        </p>
        <h2 className="text-hype-text text-3xl sm:text-5xl font-bold mb-3 font-sans-ele">
          {tier.title}
        </h2>
        <p className="text-hype-text/80 text-base sm:text-lg mb-2 font-sans-ele">
          {score} / {total} correct
        </p>
        <p className="text-hype-muted text-sm sm:text-base mb-8 font-sans-ele">
          {tier.blurb}
        </p>
        <button
          type="button"
          onClick={restart}
          className="inline-flex items-center justify-center min-h-[44px] px-8 py-3 rounded-md bg-hype-text text-hype-bg text-sm sm:text-base font-semibold font-sans-ele transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-hype-text focus-visible:ring-offset-2 focus-visible:ring-offset-hype-bg"
        >
          Face it again
        </button>
      </div>

      <h3 className="text-hype-text text-lg sm:text-xl font-bold mb-4 font-sans-ele">
        The field guide
      </h3>
      <ul className="space-y-3 mb-8">
        {TERMS.map((term) => {
          const a = answerFor(term.id);
          return (
            <li
              key={term.id}
              className="rounded-lg border border-hype-border bg-hype-surface/70 px-4 py-3 sm:px-5 sm:py-4"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                <span
                  className={`inline-block w-2 h-2 rounded-full self-center ${DOT_STYLES[term.category]}`}
                  aria-hidden="true"
                />
                <span className="text-hype-text font-semibold font-sans-ele">
                  &ldquo;{term.term}&rdquo;
                </span>
                <span className="text-hype-muted text-xs uppercase tracking-wider font-sans-ele">
                  {CHOICE_LABELS[term.category]}
                </span>
                {a && (
                  <span
                    className={`text-xs font-sans-ele ${a.correct ? "text-hype-alive" : "text-hype-dead"}`}
                  >
                    {a.correct ? "you called it" : "you missed it"}
                  </span>
                )}
              </div>
              <p className="text-hype-text/75 text-sm leading-relaxed font-sans-ele">
                {term.fact}{" "}
                <span className="text-hype-muted">({term.factDate})</span>
              </p>
            </li>
          );
        })}
      </ul>

      <p className="text-hype-muted text-xs text-center font-sans-ele">
        Facts as reported through {KNOWLEDGE_CUTOFF}. Given the subject
        matter, assume half of this is wrong by August.
      </p>
    </motion.section>
  );
};

export default EndScreen;
