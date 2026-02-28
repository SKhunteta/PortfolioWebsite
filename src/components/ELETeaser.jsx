import React from "react";
import { Link } from "react-router-dom";

const PREVIEW_EMOTIONS = [
  { name: "Anxiety", price: "88.50", change: "+12.00", color: "#F97316" },
  { name: "Grief", price: "67.00", change: "+5.00", color: "#3B82F6" },
  { name: "Joy", price: "45.20", change: "+3.50", color: "#F59E0B" },
  { name: "Empathy", price: "55.00", change: "+1.20", color: "#8B5CF6" },
];

const ELETeaser = () => {
  return (
    <div className="section-container py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-xl overflow-hidden shadow-custom-lg"
          style={{ backgroundColor: "#FAF8F5" }}
        >
          <div className="p-6 sm:p-8 md:p-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-baseline gap-3 mb-1">
                  <span
                    className="text-2xl sm:text-3xl font-bold tracking-tight"
                    style={{ fontFamily: '"DM Serif Display", Georgia, serif', color: "#1A1A1A" }}
                  >
                    ELE
                  </span>
                  <span
                    className="text-xs font-medium uppercase tracking-widest hidden sm:inline"
                    style={{ fontFamily: '"DM Sans", system-ui, sans-serif', color: "#6B6B6B" }}
                  >
                    Emotional Labor Exchange
                  </span>
                </div>
                <p
                  className="text-xs italic"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif', color: "#9A9A9A" }}
                >
                  Pricing human feeling since 2032
                </p>
              </div>
              <span
                className="text-xs px-2 py-1 rounded border"
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  borderColor: "#E8E4DF",
                  color: "#059669",
                }}
              >
                LIVE
              </span>
            </div>

            {/* Preview prices */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {PREVIEW_EMOTIONS.map((emotion) => (
                <div
                  key={emotion.name}
                  className="bg-white rounded-lg p-3 border-l-3"
                  style={{ borderLeftWidth: "3px", borderLeftColor: emotion.color }}
                >
                  <p
                    className="text-sm mb-1"
                    style={{ fontFamily: '"DM Serif Display", Georgia, serif', color: "#1A1A1A" }}
                  >
                    {emotion.name}
                  </p>
                  <p
                    className="text-lg font-bold"
                    style={{ fontFamily: '"JetBrains Mono", monospace', color: "#1A1A1A" }}
                  >
                    ${emotion.price}
                  </p>
                  <p
                    className="text-xs"
                    style={{ fontFamily: '"JetBrains Mono", monospace', color: "#059669" }}
                  >
                    {emotion.change} ▲
                  </p>
                </div>
              ))}
            </div>

            {/* Description + CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p
                className="text-sm max-w-md"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif', color: "#6B6B6B" }}
              >
                What's the market price of human feeling? A live experiment from
                the world of <em>The Happiness Liability</em>.
              </p>
              <Link
                to="/ele"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors shrink-0"
                style={{
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  backgroundColor: "#1A1A1A",
                  color: "#FAF8F5",
                }}
              >
                Enter the Exchange
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ELETeaser;
