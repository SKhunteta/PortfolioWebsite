import React, { useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaTrash } from "react-icons/fa";
import { GENRE_ACCENT_COLORS, GENRE_LABELS } from "./constants";

const RADAR_GENRES = [
  "sci-fi",
  "fantasy",
  "horror",
  "literary",
  "humor",
  "thriller",
  "mystery",
  "romance",
];

const RadarChart = ({ values, size = 240 }) => {
  const center = size / 2;
  const radius = size / 2 - 30;
  const count = RADAR_GENRES.length;
  const angleStep = (2 * Math.PI) / count;

  // Normalize values to 0-1 range
  const maxVal = Math.max(...Object.values(values), 1);

  const points = RADAR_GENRES.map((genre, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const val = (values[genre] || 0) / maxVal;
    return {
      genre,
      x: center + Math.cos(angle) * radius * val,
      y: center + Math.sin(angle) * radius * val,
      labelX: center + Math.cos(angle) * (radius + 18),
      labelY: center + Math.sin(angle) * (radius + 18),
      angle,
    };
  });

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid rings */}
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={RADAR_GENRES.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            return `${center + Math.cos(angle) * radius * ring},${center + Math.sin(angle) * radius * ring}`;
          }).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {RADAR_GENRES.map((_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={center + Math.cos(angle) * radius}
            y2={center + Math.sin(angle) * radius}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      <motion.polygon
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        points={polygonPoints}
        fill="rgba(139,92,246,0.15)"
        stroke="#8B5CF6"
        strokeWidth="2"
        style={{ transformOrigin: `${center}px ${center}px` }}
      />

      {/* Data points */}
      {points.map((p, i) => (
        <motion.circle
          key={p.genre}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 + i * 0.05 }}
          cx={p.x}
          cy={p.y}
          r="3"
          fill={GENRE_ACCENT_COLORS[p.genre] || "#8B5CF6"}
        />
      ))}

      {/* Labels */}
      {points.map((p) => (
        <text
          key={`label-${p.genre}`}
          x={p.labelX}
          y={p.labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={GENRE_ACCENT_COLORS[p.genre] || "#A0A0B8"}
          fontSize="10"
          fontFamily='"DM Sans", system-ui, sans-serif'
        >
          {GENRE_LABELS[p.genre] || p.genre}
        </text>
      ))}
    </svg>
  );
};

const StatCard = ({ label, value, color }) => (
  <div className="flex-1 text-center p-3 rounded-lg bg-white/5">
    <p className="text-2xl font-bold" style={{ color: color || "#F0F0F0" }}>
      {value}
    </p>
    <p className="text-xs text-pt-text-muted mt-1">{label}</p>
  </div>
);

const TasteProfile = ({ isOpen, onClose, preferences, onReset }) => {
  // Escape key to close
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const stats = useMemo(() => {
    const likedGenres = preferences.likedGenres || {};
    const dislikedGenres = preferences.dislikedGenres || {};
    const totalLikes = Object.values(likedGenres).reduce((a, b) => a + b, 0);
    const totalDislikes = Object.values(dislikedGenres).reduce(
      (a, b) => a + b,
      0
    );
    const totalRead = totalLikes + totalDislikes;

    // Find favorite genre
    let favoriteGenre = null;
    let maxLikes = 0;
    for (const [genre, count] of Object.entries(likedGenres)) {
      if (count > maxLikes) {
        maxLikes = count;
        favoriteGenre = genre;
      }
    }

    return { totalRead, totalLikes, totalDislikes, favoriteGenre };
  }, [preferences]);

  const hasData = stats.totalRead > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Taste profile"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-pt-surface rounded-t-2xl max-h-[80vh] flex flex-col border-t border-pt-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-pt-border shrink-0">
              <h3
                className="text-pt-text font-semibold text-lg"
                style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
              >
                Your Taste Profile
              </h3>
              <button
                onClick={onClose}
                className="text-pt-text-muted hover:text-pt-text transition-colors"
                aria-label="Close"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-5">
              {!hasData ? (
                <div className="text-center py-12">
                  <p className="text-pt-text-muted text-sm">
                    Like and dislike stories to build your taste profile.
                  </p>
                </div>
              ) : (
                <>
                  {/* Radar chart */}
                  <div className="flex justify-center mb-6">
                    <RadarChart values={preferences.likedGenres || {}} />
                  </div>

                  {/* Stats */}
                  <div className="flex gap-3 mb-6">
                    <StatCard
                      label="Stories Read"
                      value={stats.totalRead}
                    />
                    <StatCard
                      label="Liked"
                      value={stats.totalLikes}
                      color="#EF4444"
                    />
                    <StatCard
                      label="Favorite"
                      value={
                        stats.favoriteGenre
                          ? GENRE_LABELS[stats.favoriteGenre] ||
                            stats.favoriteGenre
                          : "—"
                      }
                      color={
                        stats.favoriteGenre
                          ? GENRE_ACCENT_COLORS[stats.favoriteGenre]
                          : undefined
                      }
                    />
                  </div>

                  {/* Genre breakdown */}
                  <div className="space-y-2 mb-6">
                    <p className="text-pt-text-muted text-xs uppercase tracking-wider mb-3">
                      Genre Breakdown
                    </p>
                    {Object.entries(preferences.likedGenres || {})
                      .sort((a, b) => b[1] - a[1])
                      .map(([genre, count]) => {
                        const color =
                          GENRE_ACCENT_COLORS[genre] || "#8B5CF6";
                        const maxCount = Math.max(
                          ...Object.values(preferences.likedGenres || {}),
                          1
                        );
                        const width = (count / maxCount) * 100;
                        return (
                          <div key={genre} className="flex items-center gap-3">
                            <span
                              className="text-xs w-20 text-right shrink-0"
                              style={{ color }}
                            >
                              {GENRE_LABELS[genre] || genre}
                            </span>
                            <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${width}%` }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            </div>
                            <span className="text-xs text-pt-text-muted w-6 text-right">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                  </div>

                  {/* Reset */}
                  <button
                    onClick={() => {
                      onReset();
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-pt-border text-pt-text-muted text-sm hover:bg-white/5 hover:text-pt-like transition-colors"
                  >
                    <FaTrash size={12} />
                    Reset Preferences
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TasteProfile;
