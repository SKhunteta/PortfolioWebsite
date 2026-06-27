import React from "react";
import { MAC_DEVICES, IPAD_DEVICES, formatUSD } from "./pricing";
import { SF, MONO, COLORS } from "./theme";

const LINES = [
  { key: "mac", label: "MacBook", devices: MAC_DEVICES },
  { key: "ipad", label: "iPad", devices: IPAD_DEVICES },
];

// Segmented Mac/iPad switch + the list of models in the chosen line. Selecting
// a model resets its options to the base config (handled by the hook).
const DevicePicker = ({ device, onSelect }) => {
  const activeLine = device.line;
  const lineDevices = LINES.find((l) => l.key === activeLine)?.devices || [];

  return (
    <div>
      <div
        className="inline-flex p-1 rounded-full mb-5"
        style={{ backgroundColor: "#E8E8EB" }}
        role="tablist"
        aria-label="Device line"
      >
        {LINES.map((line) => {
          const active = line.key === activeLine;
          return (
            <button
              key={line.key}
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(line.devices[0].id)}
              className="px-6 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                fontFamily: SF,
                backgroundColor: active ? COLORS.surface : "transparent",
                color: active ? COLORS.ink : COLORS.muted,
                boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {line.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {lineDevices.map((d) => {
          const active = d.id === device.id;
          return (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              aria-pressed={active}
              className="text-left rounded-xl border px-4 py-3 transition-all"
              style={{
                fontFamily: SF,
                borderColor: active ? COLORS.ink : COLORS.hairline,
                backgroundColor: active ? COLORS.surface : "transparent",
                boxShadow: active ? "0 2px 10px rgba(0,0,0,0.05)" : "none",
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium" style={{ color: COLORS.ink }}>
                  {d.name}
                </span>
                <span className="text-[11px]" style={{ fontFamily: MONO, color: COLORS.muted }}>
                  {d.chip}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xs line-through" style={{ color: COLORS.muted }}>
                  {formatUSD(d.basePrice.before)}
                </span>
                <span className="text-xs font-semibold" style={{ color: COLORS.rise }}>
                  {formatUSD(d.basePrice.after)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DevicePicker;
