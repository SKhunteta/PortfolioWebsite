import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useAtlasState from "../useAtlasState";
import { LOCATIONS, ALBUM_ORDER } from "../constants";

describe("useAtlasState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes with no selected location", () => {
    const { result } = renderHook(() => useAtlasState());
    expect(result.current.selectedLocation).toBeNull();
  });

  it("initializes with all albums active", () => {
    const { result } = renderHook(() => useAtlasState());
    ALBUM_ORDER.forEach((album) => {
      expect(result.current.activeAlbums.has(album)).toBe(true);
    });
  });

  it("initializes with journey inactive", () => {
    const { result } = renderHook(() => useAtlasState());
    expect(result.current.journeyActive).toBe(false);
    expect(result.current.journeyIndex).toBe(0);
    expect(result.current.journeyPath).toEqual([]);
  });

  it("returns total locations count", () => {
    const { result } = renderHook(() => useAtlasState());
    expect(result.current.totalLocations).toBe(LOCATIONS.length);
  });

  it("returns sorted locations by narrative order", () => {
    const { result } = renderHook(() => useAtlasState());
    const sorted = result.current.sortedLocations;
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].narrativeOrder).toBeGreaterThanOrEqual(
        sorted[i - 1].narrativeOrder
      );
    }
  });

  describe("selectLocation", () => {
    it("selects a valid location by ID", () => {
      const { result } = renderHook(() => useAtlasState());
      const firstLocation = LOCATIONS[0];

      act(() => {
        result.current.selectLocation(firstLocation.id);
      });

      expect(result.current.selectedLocation).toEqual(firstLocation);
    });

    it("sets null for non-existent location ID", () => {
      const { result } = renderHook(() => useAtlasState());

      act(() => {
        result.current.selectLocation("non-existent-id");
      });

      expect(result.current.selectedLocation).toBeNull();
    });
  });

  describe("clearSelection", () => {
    it("clears the selected location", () => {
      const { result } = renderHook(() => useAtlasState());

      act(() => {
        result.current.selectLocation(LOCATIONS[0].id);
      });
      expect(result.current.selectedLocation).not.toBeNull();

      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.selectedLocation).toBeNull();
    });
  });

  describe("toggleAlbumFilter", () => {
    it("removes an album from active filters", () => {
      const { result } = renderHook(() => useAtlasState());

      act(() => {
        result.current.toggleAlbumFilter("wdheo");
      });

      expect(result.current.activeAlbums.has("wdheo")).toBe(false);
    });

    it("adds an album back to active filters", () => {
      const { result } = renderHook(() => useAtlasState());

      act(() => {
        result.current.toggleAlbumFilter("wdheo");
      });
      expect(result.current.activeAlbums.has("wdheo")).toBe(false);

      act(() => {
        result.current.toggleAlbumFilter("wdheo");
      });
      expect(result.current.activeAlbums.has("wdheo")).toBe(true);
    });

    it("prevents removing the last active album", () => {
      const { result } = renderHook(() => useAtlasState());

      // Remove all but one
      const albums = [...ALBUM_ORDER];
      albums.slice(1).forEach((album) => {
        act(() => {
          result.current.toggleAlbumFilter(album);
        });
      });

      expect(result.current.activeAlbums.size).toBe(1);
      expect(result.current.activeAlbums.has(albums[0])).toBe(true);

      // Try to remove the last one — should stay
      act(() => {
        result.current.toggleAlbumFilter(albums[0]);
      });

      expect(result.current.activeAlbums.size).toBe(1);
    });
  });

  describe("resetFilters", () => {
    it("restores all albums to active", () => {
      const { result } = renderHook(() => useAtlasState());

      act(() => {
        result.current.toggleAlbumFilter("wdheo");
        result.current.toggleAlbumFilter("orchard");
      });

      expect(result.current.activeAlbums.size).toBeLessThan(
        ALBUM_ORDER.length
      );

      act(() => {
        result.current.resetFilters();
      });

      expect(result.current.activeAlbums.size).toBe(ALBUM_ORDER.length);
    });
  });

  describe("filteredLocations", () => {
    it("returns all locations when all albums are active", () => {
      const { result } = renderHook(() => useAtlasState());
      expect(result.current.filteredLocations).toHaveLength(LOCATIONS.length);
    });

    it("filters locations when an album is toggled off", () => {
      const { result } = renderHook(() => useAtlasState());

      const wdheoCount = LOCATIONS.filter((l) => l.album === "wdheo").length;

      act(() => {
        result.current.toggleAlbumFilter("wdheo");
      });

      expect(result.current.filteredLocations).toHaveLength(
        LOCATIONS.length - wdheoCount
      );
      result.current.filteredLocations.forEach((loc) => {
        expect(loc.album).not.toBe("wdheo");
      });
    });
  });

  describe("navigation", () => {
    it("canNavigatePrev is false when nothing selected", () => {
      const { result } = renderHook(() => useAtlasState());
      expect(result.current.canNavigatePrev).toBe(false);
    });

    it("canNavigateNext is false when nothing selected", () => {
      const { result } = renderHook(() => useAtlasState());
      expect(result.current.canNavigateNext).toBe(false);
    });

    it("navigateLocation selects first location when none selected", () => {
      const { result } = renderHook(() => useAtlasState());

      act(() => {
        result.current.navigateLocation(1);
      });

      expect(result.current.selectedLocation).not.toBeNull();
      expect(result.current.selectedLocation.narrativeOrder).toBe(1);
    });

    it("navigates forward through sorted locations", () => {
      const { result } = renderHook(() => useAtlasState());
      const sorted = result.current.sortedLocations;

      act(() => {
        result.current.selectLocation(sorted[0].id);
      });

      act(() => {
        result.current.navigateLocation(1);
      });

      expect(result.current.selectedLocation.id).toBe(sorted[1].id);
    });

    it("navigates backward through sorted locations", () => {
      const { result } = renderHook(() => useAtlasState());
      const sorted = result.current.sortedLocations;

      act(() => {
        result.current.selectLocation(sorted[2].id);
      });

      act(() => {
        result.current.navigateLocation(-1);
      });

      expect(result.current.selectedLocation.id).toBe(sorted[1].id);
    });

    it("does not navigate past the beginning", () => {
      const { result } = renderHook(() => useAtlasState());
      const sorted = result.current.sortedLocations;

      act(() => {
        result.current.selectLocation(sorted[0].id);
      });

      act(() => {
        result.current.navigateLocation(-1);
      });

      // Should stay at the first location
      expect(result.current.selectedLocation.id).toBe(sorted[0].id);
    });

    it("does not navigate past the end", () => {
      const { result } = renderHook(() => useAtlasState());
      const sorted = result.current.sortedLocations;
      const lastIdx = sorted.length - 1;

      act(() => {
        result.current.selectLocation(sorted[lastIdx].id);
      });

      act(() => {
        result.current.navigateLocation(1);
      });

      expect(result.current.selectedLocation.id).toBe(sorted[lastIdx].id);
    });
  });

  describe("journey", () => {
    it("startJourney activates journey mode", () => {
      const { result } = renderHook(() => useAtlasState());

      act(() => {
        result.current.startJourney();
      });

      expect(result.current.journeyActive).toBe(true);
      expect(result.current.journeyIndex).toBe(0);
      expect(result.current.selectedLocation).not.toBeNull();
      expect(result.current.journeyPath.length).toBeGreaterThan(0);
    });

    it("startJourney resets all album filters", () => {
      const { result } = renderHook(() => useAtlasState());

      act(() => {
        result.current.toggleAlbumFilter("wdheo");
      });

      act(() => {
        result.current.startJourney();
      });

      expect(result.current.activeAlbums.size).toBe(ALBUM_ORDER.length);
    });

    it("stopJourney deactivates journey mode", () => {
      const { result } = renderHook(() => useAtlasState());

      act(() => {
        result.current.startJourney();
      });
      expect(result.current.journeyActive).toBe(true);

      act(() => {
        result.current.stopJourney();
      });
      expect(result.current.journeyActive).toBe(false);
    });

    it("auto-advances after 7 seconds", () => {
      const { result } = renderHook(() => useAtlasState());

      act(() => {
        result.current.startJourney();
      });

      const firstLocation = result.current.selectedLocation;

      act(() => {
        vi.advanceTimersByTime(7000);
      });

      expect(result.current.journeyIndex).toBe(1);
      expect(result.current.selectedLocation.id).not.toBe(firstLocation.id);
    });

    it("stops journey when reaching the end", () => {
      const { result } = renderHook(() => useAtlasState());

      act(() => {
        result.current.startJourney();
      });

      // Advance through all locations
      const totalLocations = result.current.sortedLocations.length;
      for (let i = 0; i < totalLocations; i++) {
        act(() => {
          vi.advanceTimersByTime(7000);
        });
      }

      expect(result.current.journeyActive).toBe(false);
    });
  });
});
