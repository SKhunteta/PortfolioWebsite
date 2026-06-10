import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SessionSummary from "../SessionSummary";

const STATS = {
  totalEarned: 5.6,
  unitsSold: { grief: 7, melancholy: 1 },
  alertsTriggered: 9,
  haroldCalls: 1,
  contaminationEvents: 1,
  peakHappiness: 78,
  readingTimeMs: 4 * 60 * 1000,
  marketDisruptionBps: 156,
};

const renderSummary = (stats = STATS) =>
  render(
    <MemoryRouter>
      <SessionSummary stats={stats} />
    </MemoryRouter>
  );

describe("SessionSummary", () => {
  it("renders nothing without stats", () => {
    const { container } = renderSummary(null);
    expect(container.firstChild).toBeNull();
  });

  it("shows formatted earnings and per-emotion units", () => {
    renderSummary();
    expect(screen.getByText("$5.60")).toBeInTheDocument();
    expect(screen.getByText("7 units")).toBeInTheDocument();
    expect(screen.getByText("1 unit")).toBeInTheDocument();
    expect(screen.getByText("78%")).toBeInTheDocument();
    expect(screen.getByText("156 bps")).toBeInTheDocument();
  });

  it("links to the sibling Happiness Liability projects", () => {
    renderSummary();
    expect(screen.getByRole("link", { name: /janet/i })).toHaveAttribute(
      "href",
      "/janet"
    );
    expect(
      screen.getByRole("link", { name: /emotional labor exchange/i })
    ).toHaveAttribute("href", "/ele");
  });

  it("pitches the book", () => {
    renderSummary();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    expect(screen.getAllByText(/The Happiness Liability/).length).toBeGreaterThan(0);
  });
});
