import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TERMS, KNOWLEDGE_CUTOFF } from "./constants";

const IntroScene = ({ onStart }) => {
  const reducedMotion = useReducedMotion();

  return (
    <motion.section
      initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 text-center"
    >
      <p className="text-hype-muted text-xs uppercase tracking-[0.3em] mb-3 font-sans-ele">
        May 2025
      </p>
      <h1 className="text-hype-text text-3xl sm:text-5xl font-bold mb-4 font-sans-ele">
        The timeline was a lot.
      </h1>
      <p className="text-hype-muted text-sm sm:text-base max-w-xl mx-auto mb-6 font-sans-ele">
        Every week, something new was going to change everything. This meme
        was how it felt.
      </p>

      <img
        src="/images/hype-check/meme-original.jpg"
        alt="Meme of an exhausted anime character slumped forward in a folding chair, surrounded by dozens of May 2025 AI buzzwords"
        className="mx-auto max-h-[55vh] w-auto rounded-lg border border-hype-border shadow-custom-lg object-contain mb-6"
        loading="eager"
        decoding="async"
      />

      <p className="text-hype-text text-base sm:text-lg max-w-xl mx-auto mb-8 font-sans-ele">
        It&rsquo;s {KNOWLEDGE_CUTOFF} now — one year later. {TERMS.length}{" "}
        buzzwords from the timeline. Which are still everywhere, which are
        dead, and which did we just make up?
      </p>

      <button
        type="button"
        onClick={onStart}
        className="inline-flex items-center justify-center min-h-[44px] px-8 py-3 rounded-md bg-hype-text text-hype-bg text-sm sm:text-base font-semibold font-sans-ele transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-hype-text focus-visible:ring-offset-2 focus-visible:ring-offset-hype-bg"
      >
        Face the timeline
      </button>
    </motion.section>
  );
};

export default IntroScene;
