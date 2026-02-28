import React from "react";

const JourneyControls = ({
  journeyActive,
  journeyIndex,
  onStart,
  onStop,
  totalLocations,
}) => {
  return (
    <div className="px-6 py-4 border-t border-atlas-border">
      {journeyActive ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-atlas-text-muted font-sans">
              Playing stop {journeyIndex + 1} of {totalLocations}
            </span>
            <div className="w-24 h-1 bg-atlas-border rounded-full overflow-hidden">
              <div
                className="h-full bg-atlas-text rounded-full transition-all duration-500"
                style={{
                  width: `${((journeyIndex + 1) / totalLocations) * 100}%`,
                }}
              />
            </div>
          </div>
          <button
            onClick={onStop}
            className="w-full px-4 py-2.5 rounded-md text-sm font-sans font-medium border border-atlas-text text-atlas-text hover:bg-atlas-text hover:text-atlas-bg transition-colors"
          >
            Stop Journey
          </button>
        </div>
      ) : (
        <button
          onClick={onStart}
          className="w-full px-4 py-2.5 rounded-md text-sm font-sans font-medium bg-atlas-text text-atlas-bg hover:bg-atlas-text/90 transition-colors"
        >
          Play the Journey
        </button>
      )}
    </div>
  );
};

export default JourneyControls;
