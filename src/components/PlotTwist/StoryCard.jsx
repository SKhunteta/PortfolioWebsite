import React from "react";
import { motion } from "framer-motion";
import FeedControls from "./FeedControls";
import { GENRE_GRADIENTS, GENRE_ACCENT_COLORS, GENRE_LABELS } from "./constants";

const StoryCard = ({
  story,
  index,
  totalCount,
  reaction,
  isSaved,
  sessionLikes,
  onLike,
  onDislike,
  onSave,
  showScrollCue,
}) => {
  const gradient = GENRE_GRADIENTS[story.genre] || GENRE_GRADIENTS["literary"];
  const accentColor = GENRE_ACCENT_COLORS[story.genre] || "#8B5CF6";
  const isPremise = story.type === "premise";

  return (
    <div className={`h-screen w-full snap-start relative bg-gradient-to-b ${gradient}`}>
      {/* Subtle top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ backgroundColor: accentColor, opacity: 0.5 }}
      />

      <div className="h-full flex items-center justify-center px-6 py-16">
        <div className="max-w-lg w-full flex gap-4 items-center">
          {/* Story content */}
          <div className="flex-1 min-w-0">
            {/* Counter */}
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="text-pt-text-muted text-xs font-mono mb-4"
            >
              {index + 1} of {totalCount}
            </motion.p>

            {/* Genre badge */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              viewport={{ once: true }}
              className="mb-4"
            >
              <span
                className="inline-block px-3 py-1 rounded-full text-xs font-medium border"
                style={{
                  color: accentColor,
                  borderColor: `${accentColor}40`,
                  backgroundColor: `${accentColor}15`,
                }}
              >
                {GENRE_LABELS[story.genre] || story.genre}
              </span>
              {story.mood && (
                <span className="ml-2 text-xs text-pt-text-muted italic">
                  {story.mood}
                </span>
              )}
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              viewport={{ once: true }}
              className={`font-bold text-pt-text mb-4 leading-tight ${
                isPremise ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"
              }`}
              style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
            >
              {story.title}
            </motion.h2>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              viewport={{ once: true }}
              className={`text-pt-text-secondary leading-relaxed whitespace-pre-line ${
                isPremise
                  ? "text-lg sm:text-xl"
                  : "text-base sm:text-lg"
              }`}
              style={{
                fontFamily: isPremise
                  ? '"DM Sans", system-ui, sans-serif'
                  : '"Libre Baskerville", Georgia, serif',
              }}
            >
              {story.content}
            </motion.div>

            {/* Tags */}
            {story.tags && story.tags.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                viewport={{ once: true }}
                className="flex flex-wrap gap-2 mt-5"
              >
                {story.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded bg-white/5 text-pt-text-muted border border-white/10"
                  >
                    #{tag}
                  </span>
                ))}
              </motion.div>
            )}
          </div>

          {/* Controls — floating on the right, TikTok-style */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            viewport={{ once: true }}
            className="flex-shrink-0"
          >
            <FeedControls
              onLike={onLike}
              onDislike={onDislike}
              onSave={onSave}
              isSaved={isSaved}
              reaction={reaction}
              sessionLikes={sessionLikes}
            />
          </motion.div>
        </div>
      </div>

      {/* Scroll cue on first card */}
      {showScrollCue && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        >
          <span className="text-pt-text-muted text-xs">scroll for more</span>
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-pt-text-muted text-lg"
          >
            &#8964;
          </motion.span>
        </motion.div>
      )}
    </div>
  );
};

export default StoryCard;
