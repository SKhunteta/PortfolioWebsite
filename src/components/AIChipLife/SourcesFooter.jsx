import React from "react";
import { SCENES } from "./scenes";
import { getFact } from "./facts";

const SANS = '"DM Sans", system-ui, sans-serif';
const MONO = '"JetBrains Mono", "IBM Plex Mono", monospace';

// "Sources & verification" auto-generated from every fact referenced across the
// scenes (deduplicated, in scene order).
const collectFacts = () => {
  const seen = new Set();
  const out = [];
  for (const scene of SCENES) {
    const ids = [...(scene.facts || [])];
    if (scene.guess) ids.push(scene.guess.factId);
    for (const id of ids) {
      if (!seen.has(id)) {
        seen.add(id);
        out.push(getFact(id));
      }
    }
  }
  return out;
};

const SourcesFooter = () => {
  const facts = collectFacts();

  return (
    <footer id="sources" className="border-t" style={{ borderColor: "#E8E4DF", backgroundColor: "#FFFFFF" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-lg font-bold mb-1" style={{ fontFamily: '"DM Serif Display", Georgia, serif', color: "#1A1A1A" }}>
          Sources &amp; verification
        </h2>
        <p className="text-xs mb-6" style={{ fontFamily: SANS, color: "#9A9A9A" }}>
          Every number on this page traces to one of these entries. Figures flagged
          “needs verification” are listed in VERIFICATION-TODO.md with the primary source to check.
        </p>

        <ul className="flex flex-col divide-y" style={{ borderColor: "#F0ECE6" }}>
          {facts.map((fact) => (
            <li key={fact.id} className="py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium" style={{ fontFamily: SANS, color: "#1A1A1A" }}>
                  {fact.label}
                </span>
                <span className="text-sm shrink-0" style={{ fontFamily: MONO, color: "#1A1A1A" }}>
                  {fact.value}
                </span>
              </div>
              <p className="text-xs mt-1" style={{ fontFamily: SANS, color: "#6B6B6B" }}>
                {fact.source}
                {fact.attribution ? ` — ${fact.attribution}` : ""}
              </p>
              <p className="text-[10px] mt-1" style={{ fontFamily: MONO, color: "#B8B2AA" }}>
                {fact.confidence.replace(/_/g, " ")}
                {fact.verifiedDate ? ` · verified ${fact.verifiedDate}` : " · not yet verified"}
                {fact.reverifyDays ? ` · re-verify every ${fact.reverifyDays}d` : ""}
              </p>
            </li>
          ))}
        </ul>

        <p className="text-[11px] mt-8" style={{ fontFamily: SANS, color: "#9A9A9A" }}>
          The Quincy hydropower figure is static with a verified date at launch. A live
          generation-dashboard embed is a tracked post-launch issue, not a launch task.
        </p>
      </div>
    </footer>
  );
};

export default SourcesFooter;
