import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes } from "react-icons/fa";
import { GENRES, GENRE_LABELS, GENRE_ACCENT_COLORS } from "./constants";

const RemixPicker = ({ isOpen, onClose, onSelect, originalGenre, loading, error }) => {
  const [selected, setSelected] = useState(null);
  const genres = GENRES.filter((g) => g !== "all" && g !== originalGenre);

  const handleSelect = (genre) => {
    setSelected(genre);
    onSelect(genre);
  };

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
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-pt-surface rounded-t-2xl p-5 border-t border-pt-border max-h-[50vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-pt-text font-semibold text-lg"
                style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
              >
                Remix as...
              </h3>
              <button
                onClick={onClose}
                className="text-pt-text-muted hover:text-pt-text transition-colors"
                aria-label="Close"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {loading && selected && (
              <div className="flex items-center gap-2 mb-4 text-pt-accent text-sm">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="inline-block"
                >
                  &#9881;
                </motion.span>
                Remixing as {GENRE_LABELS[selected]}...
              </div>
            )}

            {error && (
              <div className="mb-4 text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2 border border-red-400/20">
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => {
                const color = GENRE_ACCENT_COLORS[genre] || "#8B5CF6";
                const isSelected = selected === genre;
                return (
                  <motion.button
                    key={genre}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelect(genre)}
                    disabled={loading}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: `${color}30`,
                            borderColor: `${color}60`,
                            color: color,
                          }
                        : {
                            backgroundColor: "rgba(255,255,255,0.05)",
                            borderColor: "rgba(255,255,255,0.1)",
                            color: "#A0A0B8",
                          }
                    }
                  >
                    {GENRE_LABELS[genre] || genre}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RemixPicker;
