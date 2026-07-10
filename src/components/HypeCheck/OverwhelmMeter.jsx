import React from "react";
import { OVERWHELM } from "./constants";

const barColor = (value) => {
  if (value >= OVERWHELM.OVERLOAD_AT) return "bg-hype-dead";
  if (value >= OVERWHELM.RISING_AT) return "bg-amber-400";
  return "bg-hype-alive";
};

const OverwhelmMeter = ({ value }) => (
  <div className="flex items-center gap-3">
    <span className="text-hype-muted text-[11px] uppercase tracking-[0.2em] font-sans-ele shrink-0">
      Overwhelm
    </span>
    <div
      role="meter"
      aria-label="Overwhelm"
      aria-valuemin={OVERWHELM.MIN}
      aria-valuemax={OVERWHELM.MAX}
      aria-valuenow={value}
      className="h-2 w-36 sm:w-60 rounded-full bg-hype-surface border border-hype-border overflow-hidden"
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${barColor(value)}`}
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

export default OverwhelmMeter;
