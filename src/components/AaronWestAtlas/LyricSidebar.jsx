import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ALBUMS } from "./constants";

const LyricContent = ({ location, onNavigate, journeyActive, totalLocations, canNavigatePrev, canNavigateNext }) => {
  const album = ALBUMS[location.album];

  return (
    <div className="p-6 space-y-4">
      {/* Album badge with cover */}
      <div className="flex items-center gap-3">
        <img
          src={album.coverImage}
          alt={album.title}
          className="w-10 h-10 rounded shadow-sm object-cover"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div>
          <span
            className="text-xs font-sans uppercase tracking-wider"
            style={{ color: album.color }}
          >
            {album.title}
          </span>
          <span className="text-xs text-atlas-text-muted ml-1">
            ({album.year})
          </span>
        </div>
      </div>

      {/* Song title */}
      <h2 className="font-serif-atlas text-xl text-atlas-text font-bold leading-snug">
        {location.song}
      </h2>

      {/* Place name */}
      <p className="text-sm text-atlas-text-secondary font-sans">
        {location.location}
      </p>

      {/* Lyric */}
      <blockquote
        className="font-serif-atlas italic text-atlas-text leading-relaxed pl-4"
        style={{ borderLeftWidth: "3px", borderLeftColor: album.color, borderLeftStyle: "solid" }}
      >
        &ldquo;{location.lyric}&rdquo;
      </blockquote>

      {/* Context */}
      <p className="text-sm text-atlas-text-secondary leading-relaxed font-sans">
        {location.context}
      </p>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-atlas-border">
        <button
          onClick={() => onNavigate(-1)}
          disabled={journeyActive || !canNavigatePrev}
          className={`text-sm font-sans px-3 py-1.5 rounded-md transition-all duration-150 ${
            journeyActive || !canNavigatePrev
              ? "text-atlas-text-muted opacity-40 cursor-not-allowed"
              : "text-atlas-text-secondary hover:text-atlas-text hover:bg-atlas-border/60 active:scale-95 cursor-pointer"
          }`}
        >
          &larr; Previous
        </button>
        <span className="text-xs text-atlas-text-muted font-sans">
          Stop {location.narrativeOrder} of {totalLocations}
        </span>
        <button
          onClick={() => onNavigate(1)}
          disabled={journeyActive || !canNavigateNext}
          className={`text-sm font-sans px-3 py-1.5 rounded-md transition-all duration-150 ${
            journeyActive || !canNavigateNext
              ? "text-atlas-text-muted opacity-40 cursor-not-allowed"
              : "text-atlas-text-secondary hover:text-atlas-text hover:bg-atlas-border/60 active:scale-95 cursor-pointer"
          }`}
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="p-6 h-full flex flex-col items-center justify-center text-center">
    <div className="text-3xl mb-3 opacity-40">&#x1F5FA;</div>
    <p className="text-atlas-text-muted italic text-sm font-serif-atlas">
      Select a pin on the map to see its lyric and story.
    </p>
    <p className="text-atlas-text-muted text-xs font-sans mt-2">
      Or press &ldquo;Play the Journey&rdquo; to walk through all 41 stops.
    </p>
  </div>
);

// Desktop sidebar version
export const DesktopSidebar = ({ location, onNavigate, journeyActive, totalLocations, canNavigatePrev, canNavigateNext }) => {
  if (!location) return <EmptyState />;
  return (
    <LyricContent
      location={location}
      onNavigate={onNavigate}
      journeyActive={journeyActive}
      totalLocations={totalLocations}
      canNavigatePrev={canNavigatePrev}
      canNavigateNext={canNavigateNext}
    />
  );
};

// Mobile bottom sheet version
export const MobileBottomSheet = ({ location, onNavigate, onClose, journeyActive, totalLocations, canNavigatePrev, canNavigateNext }) => {
  return (
    <AnimatePresence>
      {location && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 bg-atlas-bg border-t border-atlas-border rounded-t-2xl shadow-custom-2xl z-[1001] max-h-[40vh] overflow-y-auto"
        >
          {/* Drag handle */}
          <div className="flex justify-center py-2 sticky top-0 bg-atlas-bg rounded-t-2xl">
            <button
              onClick={onClose}
              className="w-10 h-1 rounded-full bg-atlas-border"
              aria-label="Close"
            />
          </div>
          <LyricContent
            location={location}
            onNavigate={onNavigate}
            journeyActive={journeyActive}
            totalLocations={totalLocations}
            canNavigatePrev={canNavigatePrev}
            canNavigateNext={canNavigateNext}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
