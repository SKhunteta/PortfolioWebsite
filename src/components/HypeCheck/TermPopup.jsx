import React, { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import RevealCard from "./RevealCard";
import { CHOICES } from "./constants";

// Explore mode's question dialog. Opens over the cloud when a floating
// term is clicked: first the three verdict choices (closable without
// penalty), then the same RevealCard the quiz uses. Focus moves into
// the dialog on open; GameScene returns it to the cloud on close.
const TermPopup = ({
  term,
  revealing,
  answer,
  isLast,
  onAnswer,
  onClose,
  onNext,
  nextLabel = "Back to the cloud",
}) => {
  const reducedMotion = useReducedMotion();
  const firstChoiceRef = useRef(null);

  useEffect(() => {
    if (!revealing) firstChoiceRef.current?.focus();
  }, [revealing, term.id]);

  useEffect(() => {
    if (revealing) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [revealing, onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop; dismisses only before an answer is locked in. */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={revealing ? undefined : onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Verdict on ${term.term}`}
        className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto"
      >
        {revealing && answer ? (
          <RevealCard
            key={`reveal-${term.id}`}
            term={term}
            answer={answer}
            isLast={isLast}
            onNext={onNext}
            nextLabel={nextLabel}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="rounded-lg border border-hype-border bg-hype-surface/95 backdrop-blur px-5 py-5 sm:px-7 sm:py-6 shadow-custom-lg"
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className="text-hype-muted text-xs uppercase tracking-[0.3em] pt-1 font-sans-ele">
                Verdict on
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close without answering"
                className="shrink-0 -mt-1 -mr-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-md text-hype-muted text-xl leading-none hover:text-hype-text transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-hype-text"
              >
                ×
              </button>
            </div>
            <h2 className="text-hype-text text-2xl sm:text-4xl font-bold font-sans-ele mb-5">
              &ldquo;{term.term}&rdquo;
            </h2>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {CHOICES.map((choice, index) => (
                <button
                  key={choice.id}
                  ref={index === 0 ? firstChoiceRef : undefined}
                  type="button"
                  onClick={() => onAnswer(choice.id)}
                  className="min-h-[48px] w-full sm:w-auto sm:flex-1 px-4 py-3 rounded-md border border-hype-border bg-hype-bg/70 text-hype-text text-sm sm:text-base font-medium font-sans-ele transition-colors hover:border-hype-text focus:outline-none focus-visible:ring-2 focus-visible:ring-hype-text focus-visible:ring-offset-2 focus-visible:ring-offset-hype-surface"
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TermPopup;
