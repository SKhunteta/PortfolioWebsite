import React from "react";
import { Link } from "react-router-dom";

const PREVIEW_STORIES = [
  {
    title: "The Last Librarian",
    genre: "Sci-Fi",
    snippet: "In 2087, reading fiction causes a neurological condition called 'narrative bleed.' Maya Chen is the last person alive who can read without symptoms...",
    color: "#06B6D4",
    mood: "tense",
  },
  {
    title: "Marguerite's Garden",
    genre: "Magical Realism",
    snippet: "The tomatoes were screaming again. Not loudly \u2014 she'd learned to distinguish between whisper-screams of thirst and the howls of aphid attacks...",
    color: "#D946EF",
    mood: "whimsical",
  },
  {
    title: "Exit Interview",
    genre: "Absurdist",
    snippet: "The afterlife, it turns out, has an HR department. And they are very concerned about your performance review...",
    color: "#A3E635",
    mood: "witty",
  },
];

const PlotTwistTeaser = () => {
  return (
    <div className="section-container py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-xl overflow-hidden shadow-custom-lg"
          style={{ backgroundColor: "#0F0F1A" }}
        >
          <div className="p-6 sm:p-8 md:p-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-baseline gap-3 mb-1">
                  <span
                    className="text-2xl sm:text-3xl font-bold tracking-tight"
                    style={{
                      fontFamily: '"DM Serif Display", Georgia, serif',
                      color: "#F0F0F0",
                    }}
                  >
                    Plot Twist
                  </span>
                  <span
                    className="text-xs font-medium uppercase tracking-widest hidden sm:inline"
                    style={{
                      fontFamily: '"DM Sans", system-ui, sans-serif',
                      color: "#6B6B80",
                    }}
                  >
                    Story Discovery
                  </span>
                </div>
                <p
                  className="text-xs italic"
                  style={{
                    fontFamily: '"DM Sans", system-ui, sans-serif',
                    color: "#6B6B80",
                  }}
                >
                  Swipe through the multiverse of stories
                </p>
              </div>
              <span
                className="text-xs px-2 py-1 rounded border"
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  borderColor: "#2A2A3E",
                  color: "#8B5CF6",
                }}
              >
                AI
              </span>
            </div>

            {/* Preview stories */}
            <div className="space-y-3 mb-6">
              {PREVIEW_STORIES.map((story) => (
                <div
                  key={story.title}
                  className="rounded-lg p-4 border-l-[3px] transition-colors"
                  style={{
                    borderLeftColor: story.color,
                    backgroundColor: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <p
                      className="text-sm font-semibold"
                      style={{
                        fontFamily: '"DM Serif Display", Georgia, serif',
                        color: "#F0F0F0",
                      }}
                    >
                      {story.title}
                    </p>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        color: story.color,
                        backgroundColor: `${story.color}15`,
                      }}
                    >
                      {story.genre}
                    </span>
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      fontFamily: '"DM Sans", system-ui, sans-serif',
                      color: "#A0A0B8",
                    }}
                  >
                    {story.snippet}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p
                className="text-sm max-w-md"
                style={{
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  color: "#6B6B80",
                }}
              >
                A TikTok-style feed of AI-generated story ideas. Like what hooks
                you. Your taste shapes the feed.
              </p>
              <Link
                to="/plot-twist"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors shrink-0"
                style={{
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  backgroundColor: "#8B5CF6",
                  color: "#F0F0F0",
                }}
              >
                Enter Plot Twist
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlotTwistTeaser;
