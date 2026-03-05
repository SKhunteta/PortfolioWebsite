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
import {
  STORAGE_KEYS,
  LOADING_MESSAGES,
  GENRES,
  GENRE_LABELS,
  GENRE_ACCENT_COLORS,
  MILESTONES,
} from "./constants";

// --- Interactive "Pick Your Vibe" Welcome ---
const WelcomeCard = ({ onStart, onStartWithGenres }) => {
  const [selectedGenres, setSelectedGenres] = useState([]);
  const genreOptions = GENRES.filter((g) => g !== "all");

  const toggleGenre = (genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : prev.length < 3
        ? [...prev, genre]
        : prev
    );
  };

  const handleStart = () => {
    if (selectedGenres.length > 0) {
      onStartWithGenres(selectedGenres);
    } else {
      onStart();
    }
  };

  return (
    <div className="h-dvh w-full snap-start flex items-center justify-center bg-gradient-to-b from-pt-accent/20 via-pt-bg to-pt-bg px-6">
      <div className="max-w-lg text-center">
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
          className="text-pt-accent text-sm font-medium tracking-widest uppercase mb-6"
        >
          Swipe through the multiverse of stories
        </motion.p>

        {/* Pick Your Vibe genre grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <p
            className="text-pt-text-secondary text-sm mb-4"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            Pick up to 3 vibes to start
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
            {genreOptions.map((genre) => {
              const isSelected = selectedGenres.includes(genre);
              const color = GENRE_ACCENT_COLORS[genre] || "#8B5CF6";
              return (
                <motion.button
                  key={genre}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleGenre(genre)}
                  className="px-2 py-2.5 rounded-lg text-xs font-medium transition-all border"
                  style={{
                    borderColor: isSelected ? color : "rgba(255,255,255,0.1)",
                    backgroundColor: isSelected ? `${color}20` : "rgba(255,255,255,0.03)",
                    color: isSelected ? color : "#A0A0B8",
                    boxShadow: isSelected ? `0 0 16px ${color}20` : "none",
                  }}
                >
                  {GENRE_LABELS[genre] || genre}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStart}
            className="px-8 py-3 rounded-full bg-pt-accent text-white font-semibold text-lg transition-shadow hover:shadow-lg hover:shadow-pt-accent/25"
          >
            {selectedGenres.length > 0 ? "Start Reading" : "Surprise Me"}
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-10"
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
};

// --- Milestone Toast ---
const MilestoneToast = ({ message, onDone }) => (
  <motion.div
    initial={{ y: -60, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: -60, opacity: 0 }}
    transition={{ type: "spring", damping: 20, stiffness: 300 }}
    onAnimationComplete={(def) => {
      if (def === "exit") return;
      setTimeout(onDone, 3000);
    }}
    className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-pt-surface border border-pt-accent/30 rounded-full px-6 py-2.5 shadow-lg shadow-pt-accent/10"
  >
    <p
      className="text-pt-accent font-semibold text-sm whitespace-nowrap"
      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
    >
      {message}
    </p>
  </motion.div>
);

// --- Keyboard Hint ---
const KeyboardHint = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Only show on desktop (hover-capable devices)
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    setIsDesktop(window.matchMedia("(hover: hover)").matches);
  }, []);

  if (!isDesktop) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-4 left-4 z-30 bg-pt-surface/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-pt-border text-pt-text-muted text-xs"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          <span className="opacity-70">
            ↑↓ navigate &middot; L like &middot; D dislike &middot; S save &middot; C continue
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

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
  const [remixTarget, setRemixTarget] = useState(null);
  const [remixLoading, setRemixLoading] = useState(false);
  const [remixError, setRemixError] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const [milestoneMsg, setMilestoneMsg] = useState(null);
  const shownMilestones = useRef(new Set());
  const scrollRef = useRef(null);

  const handleStart = () => {
    setShowWelcome(false);
    try {
      localStorage.setItem(STORAGE_KEYS.visited, "true");
    } catch {
      // ignore
    }
  };

  const handleStartWithGenres = (genres) => {
    // Pre-seed preferences with selected genres
    if (genres.length > 0) {
      setGenreFilter(genres[0]);
    }
    handleStart();
  };

  // --- Milestone detection ---
  useEffect(() => {
    const milestone = MILESTONES.find(
      (m) => sessionLikes === m.count && !shownMilestones.current.has(m.count)
    );
    if (milestone) {
      shownMilestones.current.add(milestone.count);
      setMilestoneMsg(milestone.message);
    }
  }, [sessionLikes]);

  const isMilestoneCount = MILESTONES.some((m) => sessionLikes + 1 === m.count);

  const handleRemix = useCallback(
    async (targetGenre) => {
      if (!remixTarget || remixLoading) return;
      setRemixLoading(true);
      setRemixError(null);
      try {
        await remixStory(remixTarget, targetGenre);
        setRemixTarget(null);
      } catch (err) {
        setRemixError(err.message || "Remix failed. Try again.");
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

  // --- Keyboard navigation ---
  useEffect(() => {
    const getCurrentIndex = () => {
      const el = scrollRef.current;
      if (!el) return -1;
      return Math.round(el.scrollTop / el.clientHeight) + (showWelcome ? -1 : 0);
    };

    const handleKeyDown = (e) => {
      // Don't intercept if modals are open
      if (showSaved || showProfile || remixTarget || shareTarget) return;
      // Don't intercept if user is in an input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      const el = scrollRef.current;
      if (!el) return;

      switch (e.key) {
        case "ArrowDown":
        case "j":
          e.preventDefault();
          el.scrollBy({ top: el.clientHeight, behavior: "smooth" });
          break;
        case "ArrowUp":
        case "k":
          e.preventDefault();
          el.scrollBy({ top: -el.clientHeight, behavior: "smooth" });
          break;
        case "l":
        case "L": {
          const idx = getCurrentIndex();
          if (idx >= 0 && idx < stories.length && !reactions[stories[idx].id]) {
            likeStory(stories[idx]);
          }
          break;
        }
        case "d":
        case "D": {
          const idx = getCurrentIndex();
          if (idx >= 0 && idx < stories.length && !reactions[stories[idx].id]) {
            dislikeStory(stories[idx]);
          }
          break;
        }
        case "s":
        case "S": {
          const idx = getCurrentIndex();
          if (idx >= 0 && idx < stories.length) {
            saveStory(stories[idx]);
          }
          break;
        }
        case "c":
        case "C": {
          const idx = getCurrentIndex();
          if (idx >= 0 && idx < stories.length) {
            continueStory(stories[idx]);
          }
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    stories,
    reactions,
    showWelcome,
    showSaved,
    showProfile,
    remixTarget,
    shareTarget,
    likeStory,
    dislikeStory,
    saveStory,
    continueStory,
  ]);

  return (
    <div className="h-dvh bg-pt-bg relative overflow-hidden">
      {/* Milestone toast */}
      <AnimatePresence>
        {milestoneMsg && (
          <MilestoneToast
            key={milestoneMsg}
            message={milestoneMsg}
            onDone={() => setMilestoneMsg(null)}
          />
        )}
      </AnimatePresence>

      {/* Keyboard hint */}
      {!showWelcome && <KeyboardHint />}

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
        {showWelcome && (
          <WelcomeCard
            onStart={handleStart}
            onStartWithGenres={handleStartWithGenres}
          />
        )}

        {/* Story cards */}
        {stories.map((story, i) => (
          <StoryCard
            key={story.id}
            story={story}
            index={i}
            totalCount={stories.length}
            reaction={reactions[story.id]}
            isSaved={isStorySaved(story.id)}
            continuation={continuations[story.id]}
            onLike={() => likeStory(story)}
            onDislike={() => dislikeStory(story)}
            onSave={() => saveStory(story)}
            onContinue={() => continueStory(story)}
            onShare={() => setShareTarget(story)}
            onRemix={() => setRemixTarget(story)}
            showScrollCue={i === 0 && !showWelcome}
            scrollContainerRef={scrollRef}
            isMilestone={isMilestoneCount}
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
          setRemixError(null);
        }}
        onSelect={handleRemix}
        originalGenre={remixTarget?.genre}
        loading={remixLoading}
        error={remixError}
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
