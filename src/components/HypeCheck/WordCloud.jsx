import React from "react";
import { useReducedMotion } from "framer-motion";
import { CLOUD_WORDS, CLOUD_SIZES } from "./constants";

// Ambient buzzword chatter behind the game. Purely decorative — hidden
// from assistive tech so it never leaks answers or noise.
const WordCloud = () => {
  const reducedMotion = useReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {CLOUD_WORDS.map((word) => (
        <span
          key={word.text}
          className={`absolute text-hype-text/40 whitespace-nowrap font-sans-ele ${CLOUD_SIZES[word.size]} ${
            reducedMotion ? "" : "animate-hype-drift"
          }`}
          style={{
            top: `${word.top}%`,
            left: `${word.left}%`,
            "--sway": `${word.sway}px`,
            "--bob": `${word.sway > 0 ? -14 : 12}px`,
            animationDelay: `${word.delay}s`,
          }}
        >
          &ldquo;{word.text}&rdquo;
        </span>
      ))}
    </div>
  );
};

export default WordCloud;
