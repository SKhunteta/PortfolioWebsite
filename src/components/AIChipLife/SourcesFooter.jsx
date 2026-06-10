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
  const lastVerified = facts.reduce(
    (latest, f) => (f.verifiedDate && f.verifiedDate > latest ? f.verifiedDate : latest),
    ""
  );

  return (
    <footer id="sources" className="border-t" style={{ borderColor: "#E8E4DF", backgroundColor: "#FFFFFF" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-lg font-bold mb-1" style={{ fontFamily: '"DM Serif Display", Georgia, serif', color: "#1A1A1A" }}>
          Sources &amp; verification
        </h2>
        <p className="text-xs mb-6" style={{ fontFamily: SANS, color: "#9A9A9A" }}>
          Every number on this page traces to one of these entries. Each carries a
          confidence level, the date it was last confirmed, and a re-verification cadence.
          {lastVerified ? ` Most recently verified ${lastVerified}.` : ""}
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

        {/* What this piece does not claim. */}
        <div className="mt-8 pt-6 border-t" style={{ borderColor: "#F0ECE6" }}>
          <h3 className="text-sm font-bold mb-2" style={{ fontFamily: '"DM Serif Display", Georgia, serif', color: "#1A1A1A" }}>
            Contested figures, avoided
          </h3>
          <p className="text-xs leading-relaxed" style={{ fontFamily: SANS, color: "#6B6B6B" }}>
            A widely repeated claim holds that TSMC makes &ldquo;~90% of the world&rsquo;s advanced
            chips.&rdquo; That market-share framing is disputed: Intel and Samsung also operate
            advanced nodes, and the figure depends entirely on where you draw the
            &ldquo;advanced&rdquo; line. This piece deliberately does not use it. The narrower claim
            it does make, that every current merchant flagship AI accelerator is fabricated by
            TSMC, holds without the contested number.
          </p>
        </div>

        {/* Author's note. */}
        <div className="mt-8 pt-6 border-t" style={{ borderColor: "#F0ECE6" }}>
          <h3 className="text-sm font-bold mb-2" style={{ fontFamily: '"DM Serif Display", Georgia, serif', color: "#1A1A1A" }}>
            About this piece
          </h3>
          <p className="text-xs leading-relaxed mb-2" style={{ fontFamily: SANS, color: "#6B6B6B" }}>
            I built this because I live downstream of it. The data centers in Quincy,
            Washington draw their power from the same Columbia River dams my part of the state
            does, and the chips inside them arrive at the end of the most concentrated supply
            chain in industrial history. The mechanic is the argument: each &ldquo;decision&rdquo;
            in the story has exactly one live button because, at four of its links, the real
            chain has exactly one supplier.
          </p>
          <p className="text-xs leading-relaxed mb-2" style={{ fontFamily: SANS, color: "#6B6B6B" }}>
            Methodology: stat cards and guess reveals in the code accept a sourced fact object
            only, never a raw number, so an unsourced figure cannot appear on this page. Facts
            carry one of four confidence levels (verified, order of magnitude, analyst estimate,
            needs verification) and a re-verification cadence. The source is public:{" "}
            <a
              href="https://github.com/SKhunteta/PortfolioWebsite"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: "#1A1A1A" }}
            >
              github.com/SKhunteta/PortfolioWebsite
            </a>
            .
          </p>
          <p className="text-xs" style={{ fontFamily: SANS, color: "#1A1A1A" }}>
            — Shreyans Khunteta
          </p>
        </div>
      </div>
    </footer>
  );
};

export default SourcesFooter;
