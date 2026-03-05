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

      {/* Continue button */}
      {onContinue && (
        <div className="relative">
          <ControlButton
            onClick={onContinue}
            disabled={continuationLoading}
            active={continuationCount > 0}
            activeClass="bg-pt-accent/20 text-pt-accent"
            dimmed={continuationLoading}
            ariaLabel="Continue this story"
            size="w-10 h-10"
          >
            <FaMagic size={14} />
          </ControlButton>
          {continuationCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pt-accent text-white text-[10px] flex items-center justify-center font-bold">
              {continuationCount}
            </span>
          )}
        </div>
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
