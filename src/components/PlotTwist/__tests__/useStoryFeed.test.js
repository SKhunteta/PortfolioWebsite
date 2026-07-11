import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useStoryFeed from "../useStoryFeed";
import { STORAGE_KEYS } from "../constants";

// Mock fetch
const mockFetchResponse = {
  success: true,
  stories: [
    {
      id: "story-1",
      type: "premise",
      title: "Test Story",
      content: "Test content",
      genre: "sci-fi",
      mood: "tense",
      tags: ["dystopian"],
    },
    {
      id: "story-2",
      type: "excerpt",
      title: "Test Story 2",
      content: "Test content 2",
      genre: "horror",
      mood: "eerie",
      tags: ["atmospheric"],
    },
  ],
};

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockFetchResponse),
    })
  );
});

describe("useStoryFeed", () => {
  it("fetches stories on mount", async () => {
    const { result } = renderHook(() => useStoryFeed());

    // Initially loading
    expect(result.current.loading).toBe(true);

    // Wait for fetch to complete
    await vi.waitFor(() => {
      expect(result.current.stories.length).toBe(2);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.stories[0].title).toBe("Test Story");
  });

  it("tracks liked stories and updates preferences", async () => {
    const { result } = renderHook(() => useStoryFeed());

    await vi.waitFor(() => {
      expect(result.current.stories.length).toBe(2);
    });

    act(() => {
      result.current.likeStory(result.current.stories[0]);
    });

    expect(result.current.reactions["story-1"]).toBe("liked");
    expect(result.current.sessionLikes).toBe(1);

    // Check localStorage
    const prefs = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.preferences)
    );
    expect(prefs.likedGenres["sci-fi"]).toBe(1);
    expect(prefs.likedTags["dystopian"]).toBe(1);
  });

  it("tracks disliked stories and updates preferences", async () => {
    const { result } = renderHook(() => useStoryFeed());

    await vi.waitFor(() => {
      expect(result.current.stories.length).toBe(2);
    });

    act(() => {
      result.current.dislikeStory(result.current.stories[1]);
    });

    expect(result.current.reactions["story-2"]).toBe("disliked");

    const prefs = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.preferences)
    );
    expect(prefs.dislikedGenres["horror"]).toBe(1);
  });

  it("prevents double-reacting to the same story", async () => {
    const { result } = renderHook(() => useStoryFeed());

    await vi.waitFor(() => {
      expect(result.current.stories.length).toBe(2);
    });

    act(() => {
      result.current.likeStory(result.current.stories[0]);
    });
    act(() => {
      result.current.dislikeStory(result.current.stories[0]);
    });

    // Should still be liked, not overwritten
    expect(result.current.reactions["story-1"]).toBe("liked");
    expect(result.current.sessionLikes).toBe(1);
  });

  it("saves and unsaves stories", async () => {
    const { result } = renderHook(() => useStoryFeed());

    await vi.waitFor(() => {
      expect(result.current.stories.length).toBe(2);
    });

    const story = result.current.stories[0];

    // Save
    act(() => {
      result.current.saveStory(story);
    });
    expect(result.current.isStorySaved("story-1")).toBe(true);
    expect(result.current.savedStories).toHaveLength(1);

    // Unsave (toggle)
    act(() => {
      result.current.saveStory(story);
    });
    expect(result.current.isStorySaved("story-1")).toBe(false);
    expect(result.current.savedStories).toHaveLength(0);
  });

  it("clears all saved stories", async () => {
    const { result } = renderHook(() => useStoryFeed());

    await vi.waitFor(() => {
      expect(result.current.stories.length).toBe(2);
    });

    act(() => {
      result.current.saveStory(result.current.stories[0]);
      result.current.saveStory(result.current.stories[1]);
    });
    expect(result.current.savedStories).toHaveLength(2);

    act(() => {
      result.current.clearSaved();
    });
    expect(result.current.savedStories).toHaveLength(0);
  });

  it("counts actual reactions in stats, not seeded genre boosts", async () => {
    const { result } = renderHook(() => useStoryFeed());

    await vi.waitFor(() => {
      expect(result.current.stories.length).toBe(2);
    });

    // Seeding (welcome card) boosts genre weights but is not a "read"
    act(() => {
      result.current.seedGenres(["fantasy", "noir"]);
    });
    expect(result.current.preferences.stats?.liked || 0).toBe(0);

    act(() => {
      result.current.likeStory(result.current.stories[0]);
    });
    act(() => {
      result.current.dislikeStory(result.current.stories[1]);
    });

    expect(result.current.preferences.stats).toEqual({
      liked: 1,
      disliked: 1,
    });

    const prefs = JSON.parse(localStorage.getItem(STORAGE_KEYS.preferences));
    expect(prefs.stats).toEqual({ liked: 1, disliked: 1 });
    // Seeded weights still applied for recommendations
    expect(prefs.likedGenres.fantasy).toBe(2);
  });

  it("does not count continuations as read stories", async () => {
    const { result } = renderHook(() => useStoryFeed());

    await vi.waitFor(() => {
      expect(result.current.stories.length).toBe(2);
    });

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, continuation: "And then..." }),
      })
    );

    await act(async () => {
      await result.current.continueStory(result.current.stories[0]);
    });

    expect(result.current.continuations["story-1"].texts).toEqual([
      "And then...",
    ]);
    // Continue boosts the genre weight (2x) but not the read counters
    expect(result.current.preferences.likedGenres["sci-fi"]).toBe(2);
    expect(result.current.preferences.stats?.liked || 0).toBe(0);
  });

  it("ignores stale in-flight fetches after a genre change", async () => {
    let resolveFirst;
    const firstResponse = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const staleBatch = {
      success: true,
      stories: [
        {
          id: "stale-1",
          type: "premise",
          title: "Stale Story",
          content: "Old genre content",
          genre: "sci-fi",
          mood: "tense",
          tags: [],
        },
      ],
    };
    const freshBatch = {
      success: true,
      stories: [
        {
          id: "fresh-1",
          type: "premise",
          title: "Fresh Story",
          content: "New genre content",
          genre: "horror",
          mood: "eerie",
          tags: [],
        },
      ],
    };

    let callCount = 0;
    global.fetch = vi.fn(() => {
      callCount += 1;
      if (callCount === 1) return firstResponse;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(freshBatch),
      });
    });

    const { result } = renderHook(() => useStoryFeed());

    // Change genre while the initial fetch is still in flight
    act(() => {
      result.current.setGenreFilter("horror");
    });

    await vi.waitFor(() => {
      expect(result.current.stories.map((s) => s.id)).toEqual(["fresh-1"]);
    });

    // Let the stale request resolve — it must be discarded
    await act(async () => {
      resolveFirst({
        ok: true,
        json: () => Promise.resolve(staleBatch),
      });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.stories.map((s) => s.id)).toEqual(["fresh-1"]);
    expect(result.current.loading).toBe(false);
  });

  it("handles fetch errors gracefully", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: "Server error" }),
      })
    );

    const { result } = renderHook(() => useStoryFeed());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Server error");
    expect(result.current.stories).toHaveLength(0);
  });
});
