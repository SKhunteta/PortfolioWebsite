import React from "react";
import { motion } from "framer-motion";
import { GENRES, GENRE_LABELS, GENRE_ACCENT_COLORS } from "./constants";

const GenreFilter = ({ activeGenre, onSelect }) => {
  return (
    <div className="flex gap-2 overflow-x-auto py-2 px-1 scrollbar-hide">
      {GENRES.map((genre) => {
        const isActive = activeGenre === genre;
        const color = genre === "all" ? "#8B5CF6" : GENRE_ACCENT_COLORS[genre];

        return (
          <motion.button
            key={genre}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(genre)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              isActive
                ? "text-white"
                : "text-pt-text-muted border-pt-border hover:text-pt-text-secondary hover:border-pt-text-muted"
            }`}
            style={
              isActive
                ? {
                    backgroundColor: `${color}30`,
                    borderColor: `${color}60`,
                    color: color,
                  }
                : {}
            }
          >
            {GENRE_LABELS[genre] || genre}
          </motion.button>
        );
      })}
    </div>
  );
};

export default GenreFilter;
