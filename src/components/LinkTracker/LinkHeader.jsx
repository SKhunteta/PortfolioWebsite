import React from "react";
import { Link } from "react-router-dom";
import ViewSourceLink from "../ViewSourceLink";

const LinkHeader = () => {
  return (
    <header className="border-b border-link-border bg-link-bg sticky top-0 z-[1001]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-display font-bold text-link-text leading-tight">
            Seattle Link Light Rail Tracker
          </h1>
          <p className="text-xs text-link-text-muted font-sans mt-0.5">
            Today&apos;s live system &middot; toggle to the future ST3 buildout
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ViewSourceLink
            dir="src/components/LinkTracker"
            className="text-xs text-link-text-muted font-sans hidden sm:inline-flex"
          />
          <Link
            to="/"
            className="text-xs text-link-text-muted hover:text-link-text font-sans transition-colors"
          >
            &larr; Back
          </Link>
        </div>
      </div>
    </header>
  );
};

export default LinkHeader;
