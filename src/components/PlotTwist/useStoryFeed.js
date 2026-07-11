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
  const [continuations, setContinuations] = useState({}); // storyId → { texts: [], loading, error }
  const continuationsRef = useRef(continuations);
  continuationsRef.current = continuations;
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;
  const fetchingRef = useRef(false);
  const requestIdRef = useRef(0);
  const prevGenreRef = useRef(genreFilter);

  // Load initial stories on mount
  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When genre filter changes after mount, clear stories and refetch
  useEffect(() => {
    if (prevGenreRef.current === genreFilter) return;
    prevGenreRef.current = genreFilter;
    requestIdRef.current += 1; // invalidate any in-flight fetch
    setStories([]);
    setError(null);
    fetchingRef.current = false; // allow a new fetch
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genreFilter]);

  const loadMore = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    const requestId = requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const prefs = preferencesRef.current;
      const apiPreferences = {
        likedGenres: topKeys(prefs.likedGenres || {}),
        dislikedGenres: topKeys(prefs.dislikedGenres || {}),
        likedTags: topKeys(prefs.likedTags || {}),
        dislikedTags: topKeys(prefs.dislikedTags || {}),
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
      // A genre change invalidated this request while it was in flight
      if (requestIdRef.current !== requestId) return;
      if (data.success && Array.isArray(data.stories)) {
        setStories((prev) => [...prev, ...data.stories]);
      }
    } catch (err) {
      if (requestIdRef.current === requestId) setError(err.message);
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
        fetchingRef.current = false;
      }
    }
  }, [genreFilter]);

  const likeStory = useCallback(
    (story) => {
      let alreadyReacted = false;
      setReactions((prev) => {
        if (prev[story.id]) {
          alreadyReacted = true;
          return prev;
        }
        return { ...prev, [story.id]: "liked" };
      });
      if (alreadyReacted) return;

      setSessionLikes((prev) => prev + 1);

      setPreferences((prev) => {
        const next = {
          ...prev,
          likedGenres: {
            ...prev.likedGenres,
            [story.genre]: (prev.likedGenres[story.genre] || 0) + 1,
          },
          likedTags: { ...prev.likedTags },
          stats: {
            liked: (prev.stats?.liked || 0) + 1,
            disliked: prev.stats?.disliked || 0,
          },
        };
        (story.tags || []).forEach((tag) => {
          next.likedTags[tag] = (next.likedTags[tag] || 0) + 1;
        });
        saveToStorage(STORAGE_KEYS.preferences, next);
        return next;
      });
    },
    []
  );

  const dislikeStory = useCallback(
    (story) => {
      let alreadyReacted = false;
      setReactions((prev) => {
        if (prev[story.id]) {
          alreadyReacted = true;
          return prev;
        }
        return { ...prev, [story.id]: "disliked" };
      });
      if (alreadyReacted) return;

      setPreferences((prev) => {
        const next = {
          ...prev,
          dislikedGenres: {
            ...prev.dislikedGenres,
            [story.genre]: (prev.dislikedGenres[story.genre] || 0) + 1,
          },
          dislikedTags: { ...prev.dislikedTags },
          stats: {
            liked: prev.stats?.liked || 0,
            disliked: (prev.stats?.disliked || 0) + 1,
          },
        };
        (story.tags || []).forEach((tag) => {
          next.dislikedTags[tag] = (next.dislikedTags[tag] || 0) + 1;
        });
        saveToStorage(STORAGE_KEYS.preferences, next);
        return next;
      });
    },
    []
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

  // --- Continue a story (supports multiple continuations) ---
  const continueStory = useCallback(async (story) => {
    const current = continuationsRef.current;
    if (current[story.id]?.loading) return;

    const existingTexts = current[story.id]?.texts || [];

    setContinuations((prev) => ({
      ...prev,
      [story.id]: { texts: existingTexts, loading: true, error: null },
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
          previousContinuations: existingTexts,
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
          [story.id]: {
            texts: [...existingTexts, data.continuation],
            loading: false,
            error: null,
          },
        }));

        // Boost preferences only on success (2x weight)
        setPreferences((prev) => {
          const next = {
            ...prev,
            likedGenres: {
              ...prev.likedGenres,
              [story.genre]: (prev.likedGenres[story.genre] || 0) + 2,
            },
            likedTags: { ...prev.likedTags },
          };
          (story.tags || []).forEach((tag) => {
            next.likedTags[tag] = (next.likedTags[tag] || 0) + 2;
          });
          saveToStorage(STORAGE_KEYS.preferences, next);
          return next;
        });
      }
    } catch (err) {
      setContinuations((prev) => ({
        ...prev,
        [story.id]: { texts: existingTexts, loading: false, error: err.message },
      }));
    }
  }, []);

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
        if (!data.success || !data.story) {
          throw new Error("The remix came back empty. Try a different genre.");
        }

        // Insert remixed story right after the original
        setStories((prev) => {
          const idx = prev.findIndex((s) => s.id === story.id);
          if (idx === -1) return [...prev, data.story];
          const next = [...prev];
          next.splice(idx + 1, 0, data.story);
          return next;
        });
        return data.story;
      } catch (err) {
        console.error("Remix error:", err);
        throw err;
      }
    },
    []
  );

  // --- Seed genre preferences (e.g. from welcome card) ---
  const seedGenres = useCallback((genres) => {
    setPreferences((prev) => {
      const next = { ...prev, likedGenres: { ...prev.likedGenres } };
      genres.forEach((g) => {
        next.likedGenres[g] = (next.likedGenres[g] || 0) + 2;
      });
      saveToStorage(STORAGE_KEYS.preferences, next);
      return next;
    });
  }, []);

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
    seedGenres,
    resetPreferences,
  };
}
