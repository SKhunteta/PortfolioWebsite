import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaHeart, FaTimes, FaBookmark, FaRegBookmark } from "react-icons/fa";

const FloatingHeart = ({ id, onComplete }) => (
  <motion.div
    key={id}
    initial={{ opacity: 1, y: 0, scale: 0.5 }}
    animate={{
      opacity: 0,
      y: -80,
      scale: 1.2,
      x: (Math.random() - 0.5) * 60,
    }}
    transition={{ duration: 0.8, ease: "easeOut" }}
    onAnimationComplete={onComplete}
    className="absolute text-pt-like pointer-events-none"
    style={{ bottom: "100%" }}
  >
    <FaHeart size={16} />
  </motion.div>
);

const FeedControls = ({
  onLike,
  onDislike,
  onSave,
  isSaved,
  reaction,
  sessionLikes,
}) => {
  const [hearts, setHearts] = useState([]);
  const isLiked = reaction === "liked";
  const isDisliked = reaction === "disliked";
  const hasReacted = !!reaction;

  const handleLike = () => {
    if (hasReacted) return;
    // Spawn floating hearts
    const newHearts = Array.from({ length: 4 }, (_, i) => ({
      id: Date.now() + i,
    }));
    setHearts((prev) => [...prev, ...newHearts]);
    onLike();
  };

  const handleDislike = () => {
    if (hasReacted) return;
    onDislike();
  };

  const removeHeart = (heartId) => {
    setHearts((prev) => prev.filter((h) => h.id !== heartId));
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Like button */}
      <div className="relative flex flex-col items-center">
        <AnimatePresence>
          {hearts.map((heart) => (
            <FloatingHeart
              key={heart.id}
              id={heart.id}
              onComplete={() => removeHeart(heart.id)}
            />
          ))}
        </AnimatePresence>
        <motion.button
          whileTap={hasReacted ? {} : { scale: 1.3 }}
          onClick={handleLike}
          disabled={hasReacted}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isLiked
              ? "bg-pt-like/20 text-pt-like"
              : "bg-white/10 text-white/60 hover:text-white hover:bg-white/20"
          } ${hasReacted && !isLiked ? "opacity-30 cursor-not-allowed" : ""}`}
          aria-label="Like story"
        >
          <FaHeart size={20} />
        </motion.button>
        {sessionLikes > 0 && (
          <span className="text-xs text-pt-text-muted mt-1 font-mono">
            {sessionLikes}
          </span>
        )}
      </div>

      {/* Dislike button */}
      <motion.button
        whileTap={hasReacted ? {} : { scale: 1.3 }}
        onClick={handleDislike}
        disabled={hasReacted}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
          isDisliked
            ? "bg-pt-dislike/30 text-pt-dislike"
            : "bg-white/10 text-white/60 hover:text-white hover:bg-white/20"
        } ${hasReacted && !isDisliked ? "opacity-30 cursor-not-allowed" : ""}`}
        aria-label="Dislike story"
      >
        <FaTimes size={20} />
      </motion.button>

      {/* Save/bookmark button */}
      <motion.button
        whileTap={{ scale: 1.2 }}
        onClick={onSave}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
          isSaved
            ? "bg-pt-accent/20 text-pt-accent"
            : "bg-white/10 text-white/60 hover:text-white hover:bg-white/20"
        }`}
        aria-label={isSaved ? "Unsave story" : "Save story"}
      >
        {isSaved ? <FaBookmark size={18} /> : <FaRegBookmark size={18} />}
      </motion.button>
    </div>
  );
};

export default FeedControls;
