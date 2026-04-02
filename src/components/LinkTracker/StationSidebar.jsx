import React, { useState, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { LINES } from "./constants";

const SWIPE_THRESHOLD = 50;

const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? -200 : 200, opacity: 0 }),
};

const StatusBadge = ({ operational, openedYear }) => {
  if (operational) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Operational{openedYear ? ` since ${openedYear}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Planned
    </span>
  );
};

const LineBadges = ({ lines }) => (
  <div className="flex flex-wrap gap-1.5">
    {lines.map((lineId) => {
      const line = LINES[lineId];
      if (!line) return null;
      return (
        <span
          key={lineId}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: line.color }}
        >
          {line.name}
        </span>
      );
    })}
  </div>
);

const StationContent = ({
  station,
  onNavigate,
  totalStations,
  canNavigatePrev,
  canNavigateNext,
  compact = false,
}) => {
  const [slideDirection, setSlideDirection] = useState(0);
  const dragX = useMotionValue(0);

  const handleDragEnd = useCallback(
    (_, info) => {
      const swipe = info.offset.x;
      if (swipe < -SWIPE_THRESHOLD && canNavigateNext) {
        setSlideDirection(1);
        onNavigate(1);
      } else if (swipe > SWIPE_THRESHOLD && canNavigatePrev) {
        setSlideDirection(-1);
        onNavigate(-1);
      }
    },
    [onNavigate, canNavigatePrev, canNavigateNext]
  );

  return (
    <AnimatePresence mode="wait" custom={slideDirection}>
      <motion.div
        key={station.id}
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
        {/* Line badges */}
        <LineBadges lines={station.lines} />

        {/* Station name */}
        <h2
          className={`font-display font-bold text-link-text leading-tight ${
            compact ? "text-base" : "text-xl"
          }`}
        >
          {station.name}
        </h2>

        {/* Neighborhood + status */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm text-link-text-secondary font-sans">
            {station.neighborhood}
          </p>
          <StatusBadge operational={station.operational} openedYear={station.openedYear} />
        </div>

        {/* Blurb */}
        <p
          className={`text-link-text-secondary leading-relaxed font-sans ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          {station.blurb}
        </p>

        {/* Notable fact */}
        {station.notableFact && (
          <div
            className={`rounded-lg bg-link-blue/5 border border-link-blue/20 ${
              compact ? "p-2.5" : "p-3"
            }`}
          >
            <p className={`text-link-text font-sans ${compact ? "text-xs" : "text-sm"}`}>
              <span className="font-semibold">Did you know?</span>{" "}
              {station.notableFact}
            </p>
          </div>
        )}

        {/* Navigation */}
        <div
          className={`flex items-center justify-between ${
            compact ? "pt-2" : "pt-4"
          } border-t border-link-border`}
        >
          <button
            onClick={() => onNavigate(-1)}
            disabled={!canNavigatePrev}
            className={`text-sm font-sans font-semibold ${
              compact ? "px-3 py-2" : "px-4 py-2.5"
            } rounded-lg transition-all duration-150 ${
              !canNavigatePrev
                ? "text-link-border bg-transparent cursor-not-allowed"
                : "text-white bg-link-text shadow-md hover:opacity-80 active:scale-95 cursor-pointer"
            }`}
          >
            &larr; Prev
          </button>
          <span className="text-xs text-link-text-muted font-sans">
            {station.name}
          </span>
          <button
            onClick={() => onNavigate(1)}
            disabled={!canNavigateNext}
            className={`text-sm font-sans font-semibold ${
              compact ? "px-3 py-2" : "px-4 py-2.5"
            } rounded-lg transition-all duration-150 ${
              !canNavigateNext
                ? "text-link-border bg-transparent cursor-not-allowed"
                : "text-white bg-link-text shadow-md hover:opacity-80 active:scale-95 cursor-pointer"
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
    <div className="text-5xl mb-3 opacity-40">&#x1F689;</div>
    <p className="text-link-text-muted italic text-sm font-sans">
      Select a station on the map to see details.
    </p>
    <p className="text-link-text-muted text-xs font-sans mt-2">
      Click any marker to explore the Link network.
    </p>
  </div>
);

export const DesktopSidebar = ({
  station,
  onNavigate,
  totalStations,
  canNavigatePrev,
  canNavigateNext,
}) => {
  if (!station) return <EmptyState />;
  return (
    <StationContent
      station={station}
      onNavigate={onNavigate}
      totalStations={totalStations}
      canNavigatePrev={canNavigatePrev}
      canNavigateNext={canNavigateNext}
    />
  );
};

export const MobileBottomSheet = ({
  station,
  onNavigate,
  onClose,
  totalStations,
  canNavigatePrev,
  canNavigateNext,
}) => {
  return (
    <AnimatePresence>
      {station && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 bg-link-bg border-t border-link-border rounded-t-2xl shadow-custom-2xl z-[1001] max-h-[50vh] overflow-y-auto overflow-x-hidden"
        >
          <div className="flex justify-center py-2 sticky top-0 bg-link-bg rounded-t-2xl">
            <button
              onClick={onClose}
              className="w-10 h-1 rounded-full bg-link-border"
              aria-label="Close"
            />
          </div>
          <StationContent
            station={station}
            onNavigate={onNavigate}
            totalStations={totalStations}
            canNavigatePrev={canNavigatePrev}
            canNavigateNext={canNavigateNext}
            compact
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
