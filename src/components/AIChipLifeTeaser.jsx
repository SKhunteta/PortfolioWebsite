import React from "react";
import { Link } from "react-router-dom";

const SANS = '"DM Sans", system-ui, sans-serif';
const MONO = '"JetBrains Mono", "IBM Plex Mono", monospace';
const SERIF = '"DM Serif Display", Georgia, serif';

// A static preview of the forced-choice mechanic: one live option, the rest
// already gone. The teaser gives away the trick without the gut-punch.
const AIChipLifeTeaser = () => {
  return (
    <div className="section-container py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-xl overflow-hidden shadow-custom-lg" style={{ backgroundColor: "#F3EFE8" }}>
          <div className="p-6 sm:p-8 md:p-10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ fontFamily: SERIF, color: "#1A1A1A" }}>
                    The Life of an AI Chip
                  </span>
                  <span className="text-xs font-medium uppercase tracking-widest hidden sm:inline" style={{ fontFamily: SANS, color: "#6B6B6B" }}>
                    A scrollytelling game
                  </span>
                </div>
                <p className="text-xs italic" style={{ fontFamily: SANS, color: "#9A9A9A" }}>
                  Build a frontier accelerator and discover, choice by choice, that you never had one.
                </p>
              </div>
              <span className="text-xs px-2 py-1 rounded border" style={{ fontFamily: MONO, borderColor: "#E8E4DF", color: "#059669" }}>
                NEW
              </span>
            </div>

            {/* The mechanic, frozen: one live option. */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
              <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-3" style={{ fontFamily: MONO }}>
                Choose your EUV scanner vendor
              </p>
              <div className="flex flex-col gap-2">
                <div className="rounded-md px-3 py-2.5 text-sm font-medium" style={{ fontFamily: SANS, backgroundColor: "#1A1A1A", color: "#FAFAF7" }}>
                  ASML
                </div>
                {["Nikon", "Canon"].map((name) => (
                  <div key={name} className="rounded-md border px-3 py-2 opacity-60" style={{ borderColor: "#EAE6E0", backgroundColor: "#FAF8F5" }}>
                    <span className="text-sm line-through" style={{ fontFamily: SANS, color: "#9A9A9A" }}>
                      {name}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] mt-3 tracking-wide" style={{ fontFamily: MONO, color: "#047857" }}>
                1 of 1 suppliers selected
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm max-w-md" style={{ fontFamily: SANS, color: "#6B6B6B" }}>
                Eight scenes, from a parking lot in Santa Clara to a data center on the
                Columbia River. Every &ldquo;decision&rdquo; has exactly one live button. By the
                time the chip ships, you feel the monopoly through your thumb.
              </p>
              <Link
                to="/ai-chip"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors shrink-0"
                style={{ fontFamily: SANS, backgroundColor: "#1A1A1A", color: "#FAFAF7" }}
              >
                Build the chip
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChipLifeTeaser;
