import React from "react";

const LinkFooter = () => {
  return (
    <footer className="border-t border-link-border bg-link-bg py-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-xs text-link-text-muted font-sans text-center">
          Future network per Sound Transit&apos;s Future Service Map; planned
          stations, alignments, and dates are subject to change. Live arrivals
          via OneBusAway. Not affiliated with Sound Transit.
        </p>
      </div>
    </footer>
  );
};

export default LinkFooter;
