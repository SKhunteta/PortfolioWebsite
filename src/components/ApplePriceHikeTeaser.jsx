import React from "react";
import { Link } from "react-router-dom";
import { DEVICES_BY_ID, formatUSD, formatSigned } from "./ApplePriceHike/pricing";

const SF = '-apple-system, "SF Pro Display", BlinkMacSystemFont, system-ui, sans-serif';
const MONO = '"JetBrains Mono", "IBM Plex Mono", monospace';

// A frozen frame of the contrast: the most-quoted line from the coverage, the
// $1,699 → $1,999 MacBook Pro, with the tax called out in red.
const ApplePriceHikeTeaser = () => {
  const mbp = DEVICES_BY_ID["macbook-pro-14-m5"];
  const before = mbp.basePrice.before;
  const after = mbp.basePrice.after;

  return (
    <div className="section-container py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-xl overflow-hidden shadow-custom-lg" style={{ backgroundColor: "#F5F5F7" }}>
          <div className="p-6 sm:p-8 md:p-10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ fontFamily: SF, color: "#1D1D1F" }}>
                    The Memory Tax
                  </span>
                  <span className="text-xs font-medium uppercase tracking-widest hidden sm:inline" style={{ fontFamily: SF, color: "#6E6E73" }}>
                    An interactive price piece
                  </span>
                </div>
                <p className="text-xs italic" style={{ fontFamily: SF, color: "#86868B" }}>
                  Configure a MacBook or iPad and watch last week&rsquo;s price become today&rsquo;s.
                </p>
              </div>
              <span className="text-xs px-2 py-1 rounded border" style={{ fontFamily: MONO, borderColor: "#E3E3E6", color: "#B2261B" }}>
                NEW
              </span>
            </div>

            {/* The contrast, frozen. */}
            <div className="bg-white rounded-lg p-5 border mb-6" style={{ borderColor: "#E3E3E6" }}>
              <p className="text-[11px] uppercase tracking-widest mb-3" style={{ fontFamily: MONO, color: "#6E6E73" }}>
                {'MacBook Pro 14" · base'}
              </p>
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-xs mb-0.5" style={{ fontFamily: SF, color: "#6E6E73" }}>Last week</p>
                  <p className="text-2xl font-medium line-through tabular-nums" style={{ fontFamily: SF, color: "#6E6E73" }}>
                    {formatUSD(before)}
                  </p>
                </div>
                <span className="text-xl mb-1" style={{ color: "#86868B" }} aria-hidden="true">&rarr;</span>
                <div>
                  <p className="text-xs mb-0.5" style={{ fontFamily: SF, color: "#B2261B" }}>Today</p>
                  <p className="text-3xl font-semibold tabular-nums tracking-tight" style={{ fontFamily: SF, color: "#1D1D1F" }}>
                    {formatUSD(after)}
                  </p>
                </div>
                <span className="ml-auto text-sm font-semibold mb-1.5 tabular-nums" style={{ fontFamily: SF, color: "#B2261B" }}>
                  {formatSigned(after - before)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm max-w-md" style={{ fontFamily: SF, color: "#6E6E73" }}>
                On June 25, 2026 the memory shortage stopped being an enterprise line item and
                became a consumer sticker. Add RAM and storage &mdash; the components that actually
                surged &mdash; and watch the gap widen. Base prices exact and sourced.
              </p>
              <Link
                to="/apple-price-hike"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-opacity hover:opacity-85 shrink-0"
                style={{ fontFamily: SF, backgroundColor: "#1D1D1F", color: "#FFFFFF" }}
              >
                Configure one
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplePriceHikeTeaser;
