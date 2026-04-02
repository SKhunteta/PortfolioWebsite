import React from "react";

const LinkFooter = () => {
  return (
    <footer className="border-t border-link-border bg-link-bg py-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-xs text-link-text-muted font-sans text-center">
          Station data based on Sound Transit&apos;s ST3 plan. Operational status
          reflects service as of April 2026. Not affiliated with Sound Transit.
        </p>
      </div>
    </footer>
  );
};

export default LinkFooter;
