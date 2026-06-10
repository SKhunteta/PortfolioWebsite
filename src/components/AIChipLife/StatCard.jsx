import React from "react";

const SANS = '"DM Sans", system-ui, sans-serif';
const MONO = '"JetBrains Mono", "IBM Plex Mono", monospace';

const CONFIDENCE = {
  verified: { label: "verified", color: "#047857", bg: "#ECFDF5" },
  order_of_magnitude: { label: "order of magnitude", color: "#92400E", bg: "#FFFBEB" },
  analyst_estimate: { label: "analyst estimate", color: "#1D4ED8", bg: "#EFF6FF" },
  needs_verification: { label: "needs verification", color: "#B91C1C", bg: "#FEF2F2" },
};

// Renders a single fact. Accepts a fact OBJECT only (never a raw literal), so a
// stat-card slot can never display an unsourced number.
const StatCard = ({ fact, flipped = true }) => {
  const conf = CONFIDENCE[fact.confidence] || CONFIDENCE.verified;

  return (
    <div
      className="rounded-lg border bg-white p-4 transition-all"
      style={{ borderColor: "#E8E4DF" }}
    >
      <p
        className="text-[11px] uppercase tracking-widest mb-2"
        style={{ fontFamily: SANS, color: "#9A9A9A" }}
      >
        {fact.label}
      </p>

      <p
        className="text-2xl font-bold tracking-tight"
        style={{
          fontFamily: '"DM Serif Display", Georgia, serif',
          color: flipped ? "#1A1A1A" : "#C9C4BD",
        }}
      >
        {flipped ? fact.value : "—"}
      </p>

      <p className="text-xs mt-2 leading-snug" style={{ fontFamily: SANS, color: "#6B6B6B" }}>
        {fact.source}
      </p>

      {fact.attribution && (
        <p className="text-xs mt-1 italic" style={{ fontFamily: SANS, color: "#1D4ED8" }}>
          {fact.attribution}
        </p>
      )}

      {fact.note && (
        <p className="text-[11px] mt-1.5 leading-snug" style={{ fontFamily: SANS, color: "#A07A2C" }}>
          {fact.note}
        </p>
      )}

      <div className="flex items-center justify-between mt-3 pt-2 border-t" style={{ borderColor: "#F0ECE6" }}>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{ fontFamily: MONO, color: conf.color, backgroundColor: conf.bg }}
        >
          {conf.label}
        </span>
        <span className="text-[10px]" style={{ fontFamily: MONO, color: "#B8B2AA" }}>
          {fact.verifiedDate ? `verified ${fact.verifiedDate}` : "not yet verified"}
        </span>
      </div>
    </div>
  );
};

export default StatCard;
