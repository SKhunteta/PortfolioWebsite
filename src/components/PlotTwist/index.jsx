import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaBookmark, FaFilter, FaChartPie } from "react-icons/fa";
import useStoryFeed from "./useStoryFeed";
import StoryCard from "./StoryCard";
import GenreFilter from "./GenreFilter";
import SavedDrawer from "./SavedDrawer";
import RemixPicker from "./RemixPicker";
import ShareCard from "./ShareCard";
import TasteProfile from "./TasteProfile";
import { STORAGE_KEYS, LOADING_MESSAGES } from "./constants";

const WelcomeCard = ({ onStart }) => (
  <div className="h-dvh w-full snap-start flex items-center justify-center bg-gradient-to-b from-pt-accent/20 via-pt-bg to-pt-bg px-6">
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

const RotatingMessage = () => {
  const [index, setIndex] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={index}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="text-pt-text-secondary text-sm"
        style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
      >
        {LOADING_MESSAGES[index]}...
      </motion.p>
    </AnimatePresence>
  );
};

const LoadingCard = () => (
  <div className="h-dvh w-full snap-start flex items-center justify-center bg-gradient-to-b from-pt-accent/10 via-pt-bg to-pt-bg px-6">
    <div className="max-w-sm w-full">
      {/* Skeleton story card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 mb-8"
      >
        <div className="w-16 h-5 rounded-full bg-white/5 animate-pulse" />
        <div className="space-y-2">
          <div className="w-3/4 h-7 rounded bg-white/[0.07] animate-pulse" />
          <div className="w-1/2 h-7 rounded bg-white/5 animate-pulse" />
        </div>
        <div className="space-y-2.5 pt-2">
          <div className="w-full h-4 rounded bg-white/5 animate-pulse" />
          <div className="w-full h-4 rounded bg-white/[0.04] animate-pulse" />
          <div className="w-5/6 h-4 rounded bg-white/[0.04] animate-pulse" />
          <div className="w-full h-4 rounded bg-white/[0.03] animate-pulse" />
          <div className="w-2/3 h-4 rounded bg-white/[0.03] animate-pulse" />
        </div>
        <div className="flex gap-2 pt-2">
          <div className="w-14 h-5 rounded bg-white/[0.04] animate-pulse" />
          <div className="w-20 h-5 rounded bg-white/[0.04] animate-pulse" />
          <div className="w-12 h-5 rounded bg-white/[0.04] animate-pulse" />
        </div>
      </motion.div>

      <div className="text-center">
        <RotatingMessage />
        <div className="flex justify-center gap-1.5 mt-3">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1, 0.8] }}
              transition={{
                repeat: Infinity,
                duration: 1.4,
                delay: i * 0.2,
              }}
              className="w-1.5 h-1.5 rounded-full bg-pt-accent"
            />
          ))}
        </div>
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
    preferences,
    continuations,
    setGenreFilter,
    loadMore,
    likeStory,
    dislikeStory,
    saveStory,
    isStorySaved,
    clearSaved,
    continueStory,
    remixStory,
    resetPreferences,
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
  const [showProfile, setShowProfile] = useState(false);
  const [remixTarget, setRemixTarget] = useState(null); // story being remixed
  const [remixLoading, setRemixLoading] = useState(false);
  const [shareTarget, setShareTarget] = useState(null); // story being shared
  const scrollRef = useRef(null);

  const handleStart = () => {
    setShowWelcome(false);
    try {
      localStorage.setItem(STORAGE_KEYS.visited, "true");
    } catch {
      // ignore
    }
  };

  const handleRemix = useCallback(
    async (targetGenre) => {
      if (!remixTarget || remixLoading) return;
      setRemixLoading(true);
      try {
        await remixStory(remixTarget, targetGenre);
        setRemixTarget(null);
      } catch {
        // error handled in hook
      } finally {
        setRemixLoading(false);
      }
    },
    [remixTarget, remixLoading, remixStory]
  );

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loading) return;

    const scrollBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
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
    <div className="h-dvh bg-pt-bg relative overflow-hidden">
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
              onClick={() => setShowProfile(true)}
              className="w-9 h-9 rounded-full bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
              aria-label="View taste profile"
            >
              <FaChartPie size={13} />
            </motion.button>
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
            continuation={continuations[story.id]}
            onLike={() => likeStory(story)}
            onDislike={() => dislikeStory(story)}
            onSave={() => saveStory(story)}
            onContinue={() => continueStory(story)}
            onShare={() => setShareTarget(story)}
            onRemix={() => setRemixTarget(story)}
            showScrollCue={i === 0 && !showWelcome}
            scrollContainerRef={scrollRef}
          />
        ))}

        {/* Loading card */}
        {loading && <LoadingCard />}

        {/* Error state */}
        {error && !loading && stories.length === 0 && (
          <div className="h-dvh w-full snap-start flex items-center justify-center bg-pt-bg px-6">
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

      {/* Overlays */}
      <SavedDrawer
        isOpen={showSaved}
        onClose={() => setShowSaved(false)}
        savedStories={savedStories}
        onClearAll={clearSaved}
      />

      <TasteProfile
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        preferences={preferences}
        onReset={resetPreferences}
      />

      <RemixPicker
        isOpen={!!remixTarget}
        onClose={() => {
          setRemixTarget(null);
          setRemixLoading(false);
        }}
        onSelect={handleRemix}
        originalGenre={remixTarget?.genre}
        loading={remixLoading}
      />

      <ShareCard
        story={shareTarget}
        isOpen={!!shareTarget}
        onClose={() => setShareTarget(null)}
      />
    </div>
  );
};

export default PlotTwist;
