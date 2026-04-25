import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LOADING_PHASES } from "./constants";

const PHASE_INTERVAL_MS = 13000;

const LoadingState = ({ city }) => {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPhaseIndex((prev) => Math.min(prev + 1, LOADING_PHASES.length - 1));
    }, PHASE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto text-center">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-2xl sm:text-3xl font-bold mb-2"
        style={{ fontFamily: '"DM Serif Display", Georgia, serif', color: "#1A1A1A" }}
      >
        {city}
      </motion.h2>
      <p
        className="text-sm text-gray-500 mb-8"
        style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
      >
        Claude is using web search to fact-check — this can take up to a minute.
      </p>

      <div className="space-y-3">
        {LOADING_PHASES.map((phase, idx) => {
          const state =
            idx < phaseIndex ? "done" : idx === phaseIndex ? "active" : "pending";
          return (
            <div
              key={phase}
              className="flex items-center gap-3 text-left"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              <span
                className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  state === "done"
                    ? "bg-green-600 text-white"
                    : state === "active"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {state === "done" ? "✓" : idx + 1}
              </span>
              <span
                className={
                  state === "active"
                    ? "text-gray-900 font-medium"
                    : state === "done"
                    ? "text-gray-500"
                    : "text-gray-400"
                }
              >
                {phase}
                {state === "active" && (
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  >
                    {" ..."}
                  </motion.span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LoadingState;
