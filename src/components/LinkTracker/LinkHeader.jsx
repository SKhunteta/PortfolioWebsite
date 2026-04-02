import React from "react";
import { Link } from "react-router-dom";

const LinkHeader = () => {
  return (
    <header className="border-b border-link-border bg-link-bg sticky top-0 z-[1001]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-display font-bold text-link-text leading-tight">
            Seattle Link Light Rail Tracker
          </h1>
          <p className="text-xs text-link-text-muted font-sans mt-0.5">
            Sound Transit ST3 &middot; All planned and operational stations
          </p>
        </div>
        <Link
          to="/"
          className="text-xs text-link-text-muted hover:text-link-text font-sans transition-colors"
        >
          &larr; Back
        </Link>
      </div>
    </header>
  );
};

export default LinkHeader;
