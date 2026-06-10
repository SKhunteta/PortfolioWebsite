import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const PREVIEW_EVENTS = [
  { kind: "SALE", color: "#F5C542", message: "Vienna Medical AI Network purchased 2 units of your grief", amount: "+$1.20" },
  { kind: "WARNING", color: "#EF4444", message: "HAPPINESS CONTAMINATION WARNING — market dip in U.S.-West-2", amount: null },
  { kind: "SYSTEM", color: "#2DD4BF", message: "Baseline deviation detected. Recalibrating…", amount: null },
  { kind: "CALL", color: "#EF4444", message: "Incoming call: Harold (agent) — 3 missed calls", amount: null },
];

const MonetizedReaderTeaser = () => {
  const [eventIndex, setEventIndex] = useState(0);
  const [earnings, setEarnings] = useState(0.42);

  useEffect(() => {
    const interval = setInterval(() => {
      setEventIndex((i) => (i + 1) % PREVIEW_EVENTS.length);
      setEarnings((e) => e + 0.03 + Math.random() * 0.05);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const currentEvent = PREVIEW_EVENTS[eventIndex];

  return (
    <div className="section-container py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-xl overflow-hidden shadow-custom-lg"
          style={{ backgroundColor: "#07090D" }}
        >
          <div className="p-6 sm:p-8 md:p-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-baseline gap-3 mb-1">
                  <span
                    className="text-2xl sm:text-3xl font-bold tracking-tight"
                    style={{
                      fontFamily: '"DM Serif Display", Georgia, serif',
                      color: "#E6EDF3",
                    }}
                  >
                    The Monetized Reader
                  </span>
                  <span
                    className="text-xs font-medium uppercase tracking-widest hidden sm:inline"
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      color: "#55606E",
                    }}
                  >
                    Excerpt
                  </span>
                </div>
                <p
                  className="text-xs italic"
                  style={{
                    fontFamily: '"DM Sans", system-ui, sans-serif',
                    color: "#55606E",
                  }}
                >
                  From The Happiness Liability
                </p>
              </div>
              <span
                className="text-xs px-2 py-1 rounded border"
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  borderColor: "#1F2733",
                  color: "#2DD4BF",
                }}
              >
                CLIENT-SIDE
              </span>
            </div>

            {/* Mini HUD preview */}
            <div
              className="rounded-lg p-4 mb-6 border"
              style={{ backgroundColor: "#0D1117", borderColor: "#1F2733" }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest"
                  style={{ fontFamily: '"JetBrains Mono", monospace', color: "#8B98A9" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF] animate-pulse" />
                  Meridian uplink: active
                </span>
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ fontFamily: '"JetBrains Mono", monospace', color: "#F5C542" }}
                >
                  ${earnings.toFixed(2)}
                </span>
              </div>
              <div className="min-h-[40px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={eventIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-baseline gap-2"
                  >
                    <span
                      className="text-[9px] tracking-[0.2em] shrink-0"
                      style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        color: currentEvent.color,
                      }}
                    >
                      {currentEvent.kind}
                    </span>
                    <span
                      className="text-xs leading-snug"
                      style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        color: "#8B98A9",
                      }}
                    >
                      {currentEvent.message}
                    </span>
                    {currentEvent.amount && (
                      <span
                        className="text-xs font-semibold shrink-0 ml-auto"
                        style={{
                          fontFamily: '"JetBrains Mono", monospace',
                          color: "#F5C542",
                        }}
                      >
                        {currentEvent.amount}
                      </span>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Description + CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p
                className="text-sm max-w-md"
                style={{
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  color: "#8B98A9",
                }}
              >
                Read the opening chapter of{" "}
                <em style={{ color: "#E6EDF3" }}>The Happiness Liability</em>{" "}
                while a neural interface monetizes your feelings in real time.
                Try not to enjoy it. That causes market dips.
              </p>
              <Link
                to="/monetized-reader"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors shrink-0 hover:opacity-90"
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  backgroundColor: "#2DD4BF",
                  color: "#07090D",
                }}
              >
                Connect Interface
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonetizedReaderTeaser;
