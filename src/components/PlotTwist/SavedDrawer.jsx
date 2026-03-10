import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaTrash, FaBookmark } from "react-icons/fa";
import { GENRE_LABELS, GENRE_ACCENT_COLORS } from "./constants";

const SavedDrawer = ({ isOpen, onClose, savedStories, onClearAll }) => {
  const [confirmClear, setConfirmClear] = useState(false);

  // Reset confirmation when drawer closes
  useEffect(() => {
    if (!isOpen) setConfirmClear(false);
  }, [isOpen]);

  // Escape key to close
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    onClearAll();
    setConfirmClear(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40"
          />

          {/* Drawer */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Saved stories"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-pt-surface rounded-t-2xl max-h-[75vh] flex flex-col border-t border-pt-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-pt-border shrink-0">
              <div className="flex items-center gap-2">
                <FaBookmark className="text-pt-accent" size={14} />
                <h3 className="text-pt-text font-semibold text-lg">
                  Saved Stories
                </h3>
                <span className="text-pt-text-muted text-sm">
                  ({savedStories.length})
                </span>
              </div>
              <div className="flex items-center gap-3">
                {savedStories.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className={`text-xs flex items-center gap-1 transition-colors ${
                      confirmClear
                        ? "text-pt-like font-semibold"
                        : "text-pt-text-muted hover:text-pt-like"
                    }`}
                  >
                    <FaTrash size={10} />
                    {confirmClear ? "Tap again to confirm" : "Clear all"}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-pt-text-muted hover:text-pt-text transition-colors"
                  aria-label="Close saved stories"
                >
                  <FaTimes size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-5">
              {savedStories.length === 0 ? (
                <div className="text-center py-12">
                  <FaBookmark className="text-pt-text-muted mx-auto mb-3" size={24} />
                  <p className="text-pt-text-muted text-sm">
                    No saved stories yet. Tap the bookmark icon to save stories
                    you love.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedStories.map((story) => {
                    const color =
                      GENRE_ACCENT_COLORS[story.genre] || "#8B5CF6";
                    return (
                      <div
                        key={story.id}
                        className="p-4 rounded-lg bg-white/5 border border-pt-border"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4
                            className="text-pt-text font-semibold"
                            style={{
                              fontFamily:
                                '"DM Serif Display", Georgia, serif',
                            }}
                          >
                            {story.title}
                          </h4>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full shrink-0"
                            style={{
                              color,
                              backgroundColor: `${color}15`,
                            }}
                          >
                            {GENRE_LABELS[story.genre] || story.genre}
                          </span>
                        </div>
                        <p className="text-pt-text-secondary text-sm leading-relaxed line-clamp-3 whitespace-pre-line">
                          {story.content}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SavedDrawer;
