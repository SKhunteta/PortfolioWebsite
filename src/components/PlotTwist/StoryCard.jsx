import React, { useRef, useState, useCallback } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useScroll,
  AnimatePresence,
} from "framer-motion";
import { FaHeart } from "react-icons/fa";
import FeedControls from "./FeedControls";
import MoodEffect from "./MoodEffect";
import TypewriterText from "./TypewriterText";
import GenreDecoration from "./GenreDecoration";
import {
  GENRE_GRADIENTS,
  GENRE_ACCENT_COLORS,
  GENRE_LABELS,
  SWIPE_STAMPS,
} from "./constants";

// --- Layout mode selector ---
function getLayoutMode(genre, type) {
  if (type === "premise") return "quote";
  if (genre === "noir") return "noir";
  if (genre === "horror") return "glitch";
  if (["literary", "historical", "romance"].includes(genre)) return "manuscript";
  return "default";
}

// --- Stagger variants ---
const contentVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

const StoryCard = ({
  story,
  index,
  totalCount,
  reaction,
  isSaved,
  onLike,
  onDislike,
  onSave,
  onContinue,
  onShare,
  onRemix,
  continuation,
  showScrollCue,
  scrollContainerRef,
  isMilestone,
}) => {
  const gradient = GENRE_GRADIENTS[story.genre] || GENRE_GRADIENTS["literary"];
  const accentColor = GENRE_ACCENT_COLORS[story.genre] || "#8B5CF6";
  const isPremise = story.type === "premise";
  const hasReacted = !!reaction;
  const cardRef = useRef(null);
  const layoutMode = getLayoutMode(story.genre, story.type);

  // --- Double-tap ---
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const lastTapRef = useRef(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap detected
      if (!hasReacted) {
        onLike();
        setShowDoubleTapHeart(true);
        setTimeout(() => setShowDoubleTapHeart(false), 1000);
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [hasReacted, onLike]);

  // --- Parallax scroll depth (amplified) ---
  const { scrollYProgress } = useScroll({
    target: cardRef,
    container: scrollContainerRef,
    offset: ["start end", "end start"],
  });

  const contentOpacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    [0, 1, 1, 0]
  );
  const contentScale = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    [0.85, 1, 1, 0.85]
  );
  const contentY = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    [30, 0, 0, -30]
  );
  const contentBlur = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    [2, 0, 0, 2]
  );

  // --- Swipe gesture ---
  const dragX = useMotionValue(0);
  const swipeRotate = useTransform(dragX, [-200, 0, 200], [-6, 0, 6]);
  const likeOverlayOpacity = useTransform(dragX, [0, 120], [0, 0.35]);
  const dislikeOverlayOpacity = useTransform(dragX, [-120, 0], [0.35, 0]);

  const handleDragEnd = (_, info) => {
    if (hasReacted) return;
    if (info.offset.x > 100) {
      onLike();
    } else if (info.offset.x < -100) {
      onDislike();
    }
  };

  // --- Swipe stamp text ---
  const stamps = SWIPE_STAMPS[story.genre] || SWIPE_STAMPS.default;

  // --- Layout-specific classes ---
  const titleClasses = (() => {
    switch (layoutMode) {
      case "quote":
        return "text-3xl sm:text-4xl text-center";
      case "noir":
        return "text-2xl sm:text-3xl uppercase tracking-wider";
      case "glitch":
        return "text-2xl sm:text-3xl hover:animate-pt-glitch";
      case "manuscript":
        return "text-2xl sm:text-3xl italic";
      default:
        return isPremise ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl";
    }
  })();

  const titleStyle = (() => {
    if (layoutMode === "glitch") {
      return {
        fontFamily: '"DM Serif Display", Georgia, serif',
        textShadow: "1px 0 #ff000040, -1px 0 #00ffff40",
      };
    }
    if (layoutMode === "noir") {
      return { fontFamily: '"JetBrains Mono", monospace' };
    }
    return { fontFamily: '"DM Serif Display", Georgia, serif' };
  })();

  const contentClasses = (() => {
    switch (layoutMode) {
      case "quote":
        return "text-xl sm:text-2xl text-center leading-relaxed";
      case "manuscript":
        return "text-base sm:text-lg leading-relaxed [&>p]:indent-8";
      case "noir":
        return "text-sm sm:text-base leading-relaxed max-w-sm";
      default:
        return `leading-relaxed ${
          isPremise ? "text-lg sm:text-xl" : "text-base sm:text-lg"
        }`;
    }
  })();

  const contentStyle = (() => {
    if (layoutMode === "manuscript" || layoutMode === "quote") {
      return { fontFamily: '"Libre Baskerville", Georgia, serif' };
    }
    if (layoutMode === "noir") {
      return { fontFamily: '"DM Sans", system-ui, sans-serif' };
    }
    return {
      fontFamily: isPremise
        ? '"DM Sans", system-ui, sans-serif'
        : '"Libre Baskerville", Georgia, serif',
    };
  })();

  const contentWrapperClasses = (() => {
    if (layoutMode === "manuscript") {
      return "flex-1 min-w-0 overflow-y-auto max-h-full py-4 scrollbar-hide border-l border-white/10 pl-4 max-w-md";
    }
    if (layoutMode === "quote") {
      return "flex-1 min-w-0 overflow-y-auto max-h-full py-4 scrollbar-hide flex flex-col items-center justify-center";
    }
    return "flex-1 min-w-0 overflow-y-auto max-h-full py-4 scrollbar-hide";
  })();

  return (
    <div
      ref={cardRef}
      className={`h-dvh w-full snap-start relative bg-gradient-to-b ${gradient}`}
    >
      {/* Mood-reactive ambient effect */}
      <MoodEffect mood={story.mood} />

      {/* Genre decoration */}
      <GenreDecoration genre={story.genre} />

      {/* Subtle top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] z-[2]"
        style={{ backgroundColor: accentColor, opacity: 0.5 }}
      />

      {/* Swipe stamp overlays */}
      {!hasReacted && (
        <>
          <motion.div
            className="absolute inset-0 z-[3] pointer-events-none flex items-center justify-center"
            style={{ opacity: likeOverlayOpacity }}
          >
            <div
              className="animate-pt-stamp-in text-5xl sm:text-6xl font-black uppercase tracking-widest select-none"
              style={{
                color: accentColor,
                WebkitTextStroke: `2px ${accentColor}`,
                textShadow: `0 0 40px ${accentColor}60`,
                transform: "rotate(-12deg)",
              }}
            >
              {stamps.like}
            </div>
          </motion.div>
          <motion.div
            className="absolute inset-0 z-[3] pointer-events-none flex items-center justify-center"
            style={{ opacity: dislikeOverlayOpacity }}
          >
            <div
              className="text-5xl sm:text-6xl font-black uppercase tracking-widest select-none"
              style={{
                color: "#6B728080",
                WebkitTextStroke: "2px #6B7280",
                transform: "rotate(12deg)",
              }}
            >
              {stamps.dislike}
            </div>
          </motion.div>
        </>
      )}

      {/* Double-tap heart */}
      <AnimatePresence>
        {showDoubleTapHeart && (
          <motion.div
            className="absolute inset-0 z-[4] pointer-events-none flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <FaHeart
              size={80}
              className="text-white drop-shadow-lg animate-pt-double-tap-heart"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swipeable + parallax content wrapper */}
      <motion.div
        drag={hasReacted ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        dragDirectionLock
        onDragEnd={handleDragEnd}
        onClick={handleTap}
        style={{
          x: hasReacted ? 0 : dragX,
          rotate: hasReacted ? 0 : swipeRotate,
          opacity: contentOpacity,
          scale: contentScale,
          y: contentY,
          filter: useTransform(contentBlur, (v) => `blur(${v}px)`),
        }}
        className="h-full flex flex-col px-6 pt-16 pb-8 relative z-[2]"
      >
        <div className="max-w-lg w-full mx-auto flex gap-4 flex-1 min-h-0 items-center">
          {/* Story content */}
          <div className={contentWrapperClasses}>
            {/* Staggered entry container */}
            <motion.div
              variants={contentVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {/* Counter */}
              <motion.p
                variants={itemVariant}
                className="text-pt-text-muted text-xs font-mono mb-4"
              >
                {index + 1} of {totalCount}
              </motion.p>

              {/* Remixed-from label */}
              {story.remixedFrom && (
                <motion.p
                  variants={itemVariant}
                  className="text-pt-accent text-xs mb-2 italic"
                >
                  Remixed from &ldquo;{story.remixedFrom}&rdquo;
                </motion.p>
              )}

              {/* Genre badge */}
              <motion.div variants={itemVariant} className="mb-4">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${
                    layoutMode === "noir" ? "font-mono" : ""
                  }`}
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

              {/* Decorative quote marks for quote layout */}
              {layoutMode === "quote" && (
                <motion.span
                  variants={itemVariant}
                  className="text-6xl leading-none block mb-2"
                  style={{ color: `${accentColor}30` }}
                >
                  &ldquo;
                </motion.span>
              )}

              {/* Title */}
              <motion.h2
                variants={itemVariant}
                className={`font-bold text-pt-text mb-4 leading-tight ${titleClasses}`}
                style={titleStyle}
              >
                {story.title}
              </motion.h2>

              {/* Content with typewriter reveal */}
              <TypewriterText
                text={story.content}
                mode={isPremise ? "word" : "line"}
                className={`text-pt-text-secondary ${contentClasses}`}
                style={contentStyle}
              />

              {/* Closing quote mark */}
              {layoutMode === "quote" && (
                <motion.span
                  variants={itemVariant}
                  className="text-6xl leading-none block mt-2 text-right"
                  style={{ color: `${accentColor}30` }}
                >
                  &rdquo;
                </motion.span>
              )}
            </motion.div>

            {/* Continuations */}
            {continuation?.texts?.map((text, ci) => (
              <motion.div
                key={ci}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div
                  className="mt-4 pt-4 border-t border-white/10"
                  style={{
                    background:
                      "linear-gradient(to right, transparent, rgba(139,92,246,0.1), transparent)",
                    backgroundSize: "100% 1px",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "top",
                  }}
                >
                  <p className="text-pt-text-muted text-[10px] uppercase tracking-wider mb-3">
                    {continuation.texts.length > 1
                      ? `Continued (${ci + 1})`
                      : "Continued"}
                  </p>
                  <TypewriterText
                    text={text}
                    mode="line"
                    className="text-pt-text-secondary leading-relaxed text-base sm:text-lg"
                    style={{
                      fontFamily: isPremise
                        ? '"DM Sans", system-ui, sans-serif'
                        : '"Libre Baskerville", Georgia, serif',
                    }}
                  />
                </div>
              </motion.div>
            ))}
            <AnimatePresence>
              {continuation?.loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 flex items-center gap-1.5"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        delay: i * 0.2,
                      }}
                      className="w-1.5 h-1.5 rounded-full bg-pt-accent"
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

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
              onContinue={onContinue}
              onShare={onShare}
              onRemix={onRemix}
              isSaved={isSaved}
              reaction={reaction}
              continuationCount={continuation?.texts?.length || 0}
              continuationLoading={!!continuation?.loading}
              accentColor={accentColor}
              isMilestone={isMilestone}
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll cue on first card */}
      {showScrollCue && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-[2]"
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
