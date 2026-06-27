import React from "react";
import { SOURCES, CONFIDENCE, METHODOLOGY, HIKE_DATE, SNAPSHOT_DATE } from "./pricing";
import { SF, MONO, COLORS } from "./theme";

// The integrity layer. Every base price traces to one of these; the confidence
// legend draws the line between "Apple published this" and "we modeled this."
const SourcesPanel = () => {
  return (
    <section
      className="border-t"
      style={{ borderColor: COLORS.hairline, backgroundColor: COLORS.surface }}
    >
      <div className="max-w-3xl mx-auto px-5 sm:px-6 py-12">
        <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: SF, color: COLORS.ink }}>
          How accurate is this?
        </h2>
        <p className="text-sm leading-relaxed mb-6" style={{ fontFamily: SF, color: COLORS.muted }}>
          {METHODOLOGY}
        </p>

        {/* Confidence legend */}
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {Object.values(CONFIDENCE).map((c) => (
            <div
              key={c.key}
              className="rounded-xl border p-4"
              style={{ borderColor: COLORS.hairline }}
            >
              <span
                className="inline-block text-[11px] px-2 py-0.5 rounded-full mb-2"
                style={{ fontFamily: MONO, color: "#FFFFFF", backgroundColor: c.color }}
              >
                {c.label}
              </span>
              <p className="text-xs leading-relaxed" style={{ fontFamily: SF, color: COLORS.muted }}>
                {c.blurb}
              </p>
            </div>
          ))}
        </div>

        <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: SF, color: COLORS.ink }}>
          Sources
        </h3>
        <ul className="flex flex-col gap-2 mb-6">
          {SOURCES.map((s) => (
            <li key={s.id}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs hover:underline"
                style={{ fontFamily: SF, color: COLORS.ink }}
              >
                {s.label} ↗
              </a>
            </li>
          ))}
        </ul>

        <p className="text-[11px]" style={{ fontFamily: MONO, color: COLORS.muted }}>
          Hike effective {HIKE_DATE}. U.S. list prices. Snapshot {SNAPSHOT_DATE}. iPhone, Apple
          Watch, and AirPods were not affected.
        </p>
      </div>
    </section>
  );
};

export default SourcesPanel;
