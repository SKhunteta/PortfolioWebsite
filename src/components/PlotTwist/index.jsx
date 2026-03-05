import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaBookmark, FaFilter } from "react-icons/fa";
import useStoryFeed from "./useStoryFeed";
import StoryCard from "./StoryCard";
import GenreFilter from "./GenreFilter";
import SavedDrawer from "./SavedDrawer";
import { STORAGE_KEYS } from "./constants";

const WelcomeCard = ({ onStart }) => (
  <div className="h-screen w-full snap-start flex items-center justify-center bg-gradient-to-b from-pt-accent/20 via-pt-bg to-pt-bg px-6">
    <div className="max-w-md text-center">
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="text-5xl sm:text-6xl font-bold text-pt-text mb-3"
        style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
      >
        Plot Twist
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-pt-accent text-sm font-medium tracking-widest uppercase mb-8"
      >
        Swipe through the multiverse of stories
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="text-pt-text-secondary text-lg mb-10 leading-relaxed"
        style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
      >
        AI-generated story ideas and excerpts, served up fresh. Like what hooks
        you, skip what doesn&apos;t. Your taste shapes the feed.
      </motion.p>
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
        className="px-8 py-3 rounded-full bg-pt-accent text-white font-semibold text-lg transition-shadow hover:shadow-lg hover:shadow-pt-accent/25"
      >
        Start Reading
      </motion.button>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="mt-12"
      >
        <motion.span
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-pt-text-muted text-2xl inline-block"
        >
          &#8964;
        </motion.span>
      </motion.div>
    </div>
  </div>
);

const LoadingCard = () => (
  <div className="h-screen w-full snap-start flex items-center justify-center bg-pt-bg px-6">
    <div className="text-center">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-pt-text-secondary text-xl mb-4"
        style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
      >
        Conjuring more stories
      </motion.p>
      <div className="flex justify-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
            className="w-2 h-2 rounded-full bg-pt-accent"
          />
        ))}
      </div>
    </div>
  </div>
);

const PlotTwist = () => {
  const {
    stories,
    loading,
    error,
    reactions,
    savedStories,
    sessionLikes,
    genreFilter,
    setGenreFilter,
    loadMore,
    likeStory,
    dislikeStory,
    saveStory,
    isStorySaved,
    clearSaved,
  } = useStoryFeed();

  const [showWelcome, setShowWelcome] = useState(() => {
    try {
      return !localStorage.getItem(STORAGE_KEYS.visited);
    } catch {
      return true;
    }
  });
  const [showFilter, setShowFilter] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const scrollRef = useRef(null);

  const handleStart = () => {
    setShowWelcome(false);
    try {
      localStorage.setItem(STORAGE_KEYS.visited, "true");
    } catch {
      // ignore
    }
  };

  // Infinite scroll — load more when near the end
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loading) return;

    const scrollBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // When within 2 viewport-heights of the bottom, load more
    if (scrollBottom < el.clientHeight * 2) {
      loadMore();
    }
  }, [loading, loadMore]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div className="h-screen bg-pt-bg relative overflow-hidden">
      {/* Floating header */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="pointer-events-auto">
            <h1
              className="text-xl font-bold text-pt-text/80"
              style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
            >
              Plot Twist
            </h1>
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowFilter((f) => !f)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                showFilter
                  ? "bg-pt-accent/20 text-pt-accent"
                  : "bg-white/10 text-white/60 hover:text-white"
              }`}
              aria-label="Toggle genre filter"
            >
              <FaFilter size={13} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowSaved(true)}
              className="relative w-9 h-9 rounded-full bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
              aria-label="View saved stories"
            >
              <FaBookmark size={13} />
              {savedStories.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pt-accent text-white text-[10px] flex items-center justify-center font-bold">
                  {savedStories.length}
                </span>
              )}
            </motion.button>
          </div>
        </div>

        {/* Genre filter bar */}
        <AnimatePresence>
          {showFilter && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="pointer-events-auto px-4 sm:px-6 pb-2 overflow-hidden"
            >
              <GenreFilter
                activeGenre={genreFilter}
                onSelect={setGenreFilter}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main scroll container */}
      <div
        ref={scrollRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      >
        {/* Welcome card */}
        {showWelcome && <WelcomeCard onStart={handleStart} />}

        {/* Story cards */}
        {stories.map((story, i) => (
          <StoryCard
            key={story.id}
            story={story}
            index={i}
            totalCount={stories.length}
            reaction={reactions[story.id]}
            isSaved={isStorySaved(story.id)}
            sessionLikes={sessionLikes}
            onLike={() => likeStory(story)}
            onDislike={() => dislikeStory(story)}
            onSave={() => saveStory(story)}
            showScrollCue={i === 0 && !showWelcome}
          />
        ))}

        {/* Loading card */}
        {loading && <LoadingCard />}

        {/* Error state */}
        {error && !loading && stories.length === 0 && (
          <div className="h-screen w-full snap-start flex items-center justify-center bg-pt-bg px-6">
            <div className="text-center max-w-md">
              <p
                className="text-pt-text text-2xl mb-3"
                style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
              >
                The muse is resting
              </p>
              <p className="text-pt-text-secondary mb-6">{error}</p>
              <button
                onClick={loadMore}
                className="px-6 py-2.5 rounded-full border border-pt-border text-pt-text text-sm hover:bg-white/5 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Saved stories drawer */}
      <SavedDrawer
        isOpen={showSaved}
        onClose={() => setShowSaved(false)}
        savedStories={savedStories}
        onClearAll={clearSaved}
      />
    </div>
  );
};

export default PlotTwist;
