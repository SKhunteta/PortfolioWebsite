import React, { useRef, useEffect } from "react";
import { LOCATIONS, ALBUMS } from "./constants";

const sorted = [...LOCATIONS].sort((a, b) => a.narrativeOrder - b.narrativeOrder);

const TimelineBar = ({
  selectedLocation,
  activeAlbums,
  onSelect,
  journeyIndex,
  journeyActive,
}) => {
  const scrollRef = useRef(null);

  // Auto-scroll to active dot
  useEffect(() => {
    if (selectedLocation && scrollRef.current) {
      const activeDot = scrollRef.current.querySelector(
        `[data-loc-id="${selectedLocation.id}"]`
      );
      if (activeDot) {
        activeDot.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    }
  }, [selectedLocation]);

  return (
    <div className="border-t border-atlas-border bg-atlas-bg px-4 py-3">
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto max-w-7xl mx-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {sorted.map((loc) => {
          const album = ALBUMS[loc.album];
          const isActive = activeAlbums.has(loc.album);
          const isSelected = selectedLocation?.id === loc.id;
          const isVisited =
            journeyActive &&
            loc.narrativeOrder <= sorted[journeyIndex]?.narrativeOrder;

          return (
            <button
              key={loc.id}
              data-loc-id={loc.id}
              onClick={() => onSelect(loc.id)}
              className="shrink-0 rounded-full transition-all duration-200 hover:scale-150"
              style={{
                width: isSelected ? 14 : 8,
                height: isSelected ? 14 : 8,
                backgroundColor: album.color,
                opacity: isActive || isVisited ? 1 : 0.2,
                border: isSelected ? "2px solid #2C2C2C" : "none",
              }}
              title={`${loc.song} — ${loc.location}`}
              aria-label={`Stop ${loc.narrativeOrder}: ${loc.location} (${loc.song})`}
            />
          );
        })}
      </div>
    </div>
  );
};

export default TimelineBar;
