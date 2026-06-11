import React from "react";
import { Link } from "react-router-dom";
import { MORE_DEMOS } from "../data/demos";

const MONO = '"JetBrains Mono", "IBM Plex Mono", monospace';
const SANS = '"DM Sans", system-ui, sans-serif';

// Compact pointer to the rest of the demos so the homepage stays short.
// The full cards live on /playground.
const PlaygroundTeaser = () => {
  return (
    <div className="section-container py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold font-display mb-2">
              <span className="gradient-text">More in the Playground</span>
            </h3>
            <p className="text-sm text-gray-600 max-w-md">
              {MORE_DEMOS.length} more interactive experiments — emotion
              markets, transit maps, AI trivia, and a chatbot with questions.
            </p>
          </div>
          <Link
            to="/playground"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium btn btn-primary shrink-0 self-start sm:self-auto"
          >
            See all experiments
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MORE_DEMOS.map((demo) => (
            <Link
              key={demo.id}
              to={demo.route}
              className="rounded-lg p-4 shadow-custom transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: demo.theme.bg }}
            >
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <p
                  className="text-sm font-bold tracking-tight"
                  style={{
                    fontFamily: demo.theme.titleFont,
                    color: demo.theme.text,
                  }}
                >
                  {demo.title}
                </p>
                <span
                  className="text-[9px] uppercase tracking-widest shrink-0"
                  style={{ fontFamily: MONO, color: demo.theme.muted }}
                >
                  {demo.kindLabel}
                </span>
              </div>
              <p
                className="text-xs"
                style={{ fontFamily: SANS, color: demo.theme.muted }}
              >
                {demo.tagline}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlaygroundTeaser;
