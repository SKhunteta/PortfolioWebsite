import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { ALBUMS, SPOTIFY_TRACK_IDS } from "./constants";
import SpotifyPlayer from "./SpotifyPlayer";

const SWIPE_THRESHOLD = 50;

const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? -200 : 200, opacity: 0 }),
};

const LyricContent = ({ location, onNavigate, journeyActive, totalLocations, canNavigatePrev, canNavigateNext, autoPlaySignal, onPlaybackStarted, compact = false }) => {
  const [showContext, setShowContext] = useState(false);
  const [slideDirection, setSlideDirection] = useState(0);
  const album = ALBUMS[location.album];
  const trackId = SPOTIFY_TRACK_IDS[location.song] || null;
  const dragX = useMotionValue(0);

  const handleDragEnd = useCallback((_, info) => {
    const swipe = info.offset.x;
    if (swipe < -SWIPE_THRESHOLD && canNavigateNext) {
      setSlideDirection(1);
      onNavigate(1);
    } else if (swipe > SWIPE_THRESHOLD && canNavigatePrev) {
      setSlideDirection(-1);
      onNavigate(-1);
    }
  }, [onNavigate, canNavigatePrev, canNavigateNext]);

  return (
    <AnimatePresence mode="wait" custom={slideDirection}>
    <motion.div
      key={location.id}
      custom={slideDirection}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.25, ease: "easeInOut" }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.3}
      onDragEnd={handleDragEnd}
      style={{ x: dragX, touchAction: "pan-y" }}
      className={compact ? "p-4 space-y-2" : "p-6 space-y-4"}
    >
      {/* Album badge with cover */}
      <div className={`flex items-center ${compact ? "gap-2" : "gap-3"}`}>
        <img
          src={album.coverImage}
          alt={album.title}
          className={`${compact ? "w-8 h-8" : "w-10 h-10"} rounded shadow-sm object-cover`}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        {compact ? (
          <div className="min-w-0 flex-1">
            <h2 className="font-serif-atlas text-base text-atlas-text font-bold leading-tight truncate">
              {location.song}
            </h2>
            <p className="text-xs text-atlas-text-muted truncate">
              {location.location}
              <span className="mx-1">&middot;</span>
              <span style={{ color: album.color }}>{album.shortName}</span>
            </p>
          </div>
        ) : (
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
        )}
      </div>

      {/* Song title & place (full mode only — compact combines them above) */}
      {!compact && (
        <>
          <h2 className="font-serif-atlas text-xl text-atlas-text font-bold leading-snug">
            {location.song}
          </h2>
          <p className="text-sm text-atlas-text-secondary font-sans">
            {location.location}
          </p>
        </>
      )}

      {/* Lyric */}
      <blockquote
        className={`font-serif-atlas italic text-atlas-text leading-relaxed pl-4 ${compact ? "text-sm" : ""}`}
        style={{ borderLeftWidth: "3px", borderLeftColor: album.color, borderLeftStyle: "solid" }}
      >
        &ldquo;{location.lyric}&rdquo;
      </blockquote>

      {/* Context — collapsible in compact mode */}
      {compact ? (
        <>
          <button
            onClick={() => setShowContext((v) => !v)}
            className="text-xs text-atlas-text-muted hover:text-atlas-text font-sans transition-colors cursor-pointer"
          >
            {showContext ? "Hide context \u25B4" : "Read more \u25BE"}
          </button>
          {showContext && (
            <p className="text-xs text-atlas-text-secondary leading-relaxed font-sans">
              {location.context}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-atlas-text-secondary leading-relaxed font-sans">
          {location.context}
        </p>
      )}

      {/* Spotify embed */}
      <div className="pt-1">
        <SpotifyPlayer trackId={trackId} autoPlaySignal={autoPlaySignal} onPlaybackStarted={onPlaybackStarted} />
      </div>

      {/* Navigation */}
      <div className={`flex items-center justify-between ${compact ? "pt-2" : "pt-4"} border-t border-atlas-border`}>
        <button
          onClick={() => onNavigate(-1)}
          disabled={!canNavigatePrev}
          className={`text-sm font-sans font-semibold ${compact ? "px-3 py-2" : "px-4 py-2.5"} rounded-lg transition-all duration-150 ${
            !canNavigatePrev
              ? "text-atlas-border bg-transparent cursor-not-allowed"
              : "text-white bg-atlas-text shadow-md hover:opacity-80 active:scale-95 cursor-pointer"
          }`}
        >
          &larr; Prev
        </button>
        <span className="text-xs text-atlas-text-muted font-sans">
          {location.narrativeOrder} / {totalLocations}
        </span>
        <button
          onClick={() => onNavigate(1)}
          disabled={!canNavigateNext}
          className={`text-sm font-sans font-semibold ${compact ? "px-3 py-2" : "px-4 py-2.5"} rounded-lg transition-all duration-150 ${
            !canNavigateNext
              ? "text-atlas-border bg-transparent cursor-not-allowed"
              : "text-white bg-atlas-text shadow-md hover:opacity-80 active:scale-95 cursor-pointer"
          }`}
        >
          Next &rarr;
        </button>
      </div>
    </motion.div>
    </AnimatePresence>
  );
};

const EmptyState = () => (
  <div className="p-6 h-full flex flex-col items-center justify-center text-center">
    <div className="text-5xl mb-3 opacity-40">&#x1F5FA;</div>
    <p className="text-atlas-text-muted italic text-sm font-serif-atlas">
      Select a pin on the map to see its lyric and story.
    </p>
    <p className="text-atlas-text-muted text-xs font-sans mt-2">
      Or press &ldquo;Play the Journey&rdquo; to walk through all 41 stops.
    </p>
  </div>
);

// Desktop sidebar version
export const DesktopSidebar = ({ location, onNavigate, journeyActive, totalLocations, canNavigatePrev, canNavigateNext, autoPlaySignal, onPlaybackStarted }) => {
  if (!location) return <EmptyState />;
  return (
    <LyricContent
      location={location}
      onNavigate={onNavigate}
      journeyActive={journeyActive}
      totalLocations={totalLocations}
      canNavigatePrev={canNavigatePrev}
      canNavigateNext={canNavigateNext}
      autoPlaySignal={autoPlaySignal}
      onPlaybackStarted={onPlaybackStarted}
    />
  );
};

// Mobile bottom sheet version
export const MobileBottomSheet = ({ location, onNavigate, onClose, journeyActive, totalLocations, canNavigatePrev, canNavigateNext, autoPlaySignal, onPlaybackStarted }) => {
  return (
    <AnimatePresence>
      {location && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 bg-atlas-bg border-t border-atlas-border rounded-t-2xl shadow-custom-2xl z-[1001] max-h-[50vh] overflow-y-auto overflow-x-hidden"
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
            autoPlaySignal={autoPlaySignal}
            onPlaybackStarted={onPlaybackStarted}
            compact
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
