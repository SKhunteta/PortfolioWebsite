import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const HaroldCallOverlay = ({ haroldCall, onDecline, reducedMotion }) => {
  useEffect(() => {
    if (!haroldCall) return undefined;
    const handleKey = (e) => {
      if (e.key === "Escape") onDecline(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [haroldCall, onDecline]);

  return (
    <AnimatePresence>
      {haroldCall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-mr-bg/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Incoming call from Harold"
        >
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 40 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm rounded-xl bg-mr-surface border border-mr-border p-6 text-center"
          >
            <div
              className={`mx-auto w-16 h-16 rounded-full bg-mr-panel border-2 border-mr-warning flex items-center justify-center mb-4 ${
                reducedMotion ? "" : "animate-pulse"
              }`}
            >
              <span className="font-serif text-2xl text-mr-text">H</span>
            </div>
            <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-mr-warning mb-1">
              Incoming call
            </p>
            <p className="font-serif text-xl text-mr-text mb-1">Harold (Agent)</p>
            <p className="font-mono text-xs text-mr-text-muted mb-6">
              {haroldCall.subtext}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={() => onDecline(false)}
                className="font-mono text-xs px-4 py-2.5 rounded-md border border-mr-border text-mr-text-secondary hover:bg-mr-panel transition-colors"
              >
                Decline
              </button>
              <button
                onClick={() => onDecline(true)}
                className="font-mono text-xs px-4 py-2.5 rounded-md bg-mr-warning/10 border border-mr-warning/40 text-mr-warning hover:bg-mr-warning/20 transition-colors"
              >
                Decline (with guilt) · sell the guilt
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HaroldCallOverlay;
