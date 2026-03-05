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
import LikeBurst from "./LikeBurst";

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
  continuationCount,
  continuationLoading,
  accentColor,
  isMilestone,
}) => {
  const [burstKey, setBurstKey] = useState(0);
  const [showBurst, setShowBurst] = useState(false);
  const isLiked = reaction === "liked";
  const isDisliked = reaction === "disliked";
  const hasReacted = !!reaction;

  const handleLike = () => {
    if (hasReacted) return;
    setBurstKey((k) => k + 1);
    setShowBurst(true);
    setTimeout(() => setShowBurst(false), 800);
    onLike();
  };

  const handleDislike = () => {
    if (hasReacted) return;
    onDislike();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Like button */}
      <div className="relative flex flex-col items-center">
        <AnimatePresence>
          {showBurst && (
            <LikeBurst
              key={burstKey}
              accentColor={accentColor}
              isMilestone={isMilestone}
            />
          )}
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

      {/* Continue button — prominent with label */}
      {onContinue && (
        <div className="relative flex flex-col items-center">
          <motion.button
            whileTap={continuationLoading ? {} : { scale: 1.15 }}
            onClick={onContinue}
            disabled={continuationLoading}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-colors text-xs font-medium ${
              continuationLoading
                ? "opacity-40 cursor-not-allowed bg-white/5 text-white/40"
                : continuationCount > 0
                ? "bg-pt-accent/20 text-pt-accent border border-pt-accent/30 hover:bg-pt-accent/30"
                : "bg-white/10 text-white/70 hover:text-white hover:bg-white/20 border border-white/10"
            }`}
            aria-label="Continue this story"
          >
            <FaMagic size={12} />
            <span style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
              {continuationLoading
                ? "Writing..."
                : continuationCount > 0
                ? `More (${continuationCount})`
                : "Continue"}
            </span>
          </motion.button>
        </div>
      )}

      {/* Remix button — labeled pill */}
      {onRemix && (
        <motion.button
          whileTap={{ scale: 1.15 }}
          onClick={onRemix}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 border border-white/10 transition-colors text-xs font-medium"
          aria-label="Remix this story"
        >
          <FaDice size={12} />
          <span style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
            Remix
          </span>
        </motion.button>
      )}

      {/* Share button — labeled pill */}
      {onShare && (
        <motion.button
          whileTap={{ scale: 1.15 }}
          onClick={onShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 border border-white/10 transition-colors text-xs font-medium"
          aria-label="Share this story"
        >
          <FaShareAlt size={12} />
          <span style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
            Share
          </span>
        </motion.button>
      )}
    </div>
  );
};

export default FeedControls;
