import React from "react";
import { Link } from "react-router-dom";

// Official Sound Transit line colors: 1, 2, 3, 4, T
const LINE_COLORS = ["#3DAE2B", "#00A0DF", "#ED40A9", "#B14FC5", "#F38B00"];

const PREVIEW_STATIONS = [
  { name: "Westlake", neighborhood: "Downtown Seattle", color: "#3DAE2B" },
  { name: "Bellevue Downtown", neighborhood: "Bellevue", color: "#00A0DF" },
  { name: "U District", neighborhood: "University District", color: "#3DAE2B" },
  { name: "SeaTac/Airport", neighborhood: "SeaTac", color: "#3DAE2B" },
];

const LinkTrackerTeaser = () => {
  return (
    <div className="section-container py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-xl overflow-hidden shadow-custom-lg"
          style={{ backgroundColor: "#F0F4F8" }}
        >
          <div className="p-6 sm:p-8 md:p-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3
                  className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 font-display"
                  style={{ color: "#1A2B3C" }}
                >
                  Seattle Link Light Rail Tracker
                </h3>
                <p
                  className="text-xs font-sans"
                  style={{ color: "#8899AA" }}
                >
                  Today&apos;s system with live arrivals, plus the future ST3 buildout
                </p>
              </div>
              <span
                className="text-xs px-2 py-1 rounded border font-mono"
                style={{ borderColor: "#D4DDE6", color: "#3DAE2B" }}
              >
                MAP
              </span>
            </div>

            {/* Preview stations */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {PREVIEW_STATIONS.map((station) => (
                <div
                  key={station.name}
                  className="bg-white rounded-lg p-3"
                  style={{
                    borderLeftWidth: "3px",
                    borderLeftColor: station.color,
                    borderLeftStyle: "solid",
                  }}
                >
                  <p
                    className="text-sm font-sans font-medium mb-1"
                    style={{ color: "#1A2B3C" }}
                  >
                    {station.name}
                  </p>
                  <p className="text-xs" style={{ color: "#4A5D6F" }}>
                    {station.neighborhood}
                  </p>
                </div>
              ))}
            </div>

            {/* Description + CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p
                className="text-sm font-sans max-w-md"
                style={{ color: "#4A5D6F" }}
              >
                An interactive map of Sound Transit&apos;s Link light rail —
                today&apos;s system with live arrivals, and a toggle to the
                planned ST3 network from Everett to Tacoma.
              </p>
              <Link
                to="/link-tracker"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-sans font-medium transition-colors shrink-0"
                style={{ backgroundColor: "#3DAE2B", color: "#FFFFFF" }}
              >
                Explore the Network
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Line color strip at bottom */}
          <div className="flex h-1.5">
            {LINE_COLORS.map((color) => (
              <div
                key={color}
                className="flex-1"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkTrackerTeaser;
