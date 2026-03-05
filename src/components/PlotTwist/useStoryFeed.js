import { useState, useEffect, useCallback, useRef } from "react";
import { API_ENDPOINTS } from "../../config/api";
import { STORAGE_KEYS, DEFAULT_PREFERENCES } from "./constants";

function loadFromStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * Derive the top N keys from a { key: count } map, sorted by count descending.
 */
function topKeys(map, n = 5) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key]) => key);
}

export default function useStoryFeed() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preferences, setPreferences] = useState(() =>
    loadFromStorage(STORAGE_KEYS.preferences, DEFAULT_PREFERENCES)
  );
  const [savedStories, setSavedStories] = useState(() =>
    loadFromStorage(STORAGE_KEYS.saved, [])
  );
  const [reactions, setReactions] = useState({}); // storyId → 'liked' | 'disliked'
  const [genreFilter, setGenreFilter] = useState("all");
  const [sessionLikes, setSessionLikes] = useState(0);
  const [continuations, setContinuations] = useState({}); // storyId → { text, loading, error }
  const fetchingRef = useRef(false);

  // Load initial stories on mount
  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const apiPreferences = {
        likedGenres: topKeys(preferences.likedGenres),
        dislikedGenres: topKeys(preferences.dislikedGenres),
        likedTags: topKeys(preferences.likedTags),
        dislikedTags: topKeys(preferences.dislikedTags),
      };

      const response = await fetch(API_ENDPOINTS.stories, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: apiPreferences,
          count: 5,
          genreFilter: genreFilter === "all" ? undefined : genreFilter,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to fetch stories");
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.stories)) {
        setStories((prev) => [...prev, ...data.stories]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [preferences, genreFilter]);

  const likeStory = useCallback(
    (story) => {
      if (reactions[story.id]) return; // Already reacted

      setReactions((prev) => ({ ...prev, [story.id]: "liked" }));
      setSessionLikes((prev) => prev + 1);

      setPreferences((prev) => {
        const next = {
          ...prev,
          likedGenres: {
            ...prev.likedGenres,
            [story.genre]: (prev.likedGenres[story.genre] || 0) + 1,
          },
          likedTags: { ...prev.likedTags },
        };
        (story.tags || []).forEach((tag) => {
          next.likedTags[tag] = (next.likedTags[tag] || 0) + 1;
        });
        saveToStorage(STORAGE_KEYS.preferences, next);
        return next;
      });
    },
    [reactions]
  );

  const dislikeStory = useCallback(
    (story) => {
      if (reactions[story.id]) return;

      setReactions((prev) => ({ ...prev, [story.id]: "disliked" }));

      setPreferences((prev) => {
        const next = {
          ...prev,
          dislikedGenres: {
            ...prev.dislikedGenres,
            [story.genre]: (prev.dislikedGenres[story.genre] || 0) + 1,
          },
          dislikedTags: { ...prev.dislikedTags },
        };
        (story.tags || []).forEach((tag) => {
          next.dislikedTags[tag] = (next.dislikedTags[tag] || 0) + 1;
        });
        saveToStorage(STORAGE_KEYS.preferences, next);
        return next;
      });
    },
    [reactions]
  );

  const saveStory = useCallback(
    (story) => {
      setSavedStories((prev) => {
        const alreadySaved = prev.some((s) => s.id === story.id);
        const next = alreadySaved
          ? prev.filter((s) => s.id !== story.id)
          : [...prev, story];
        saveToStorage(STORAGE_KEYS.saved, next);
        return next;
      });
    },
    []
  );

  const isStorySaved = useCallback(
    (storyId) => savedStories.some((s) => s.id === storyId),
    [savedStories]
  );

  const clearSaved = useCallback(() => {
    setSavedStories([]);
    saveToStorage(STORAGE_KEYS.saved, []);
  }, []);

  // --- Continue a story ---
  const continueStory = useCallback(async (story) => {
    if (continuations[story.id]?.text || continuations[story.id]?.loading) return;

    setContinuations((prev) => ({
      ...prev,
      [story.id]: { text: null, loading: true, error: null },
    }));

    try {
      const response = await fetch(API_ENDPOINTS.storiesContinue, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: story.title,
          content: story.content,
          genre: story.genre,
          mood: story.mood,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to continue story");
      }

      const data = await response.json();
      if (data.success && data.continuation) {
        setContinuations((prev) => ({
          ...prev,
          [story.id]: { text: data.continuation, loading: false, error: null },
        }));
      }
    } catch (err) {
      setContinuations((prev) => ({
        ...prev,
        [story.id]: { text: null, loading: false, error: err.message },
      }));
    }
  }, [continuations]);

  // --- Remix a story ---
  const remixStory = useCallback(
    async (story, targetGenre) => {
      try {
        const response = await fetch(API_ENDPOINTS.storiesRemix, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: story.title,
            content: story.content,
            originalGenre: story.genre,
            targetGenre,
            mood: story.mood,
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || "Failed to remix story");
        }

        const data = await response.json();
        if (data.success && data.story) {
          // Insert remixed story right after the original
          setStories((prev) => {
            const idx = prev.findIndex((s) => s.id === story.id);
            if (idx === -1) return [...prev, data.story];
            const next = [...prev];
            next.splice(idx + 1, 0, data.story);
            return next;
          });
          return data.story;
        }
      } catch (err) {
        console.error("Remix error:", err);
        throw err;
      }
    },
    []
  );

  // --- Reset preferences ---
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    saveToStorage(STORAGE_KEYS.preferences, DEFAULT_PREFERENCES);
  }, []);

  return {
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
  };
}
