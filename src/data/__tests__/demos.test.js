import { describe, it, expect } from "vitest";
import {
  DEMOS,
  FEATURED_DEMOS,
  MORE_DEMOS,
  SERIES_DEMOS,
  HAPPINESS_LIABILITY_SERIES,
  GITHUB_REPO_URL,
  sourceUrl,
} from "../demos";

// Routes registered in src/App.jsx. If a demo route is added or renamed,
// both this list and App.jsx must change together.
const APP_ROUTES = [
  "/ele",
  "/invoice",
  "/plot-twist",
  "/janet",
  "/aaron-west-atlas",
  "/link-tracker",
  "/city-quiz",
  "/monetized-reader",
  "/ai-chip",
  "/apple-price-hike",
];

describe("DEMOS metadata", () => {
  it("covers all ten demos", () => {
    expect(DEMOS).toHaveLength(10);
  });

  it("has unique ids and routes", () => {
    const ids = DEMOS.map((d) => d.id);
    const routes = DEMOS.map((d) => d.route);
    expect(new Set(ids).size).toBe(DEMOS.length);
    expect(new Set(routes).size).toBe(DEMOS.length);
  });

  it("only references routes registered in App.jsx", () => {
    for (const demo of DEMOS) {
      expect(APP_ROUTES).toContain(demo.route);
    }
  });

  it("has all required fields for each demo", () => {
    for (const demo of DEMOS) {
      expect(demo).toHaveProperty("id");
      expect(demo).toHaveProperty("route");
      expect(demo).toHaveProperty("title");
      expect(demo).toHaveProperty("kindLabel");
      expect(demo).toHaveProperty("tagline");
      expect(demo).toHaveProperty("description");
      expect(demo).toHaveProperty("cta");
      expect(demo.tags.length).toBeGreaterThan(0);
      expect(typeof demo.live).toBe("boolean");
      expect(demo.sourceDir).toMatch(/^src\/components\//);
      expect(demo.theme.bg).toMatch(/^#[0-9A-Fa-f]{3,6}$/);
      expect(demo.theme.text).toMatch(/^#[0-9A-Fa-f]{3,6}$/);
    }
  });

  it("splits featured and remaining demos cleanly", () => {
    expect(FEATURED_DEMOS.length).toBe(4);
    expect(FEATURED_DEMOS.length + MORE_DEMOS.length).toBe(DEMOS.length);
  });

  it("groups four demos under The Happiness Liability series", () => {
    expect(SERIES_DEMOS).toHaveLength(4);
    for (const demo of SERIES_DEMOS) {
      expect(demo.series).toBe(HAPPINESS_LIABILITY_SERIES.id);
    }
  });

  it("builds GitHub source URLs from the repo root", () => {
    const demo = DEMOS[0];
    expect(sourceUrl(demo)).toBe(
      `${GITHUB_REPO_URL}/tree/main/${demo.sourceDir}`
    );
  });
});
