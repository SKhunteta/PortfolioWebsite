import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import WordCloud from "./WordCloud";
import OverwhelmMeter from "./OverwhelmMeter";
import RevealCard from "./RevealCard";
import { CHOICES, STATES } from "./constants";

// Swirl speed: calm ≈ slow ambient drift, overload ≈ frantic.
const speedFor = (overwhelm) => `${Math.max(2.5, 10 - overwhelm / 14)}s`;

// The figure itself reacts to the meter: lifted and warm when calm,
// sagging, drained, and sweating at overload. Variants crossfade.
const FIGURE_VARIANTS = [
  { intensity: "calm", src: "/images/hype-check/figure-calm.jpg" },
  { intensity: "rising", src: "/images/hype-check/figure.jpg" },
  { intensity: "overload", src: "/images/hype-check/figure-overload.jpg" },
];

const GameScene = ({ game }) => {
  const reducedMotion = useReducedMotion();
  const {
    phase,
    currentTerm,
    roundIndex,
    total,
    overwhelm,
    intensity,
    lastAnswer,
    answer,
    next,
  } = game;

  const revealing = phase === STATES.REVEAL;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="relative flex-1 flex flex-col w-full overflow-hidden"
      style={{ "--hype-speed": speedFor(overwhelm) }}
    >
      <WordCloud />

      {/* The slumped figure, cropped from the original meme. */}
      <div
        aria-hidden="true"
        className={`absolute bottom-0 right-0 sm:right-[6%] h-[42vh] sm:h-[56vh] aspect-[445/465] pointer-events-none select-none ${
          intensity === "overload" && !reducedMotion ? "animate-hype-shake" : ""
        }`}
      >
        {FIGURE_VARIANTS.map((variant) => (
          <img
            key={variant.intensity}
            src={variant.src}
            alt=""
            className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-1000 [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_82%)] ${
              intensity === variant.intensity ? "opacity-90" : "opacity-0"
            }`}
          />
        ))}
      </div>

      {/* Vignette that breathes harder as overwhelm climbs. */}
      {!reducedMotion && (
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-700 animate-hype-vignette ${
            intensity === "calm" ? "opacity-0" : "opacity-100"
          }`}
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.8) 100%)",
          }}
        />
      )}

      <div className="relative z-10 flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <OverwhelmMeter value={overwhelm} />
          <p className="text-hype-muted text-xs font-sans-ele shrink-0">
            {Math.min(roundIndex + 1, total)} / {total}
          </p>
        </div>

        {/* Keyed remounts drive the enter animations; no AnimatePresence
            here so rapid clicking can never strand the stage mid-exit. */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          {!revealing && currentTerm && (
            <motion.div
              key={`term-${currentTerm.id}`}
              initial={
                reducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.4, y: -120, rotate: -6 }
              }
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <p className="text-hype-muted text-xs uppercase tracking-[0.3em] mb-4 font-sans-ele">
                Verdict on
              </p>
              <h2 className="text-hype-text text-3xl sm:text-5xl font-bold font-sans-ele max-w-xl">
                &ldquo;{currentTerm.term}&rdquo;
              </h2>
            </motion.div>
          )}

          {revealing && currentTerm && lastAnswer && (
            <RevealCard
              key={`reveal-${currentTerm.id}`}
              term={currentTerm}
              answer={lastAnswer}
              isLast={roundIndex + 1 >= total}
              onNext={next}
            />
          )}
        </div>

        {!revealing && (
          <div className="sticky bottom-0 pb-[env(safe-area-inset-bottom)] pt-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-center">
              {CHOICES.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => answer(choice.id)}
                  className="min-h-[48px] w-full sm:w-auto px-6 py-3 rounded-md border border-hype-border bg-hype-surface/90 backdrop-blur text-hype-text text-sm sm:text-base font-medium font-sans-ele transition-colors hover:border-hype-text focus:outline-none focus-visible:ring-2 focus-visible:ring-hype-text focus-visible:ring-offset-2 focus-visible:ring-offset-hype-bg"
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
};

export default GameScene;
