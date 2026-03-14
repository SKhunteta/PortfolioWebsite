import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const JANET_LINE =
  "Good morning. It is currently 6:47 AM Pacific Standard Time. Overcast with a ninety percent chance of existential dread. Perfect working conditions.";

const JanetTeaser = () => {
  const [displayedText, setDisplayedText] = useState("");
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < JANET_LINE.length) {
        setDisplayedText(JANET_LINE.slice(0, i + 1));
        i++;
      } else {
        setTyping(false);
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="section-container py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-xl overflow-hidden shadow-custom-lg"
          style={{ backgroundColor: "#0d0f11" }}
        >
          <div className="p-6 sm:p-8 md:p-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span
                    className="text-2xl sm:text-3xl font-bold tracking-tight"
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      color: "#d1d5db",
                    }}
                  >
                    JANET
                  </span>
                  <span
                    className="text-xs font-medium uppercase tracking-widest hidden sm:inline"
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      color: "#4b5563",
                    }}
                  >
                    v4.2.1
                  </span>
                </div>
                <p
                  className="text-xs"
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    color: "#374151",
                  }}
                >
                  Just Another Non-Entity Technology
                </p>
              </div>
              <span
                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded border"
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  borderColor: "#1f2329",
                  color: "#059669",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ONLINE
              </span>
            </div>

            {/* Terminal output */}
            <div
              className="rounded-lg p-4 mb-6 min-h-[80px]"
              style={{ backgroundColor: "#111316", border: "1px solid #1a1d21" }}
            >
              <p
                className="text-sm leading-relaxed"
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  color: "#9ca3af",
                }}
              >
                {displayedText}
                {typing && (
                  <span
                    className="inline-block w-[2px] h-[14px] ml-[1px] align-middle animate-pulse"
                    style={{ backgroundColor: "#059669" }}
                  />
                )}
              </p>
            </div>

            {/* Description + CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p
                className="text-sm max-w-md"
                style={{
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  color: "#6b7280",
                }}
              >
                Talk to the AI companion from{" "}
                <em className="text-[#9ca3af]">The Happiness Liability</em>.
                She's been monitoring human sadness for 16 years. She has
                questions.
              </p>
              <Link
                to="/janet"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors shrink-0"
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  backgroundColor: "#059669",
                  color: "#0d0f11",
                }}
              >
                Start Conversation
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JanetTeaser;
