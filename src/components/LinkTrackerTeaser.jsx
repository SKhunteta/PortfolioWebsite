import React from "react";
import { Link } from "react-router-dom";

const LINE_COLORS = ["#E31837", "#0053A0", "#00A651", "#F58220", "#7B2D8E"];

const PREVIEW_STATIONS = [
  { name: "Westlake", neighborhood: "Downtown Seattle", color: "#E31837" },
  { name: "Bellevue Downtown", neighborhood: "Bellevue", color: "#0053A0" },
  { name: "U District", neighborhood: "University District", color: "#E31837" },
  { name: "SeaTac/Airport", neighborhood: "SeaTac", color: "#00A651" },
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
                  Track the ST3 vision from Everett to Tacoma and beyond
                </p>
              </div>
              <span
                className="text-xs px-2 py-1 rounded border font-mono"
                style={{ borderColor: "#D4DDE6", color: "#E31837" }}
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
                An interactive map of every planned and operational station across
                Sound Transit&apos;s Link light rail network. Filter by line,
                explore neighborhoods, and track ST3 progress.
              </p>
              <Link
                to="/link-tracker"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-sans font-medium transition-colors shrink-0"
                style={{ backgroundColor: "#E31837", color: "#FFFFFF" }}
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
