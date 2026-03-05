import React, { useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useScroll,
  AnimatePresence,
} from "framer-motion";
import { FaHeart, FaTimes } from "react-icons/fa";
import FeedControls from "./FeedControls";
import MoodEffect from "./MoodEffect";
import TypewriterText from "./TypewriterText";
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
  onContinue,
  onShare,
  onRemix,
  continuation,
  showScrollCue,
  scrollContainerRef,
}) => {
  const gradient = GENRE_GRADIENTS[story.genre] || GENRE_GRADIENTS["literary"];
  const accentColor = GENRE_ACCENT_COLORS[story.genre] || "#8B5CF6";
  const isPremise = story.type === "premise";
  const hasReacted = !!reaction;
  const cardRef = useRef(null);

  // --- Parallax scroll depth ---
  const { scrollYProgress } = useScroll({
    target: cardRef,
    container: scrollContainerRef,
    offset: ["start end", "end start"],
  });

  const contentOpacity = useTransform(
    scrollYProgress,
    [0, 0.25, 0.75, 1],
    [0, 1, 1, 0]
  );
  const contentScale = useTransform(
    scrollYProgress,
    [0, 0.25, 0.75, 1],
    [0.94, 1, 1, 0.94]
  );

  // --- Swipe gesture ---
  const dragX = useMotionValue(0);
  const swipeRotate = useTransform(dragX, [-200, 0, 200], [-6, 0, 6]);
  const likeOverlayOpacity = useTransform(dragX, [0, 120], [0, 0.25]);
  const dislikeOverlayOpacity = useTransform(dragX, [-120, 0], [0.25, 0]);

  const handleDragEnd = (_, info) => {
    if (hasReacted) return;
    if (info.offset.x > 100) {
      onLike();
    } else if (info.offset.x < -100) {
      onDislike();
    }
  };

  return (
    <div
      ref={cardRef}
      className={`h-dvh w-full snap-start relative bg-gradient-to-b ${gradient}`}
    >
      {/* Mood-reactive ambient effect */}
      <MoodEffect mood={story.mood} />

      {/* Subtle top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] z-[2]"
        style={{ backgroundColor: accentColor, opacity: 0.5 }}
      />

      {/* Swipe overlays */}
      {!hasReacted && (
        <>
          <motion.div
            className="absolute inset-0 bg-green-500 z-[3] pointer-events-none flex items-center justify-center"
            style={{ opacity: likeOverlayOpacity }}
          >
            <FaHeart className="text-white" size={64} style={{ opacity: 0.5 }} />
          </motion.div>
          <motion.div
            className="absolute inset-0 bg-red-500 z-[3] pointer-events-none flex items-center justify-center"
            style={{ opacity: dislikeOverlayOpacity }}
          >
            <FaTimes className="text-white" size={64} style={{ opacity: 0.5 }} />
          </motion.div>
        </>
      )}

      {/* Swipeable + parallax content wrapper */}
      <motion.div
        drag={hasReacted ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        dragDirectionLock
        onDragEnd={handleDragEnd}
        style={{
          x: hasReacted ? 0 : dragX,
          rotate: hasReacted ? 0 : swipeRotate,
          opacity: contentOpacity,
          scale: contentScale,
        }}
        className="h-full flex flex-col px-6 pt-16 pb-8 relative z-[2]"
      >
        <div className="max-w-lg w-full mx-auto flex gap-4 flex-1 min-h-0 items-center">
          {/* Story content */}
          <div className="flex-1 min-w-0 overflow-y-auto max-h-full py-4 scrollbar-hide">
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

            {/* Remixed-from label */}
            {story.remixedFrom && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-pt-accent text-xs mb-2 italic"
              >
                Remixed from &ldquo;{story.remixedFrom}&rdquo;
              </motion.p>
            )}

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

            {/* Content with typewriter reveal */}
            <TypewriterText
              text={story.content}
              mode={isPremise ? "word" : "line"}
              className={`text-pt-text-secondary leading-relaxed ${
                isPremise
                  ? "text-lg sm:text-xl"
                  : "text-base sm:text-lg"
              }`}
              style={{
                fontFamily: isPremise
                  ? '"DM Sans", system-ui, sans-serif'
                  : '"Libre Baskerville", Georgia, serif',
              }}
            />

            {/* Continuation */}
            <AnimatePresence>
              {continuation?.loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
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
              {continuation?.text && (
                <motion.div
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
                      Continued
                    </p>
                    <div
                      className="text-pt-text-secondary leading-relaxed text-base sm:text-lg whitespace-pre-line"
                      style={{
                        fontFamily: isPremise
                          ? '"DM Sans", system-ui, sans-serif'
                          : '"Libre Baskerville", Georgia, serif',
                      }}
                    >
                      {continuation.text}
                    </div>
                  </div>
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
              sessionLikes={sessionLikes}
              hasContinuation={!!continuation?.text}
              continuationLoading={!!continuation?.loading}
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
