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
            className="w-full px-4 py-2.5 rounded-lg text-sm font-sans font-semibold bg-atlas-text text-white shadow-md hover:opacity-80 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            Stop Journey
          </button>
        </div>
      ) : (
        <button
          onClick={onStart}
          className="w-full px-4 py-2.5 rounded-lg text-sm font-sans font-semibold bg-atlas-text text-white shadow-md hover:opacity-80 active:scale-95 transition-all duration-150 cursor-pointer"
        >
          Play the Journey
        </button>
      )}
    </div>
  );
};

export default JourneyControls;
