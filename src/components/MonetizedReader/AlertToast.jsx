import { motion, AnimatePresence } from "framer-motion";
import { formatUSD } from "./constants";

const kindStyles = {
  sale: { border: "#F5C542", label: "SALE" },
  system: { border: "#2DD4BF", label: "SYSTEM" },
  market: { border: "#2DD4BF", label: "MARKET" },
  warning: { border: "#EF4444", label: "WARNING" },
};

export const AlertCard = ({ alert, onDismiss }) => {
  const { event } = alert;
  const style = kindStyles[event.kind] ?? kindStyles.system;
  const saleAmount =
    event.kind === "sale" ? event.units * event.pricePerUnit : null;

  return (
    <button
      onClick={() => onDismiss(alert.id)}
      data-kind={event.kind}
      data-severity={event.severity}
      className="w-full text-left rounded-md border-l-[3px] bg-mr-panel/95 border border-mr-border px-3 py-2 shadow-custom hover:bg-mr-panel transition-colors"
      style={{ borderLeftColor: style.border }}
    >
      <span className="flex items-baseline justify-between gap-3">
        <span
          className="font-mono text-[9px] tracking-[0.2em] uppercase"
          style={{ color: style.border }}
        >
          {style.label}
        </span>
        {saleAmount !== null && (
          <span className="font-mono text-xs font-semibold text-mr-money tabular-nums">
            +{formatUSD(saleAmount)}
          </span>
        )}
      </span>
      <span
        className={`block font-mono text-xs leading-snug mt-0.5 ${
          event.severity === "critical" ? "text-mr-warning" : "text-mr-text-secondary"
        }`}
      >
        {event.message}
      </span>
    </button>
  );
};

const AlertToast = ({ alerts, onDismiss, reducedMotion }) => (
  <div className="fixed z-50 top-20 inset-x-3 sm:inset-x-auto sm:right-4 sm:w-80 flex flex-col gap-2 pointer-events-none">
    <AnimatePresence>
      {alerts.map((alert) => (
        <motion.div
          key={alert.id}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.1 : 0.25 }}
          className="pointer-events-auto"
        >
          <AlertCard alert={alert} onDismiss={onDismiss} />
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

export default AlertToast;
