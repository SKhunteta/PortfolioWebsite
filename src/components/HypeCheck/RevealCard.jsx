import React, { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CHOICE_LABELS } from "./constants";

const CATEGORY_STYLES = {
  alive: "text-hype-alive border-hype-alive/40",
  dead: "text-hype-dead border-hype-dead/40",
  fake: "text-hype-fake border-hype-fake/40",
};

const RevealCard = ({ term, answer, isLast, onNext, nextLabel = "Next term" }) => {
  const reducedMotion = useReducedMotion();
  const nextRef = useRef(null);

  useEffect(() => {
    nextRef.current?.focus();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      aria-live="polite"
      className={`w-full max-w-xl mx-auto rounded-lg border bg-hype-surface/95 backdrop-blur px-5 py-5 sm:px-7 sm:py-6 text-left shadow-custom-lg ${CATEGORY_STYLES[term.category]}`}
    >
      <p className="text-xs uppercase tracking-[0.2em] mb-1 font-sans-ele">
        {answer.correct ? "Correct" : "Wrong"} — it&rsquo;s &ldquo;
        {CHOICE_LABELS[term.category].toLowerCase()}&rdquo;
      </p>
      <h3 className="text-hype-text text-xl sm:text-2xl font-bold mb-2 font-sans-ele">
        {term.verdictLabel}
      </h3>
      <p className="text-hype-text/80 text-sm sm:text-base leading-relaxed mb-1 font-sans-ele">
        {term.fact}
      </p>
      <p className="text-hype-muted text-xs mb-4 font-sans-ele">
        {term.factDate}
        {term.sources?.length > 0 && (
          <>
            {" · "}
            {term.sources.map((source, index) => (
              <React.Fragment key={source.url}>
                {index > 0 && ", "}
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 py-2 hover:text-hype-text transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-hype-text rounded-sm"
                >
                  {source.label}
                </a>
              </React.Fragment>
            ))}
          </>
        )}
      </p>
      <button
        ref={nextRef}
        type="button"
        onClick={onNext}
        className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-md bg-hype-text text-hype-bg text-sm font-semibold font-sans-ele transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-hype-text focus-visible:ring-offset-2 focus-visible:ring-offset-hype-surface"
      >
        {isLast ? "See the damage" : nextLabel}
      </button>
    </motion.div>
  );
};

export default RevealCard;
