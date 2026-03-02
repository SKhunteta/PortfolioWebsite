import React from "react";
import { Link } from "react-router-dom";

const AtlasHeader = () => {
  return (
    <header className="border-b border-atlas-border bg-atlas-bg/90 backdrop-blur-sm sticky top-0 z-[1001]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif-atlas text-xl sm:text-2xl text-atlas-text tracking-tight">
              The Aaron West Lyric Atlas
            </h1>
            <p className="text-xs italic text-atlas-text-muted mt-0.5 font-serif-atlas">
              41 places. Five records. One story.
            </p>
          </div>
          <Link
            to="/"
            className="text-sm text-atlas-text-secondary hover:text-atlas-text transition-colors font-sans"
          >
            &larr; Back
          </Link>
        </div>
      </div>
    </header>
  );
};

export default AtlasHeader;
