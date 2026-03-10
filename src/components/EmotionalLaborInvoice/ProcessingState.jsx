import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const MESSAGES = [
  "Calculating the value of your unpaid labor\u2026",
  "Cross-referencing emotional market rates\u2026",
  "Itemizing invisible work\u2026",
  "Applying surcharges for systemic inequity\u2026",
  "Formatting grief into billable hours\u2026",
];

export default function ProcessingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-32"
    >
      {/* Pulsing invoice icon */}
      <div className="relative mb-8">
        <div className="w-16 h-20 border-2 border-inv-gold/40 rounded-sm bg-white shadow-sm flex items-center justify-center">
          <div className="space-y-1.5 w-8">
            <div className="h-0.5 bg-inv-gold/30 rounded" />
            <div className="h-0.5 bg-inv-gold/20 rounded w-3/4" />
            <div className="h-0.5 bg-inv-gold/30 rounded" />
            <div className="h-0.5 bg-inv-gold/20 rounded w-1/2" />
          </div>
        </div>
        <div className="absolute -inset-3 border border-inv-gold/10 rounded-md animate-pulse" />
      </div>

      {/* Rotating status message */}
      <motion.p
        key={messageIndex}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="font-sans-ele text-sm text-ele-text-secondary text-center"
      >
        {MESSAGES[messageIndex]}
      </motion.p>

      {/* Progress bar */}
      <div className="mt-6 w-48 sm:w-64 h-1 bg-inv-border rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-inv-gold rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 12, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}
