import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaHeart,
  FaTimes,
  FaBookmark,
  FaRegBookmark,
  FaMagic,
  FaShareAlt,
  FaDice,
} from "react-icons/fa";

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

const ControlButton = ({
  onClick,
  disabled,
  active,
  activeClass,
  inactiveClass,
  dimmed,
  ariaLabel,
  size = "w-12 h-12",
  children,
}) => (
  <motion.button
    whileTap={disabled ? {} : { scale: 1.3 }}
    onClick={onClick}
    disabled={disabled}
    className={`${size} rounded-full flex items-center justify-center transition-colors ${
      active
        ? activeClass
        : inactiveClass || "bg-white/10 text-white/60 hover:text-white hover:bg-white/20"
    } ${dimmed ? "opacity-30 cursor-not-allowed" : ""}`}
    aria-label={ariaLabel}
  >
    {children}
  </motion.button>
);

const FeedControls = ({
  onLike,
  onDislike,
  onSave,
  onContinue,
  onShare,
  onRemix,
  isSaved,
  reaction,
  sessionLikes,
  hasContinuation,
  continuationLoading,
}) => {
  const [hearts, setHearts] = useState([]);
  const isLiked = reaction === "liked";
  const isDisliked = reaction === "disliked";
  const hasReacted = !!reaction;

  const handleLike = () => {
    if (hasReacted) return;
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
    <div className="flex flex-col items-center gap-4">
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
        <ControlButton
          onClick={handleLike}
          disabled={hasReacted}
          active={isLiked}
          activeClass="bg-pt-like/20 text-pt-like"
          dimmed={hasReacted && !isLiked}
          ariaLabel="Like story"
        >
          <FaHeart size={20} />
        </ControlButton>
        {sessionLikes > 0 && (
          <span className="text-xs text-pt-text-muted mt-1 font-mono">
            {sessionLikes}
          </span>
        )}
      </div>

      {/* Dislike button */}
      <ControlButton
        onClick={handleDislike}
        disabled={hasReacted}
        active={isDisliked}
        activeClass="bg-pt-dislike/30 text-pt-dislike"
        dimmed={hasReacted && !isDisliked}
        ariaLabel="Dislike story"
      >
        <FaTimes size={20} />
      </ControlButton>

      {/* Save/bookmark button */}
      <ControlButton
        onClick={onSave}
        active={isSaved}
        activeClass="bg-pt-accent/20 text-pt-accent"
        ariaLabel={isSaved ? "Unsave story" : "Save story"}
      >
        {isSaved ? <FaBookmark size={18} /> : <FaRegBookmark size={18} />}
      </ControlButton>

      {/* Divider */}
      <div className="w-6 h-px bg-white/10" />

      {/* Continue button */}
      {onContinue && (
        <ControlButton
          onClick={onContinue}
          disabled={hasContinuation || continuationLoading}
          active={hasContinuation}
          activeClass="bg-pt-accent/20 text-pt-accent"
          dimmed={continuationLoading}
          ariaLabel="Continue this story"
          size="w-10 h-10"
        >
          <FaMagic size={14} />
        </ControlButton>
      )}

      {/* Remix button */}
      {onRemix && (
        <ControlButton
          onClick={onRemix}
          ariaLabel="Remix this story"
          size="w-10 h-10"
        >
          <FaDice size={14} />
        </ControlButton>
      )}

      {/* Share button */}
      {onShare && (
        <ControlButton
          onClick={onShare}
          ariaLabel="Share this story"
          size="w-10 h-10"
        >
          <FaShareAlt size={14} />
        </ControlButton>
      )}
    </div>
  );
};

export default FeedControls;
