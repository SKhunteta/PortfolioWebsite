import React from "react";

const LoadingState = () => {
  return (
    <div className="space-y-8">
      {/* Loading message */}
      <div className="text-center py-8">
        <p className="font-sans-ele text-ele-text-secondary text-lg">
          Scanning news feeds
          <span className="inline-flex ml-1">
            <span className="animate-pulse" style={{ animationDelay: "0ms" }}>.</span>
            <span className="animate-pulse" style={{ animationDelay: "200ms" }}>.</span>
            <span className="animate-pulse" style={{ animationDelay: "400ms" }}>.</span>
          </span>
        </p>
        <p className="font-sans-ele text-ele-text-tertiary text-sm mt-2">
          Analyzing the emotional markets
        </p>
      </div>

      {/* Skeleton grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg p-5 border-l-4 border-ele-border"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="animate-pulse space-y-3">
              <div className="h-5 bg-ele-border rounded w-20" />
              <div className="h-8 bg-ele-border rounded w-28" />
              <div className="flex gap-2">
                <div className="h-4 bg-ele-border rounded w-16" />
                <div className="h-4 bg-ele-border rounded w-12" />
              </div>
              <div className="h-6 bg-ele-border rounded w-full" />
              <div className="h-3 bg-ele-border rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoadingState;
