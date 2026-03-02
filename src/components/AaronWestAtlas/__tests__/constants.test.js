import { describe, it, expect } from "vitest";
import { ALBUMS, ALBUM_ORDER, MAP_CONFIG, LOCATIONS } from "../constants";

describe("Atlas Constants", () => {
  describe("ALBUMS", () => {
    it("defines 5 albums", () => {
      expect(Object.keys(ALBUMS)).toHaveLength(5);
    });

    it("has all required fields for each album", () => {
      for (const [key, album] of Object.entries(ALBUMS)) {
        expect(album).toHaveProperty("id");
        expect(album).toHaveProperty("title");
        expect(album).toHaveProperty("year");
        expect(album).toHaveProperty("color");
        expect(album).toHaveProperty("shortName");
        expect(album).toHaveProperty("coverImage");
        expect(album.id).toBe(key);
        expect(typeof album.year).toBe("number");
        expect(album.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });

    it("albums are in chronological order by year", () => {
      const years = ALBUM_ORDER.map((key) => ALBUMS[key].year);
      for (let i = 1; i < years.length; i++) {
        expect(years[i]).toBeGreaterThanOrEqual(years[i - 1]);
      }
    });
  });

  describe("ALBUM_ORDER", () => {
    it("contains 5 entries", () => {
      expect(ALBUM_ORDER).toHaveLength(5);
    });

    it("matches album keys", () => {
      ALBUM_ORDER.forEach((key) => {
        expect(ALBUMS).toHaveProperty(key);
      });
    });

    it("contains no duplicates", () => {
      const unique = new Set(ALBUM_ORDER);
      expect(unique.size).toBe(ALBUM_ORDER.length);
    });
  });

  describe("MAP_CONFIG", () => {
    it("has valid center coordinates", () => {
      expect(MAP_CONFIG.center).toHaveLength(2);
      const [lat, lng] = MAP_CONFIG.center;
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThanOrEqual(180);
    });

    it("has valid zoom levels", () => {
      expect(MAP_CONFIG.zoom).toBeGreaterThan(0);
      expect(MAP_CONFIG.minZoom).toBeLessThanOrEqual(MAP_CONFIG.zoom);
      expect(MAP_CONFIG.maxZoom).toBeGreaterThanOrEqual(MAP_CONFIG.zoom);
    });

    it("has tile URL and attribution", () => {
      expect(MAP_CONFIG.tileUrl).toContain("http");
      expect(MAP_CONFIG.tileAttribution).toBeTruthy();
    });
  });

  describe("LOCATIONS", () => {
    it("contains the expected number of locations", () => {
      expect(LOCATIONS.length).toBeGreaterThanOrEqual(41);
    });

    it("each location has all required fields", () => {
      LOCATIONS.forEach((loc) => {
        expect(loc).toHaveProperty("id");
        expect(loc).toHaveProperty("narrativeOrder");
        expect(loc).toHaveProperty("album");
        expect(loc).toHaveProperty("song");
        expect(loc).toHaveProperty("year");
        expect(loc).toHaveProperty("location");
        expect(loc).toHaveProperty("lat");
        expect(loc).toHaveProperty("lng");
        expect(loc).toHaveProperty("lyric");
        expect(loc).toHaveProperty("context");
      });
    });

    it("all locations reference valid albums", () => {
      LOCATIONS.forEach((loc) => {
        expect(ALBUM_ORDER).toContain(loc.album);
      });
    });

    it("narrative orders cover a valid range", () => {
      const orders = LOCATIONS.map((l) => l.narrativeOrder);
      const min = Math.min(...orders);
      const max = Math.max(...orders);
      expect(min).toBe(1);
      expect(max).toBeGreaterThanOrEqual(41);
    });

    it("IDs are unique", () => {
      const ids = LOCATIONS.map((l) => l.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it("coordinates are within valid ranges", () => {
      LOCATIONS.forEach((loc) => {
        expect(loc.lat).toBeGreaterThanOrEqual(-90);
        expect(loc.lat).toBeLessThanOrEqual(90);
        expect(loc.lng).toBeGreaterThanOrEqual(-180);
        expect(loc.lng).toBeLessThanOrEqual(180);
      });
    });

    it("narrative orders start at 1", () => {
      const orders = LOCATIONS.map((l) => l.narrativeOrder).sort(
        (a, b) => a - b
      );
      expect(orders[0]).toBe(1);
    });
  });
});
