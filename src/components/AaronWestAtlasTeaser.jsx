import React from "react";
import { Link } from "react-router-dom";

const ALBUM_COLORS = ["#2D5F8A", "#8B6E4E", "#4A7C59", "#D4813B", "#7B4B6A"];

const PREVIEW_STOPS = [
  { place: "Brooklyn, NY", song: "Our Apartment", color: "#2D5F8A" },
  { place: "Carolina Coast", song: "Carolina Coast", color: "#2D5F8A" },
  { place: "Rockaway Beach", song: "Green Like The G Train", color: "#8B6E4E" },
  { place: "Asbury Park, NJ", song: "Lead Paint & Salt Air", color: "#D4813B" },
];

const AaronWestAtlasTeaser = () => {
  return (
    <div className="section-container py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-xl overflow-hidden shadow-custom-lg"
          style={{ backgroundColor: "#FAF6F0" }}
        >
          <div className="p-6 sm:p-8 md:p-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3
                  className="text-2xl sm:text-3xl font-bold tracking-tight mb-1"
                  style={{
                    fontFamily: '"Libre Baskerville", Georgia, serif',
                    color: "#2C2C2C",
                  }}
                >
                  The Aaron West Lyric Atlas
                </h3>
                <p
                  className="text-xs italic"
                  style={{
                    fontFamily: '"Libre Baskerville", Georgia, serif',
                    color: "#9A9189",
                  }}
                >
                  41 places. Five records. One story.
                </p>
              </div>
              <span
                className="text-xs px-2 py-1 rounded border"
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  borderColor: "#E6DFD6",
                  color: "#4A7C59",
                }}
              >
                MAP
              </span>
            </div>

            {/* Preview stops */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {PREVIEW_STOPS.map((stop) => (
                <div
                  key={stop.song}
                  className="bg-white rounded-lg p-3"
                  style={{
                    borderLeftWidth: "3px",
                    borderLeftColor: stop.color,
                    borderLeftStyle: "solid",
                  }}
                >
                  <p
                    className="text-sm mb-1"
                    style={{
                      fontFamily: '"Libre Baskerville", Georgia, serif',
                      color: "#2C2C2C",
                    }}
                  >
                    {stop.place}
                  </p>
                  <p className="text-xs italic" style={{ color: "#6B6358" }}>
                    &ldquo;{stop.song}&rdquo;
                  </p>
                </div>
              ))}
            </div>

            {/* Description + CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p
                className="text-sm max-w-md"
                style={{
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  color: "#6B6358",
                }}
              >
                An interactive map of every place mentioned across the Aaron
                West &amp; The Roaring Twenties discography. Click a pin, read
                the lyric, see the story.
              </p>
              <Link
                to="/aaron-west-atlas"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors shrink-0"
                style={{
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  backgroundColor: "#2C2C2C",
                  color: "#FAF6F0",
                }}
              >
                Explore the Atlas
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Album color strip at bottom */}
          <div className="flex h-1.5">
            {ALBUM_COLORS.map((color) => (
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

export default AaronWestAtlasTeaser;
