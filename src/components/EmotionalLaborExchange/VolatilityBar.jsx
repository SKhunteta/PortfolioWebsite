import React from "react";

const VolatilityBar = ({ value = 0 }) => {
  const clampedValue = Math.max(0, Math.min(100, value));

  const getBarColor = (v) => {
    if (v < 30) return "bg-emerald-500";
    if (v < 60) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="flex items-center gap-3">
      <span className="font-sans-ele text-xs font-medium text-ele-text-secondary uppercase tracking-wider whitespace-nowrap">
        Volatility Index
      </span>
      <div className="flex-1 bg-ele-border rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(clampedValue)}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      <span className="font-mono text-sm font-semibold text-ele-text min-w-[2.5rem] text-right">
        {clampedValue}
      </span>
    </div>
  );
};

export default VolatilityBar;
