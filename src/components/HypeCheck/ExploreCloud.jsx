import React from "react";
import { useReducedMotion } from "framer-motion";
import { explorePositionFor } from "./constants";

const ANSWERED_TINTS = {
  alive: "text-hype-alive/60",
  dead: "text-hype-dead/60",
  fake: "text-hype-fake/60",
};

// Explore mode's stage: the quiz terms themselves float as real,
// keyboard-focusable buttons. Unanswered terms are white; answered
// ones dim and take on their category's color. Positions come from a
// pure index-based layout so the render is fully deterministic.
const ExploreCloud = ({ terms, answeredById, onSelect, registerButton }) => {
  const reducedMotion = useReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden z-20 pointer-events-none">
      {terms.map((term, index) => {
        const pos = explorePositionFor(index);
        const answer = answeredById[term.id];
        return (
          <button
            key={term.id}
            ref={(node) => registerButton?.(term.id, node)}
            type="button"
            disabled={Boolean(answer)}
            onClick={() => onSelect(term.id)}
            className={`absolute pointer-events-auto min-h-[44px] min-w-[44px] px-2 py-1 rounded-md text-left font-sans-ele text-sm sm:text-lg leading-snug transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-hype-text focus-visible:ring-offset-2 focus-visible:ring-offset-hype-bg ${
              answer
                ? `${ANSWERED_TINTS[term.category]} opacity-60`
                : "text-hype-text hover:text-white hover:bg-hype-surface/60"
            } ${reducedMotion ? "" : "animate-hype-drift"}`}
            style={{
              // Keeps words readable when they drift over the figure.
              textShadow: "0 1px 10px rgba(0,0,0,0.9)",
              top: `${pos.top}%`,
              left: `${pos.left}%`,
              maxWidth: `${100 - pos.left - 2}%`,
              "--sway": `${pos.sway}px`,
              "--bob": `${pos.sway > 0 ? -14 : 12}px`,
              animationDelay: `${pos.delay}s`,
            }}
          >
            &ldquo;{term.term}&rdquo;
          </button>
        );
      })}
    </div>
  );
};

export default ExploreCloud;
