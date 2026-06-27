import React from "react";
import { formatUSD, formatSigned } from "./pricing";
import { SF, MONO, COLORS } from "./theme";

const Row = ({ label, sub, before, after, modeled, emphasize }) => {
  const delta = after - before;
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p
          className="text-sm"
          style={{ fontFamily: SF, color: COLORS.ink, fontWeight: emphasize ? 600 : 400 }}
        >
          {label}
          {modeled && (
            <span className="ml-2 text-[10px]" style={{ fontFamily: MONO, color: COLORS.rise }}>
              modeled
            </span>
          )}
        </p>
        {sub && (
          <p className="text-xs" style={{ fontFamily: SF, color: COLORS.muted }}>
            {sub}
          </p>
        )}
      </div>
      <div className="flex items-baseline gap-3 tabular-nums">
        <span className="text-xs line-through" style={{ fontFamily: MONO, color: COLORS.muted }}>
          {formatUSD(before)}
        </span>
        <span className="text-sm" style={{ fontFamily: MONO, color: COLORS.ink, fontWeight: emphasize ? 600 : 400 }}>
          {formatUSD(after)}
        </span>
        <span
          className="text-xs w-16 text-right"
          style={{ fontFamily: MONO, color: delta > 0 ? COLORS.rise : COLORS.muted }}
        >
          {delta === 0 ? "—" : formatSigned(delta)}
        </span>
      </div>
    </div>
  );
};

// A receipt that itemizes the hike: how much came from the base machine, how
// much from the memory rung, how much from storage. This is where the thesis
// is legible — the upgrades you add are exactly the components that surged.
const Breakdown = ({ device, selection, contrast }) => {
  const { before, after } = contrast;
  const memRung = device.memory.find((r) => r.gb === selection.memory);
  const storRung = device.storage.find((r) => r.gb === selection.storage);

  return (
    <div>
      <div className="flex items-center justify-end gap-3 pb-2 border-b" style={{ borderColor: COLORS.hairline }}>
        <span className="text-[10px] uppercase tracking-widest" style={{ fontFamily: MONO, color: COLORS.muted }}>
          last week
        </span>
        <span className="text-[10px] uppercase tracking-widest" style={{ fontFamily: MONO, color: COLORS.ink }}>
          today
        </span>
        <span className="text-[10px] uppercase tracking-widest w-16 text-right" style={{ fontFamily: MONO, color: COLORS.rise }}>
          change
        </span>
      </div>

      <div className="divide-y" style={{ borderColor: COLORS.hairline }}>
        <Row
          label={`${device.name}`}
          sub="Base configuration"
          before={before.base}
          after={after.base}
        />
        {before.memoryAdd > 0 || after.memoryAdd > 0 ? (
          <Row
            label="Unified memory upgrade"
            sub={memRung ? memRung.label : undefined}
            before={before.memoryAdd}
            after={after.memoryAdd}
            modeled
          />
        ) : null}
        {before.storageAdd > 0 || after.storageAdd > 0 ? (
          <Row
            label="Storage upgrade"
            sub={storRung ? storRung.label : undefined}
            before={before.storageAdd}
            after={after.storageAdd}
            modeled
          />
        ) : null}
        <Row
          label="Total as configured"
          before={before.total}
          after={after.total}
          emphasize
        />
      </div>
    </div>
  );
};

export default Breakdown;
