import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NewsTicker from "../NewsTicker";

describe("NewsTicker", () => {
  const headlines = [
    { emotion: "joy", text: "Markets surge on optimism", impact: "up" },
    { emotion: "grief", text: "Processing volumes increase", impact: "down" },
  ];

  it("renders headline text", () => {
    render(<NewsTicker headlines={headlines} />);
    // Text is doubled for infinite scroll
    const elements = screen.getAllByText("Markets surge on optimism");
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders emotion name badges", () => {
    render(<NewsTicker headlines={headlines} />);
    const joyBadges = screen.getAllByText("Joy");
    expect(joyBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("renders up arrow for up impact", () => {
    render(<NewsTicker headlines={headlines} />);
    const upArrows = screen.getAllByText("\u25B2");
    expect(upArrows.length).toBeGreaterThanOrEqual(1);
  });

  it("renders down arrow for down impact", () => {
    render(<NewsTicker headlines={headlines} />);
    const downArrows = screen.getAllByText("\u25BC");
    expect(downArrows.length).toBeGreaterThanOrEqual(1);
  });

  it("returns null when headlines is empty", () => {
    const { container } = render(<NewsTicker headlines={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when headlines is null", () => {
    const { container } = render(<NewsTicker headlines={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("doubles headlines for infinite scroll effect", () => {
    render(<NewsTicker headlines={headlines} />);
    const allOptimism = screen.getAllByText("Markets surge on optimism");
    // Should appear at least twice (original + duplicate)
    expect(allOptimism.length).toBe(2);
  });

  it("handles unknown emotion gracefully", () => {
    const unknownHeadlines = [
      { emotion: "unknown_emotion", text: "Mysterious event", impact: "up" },
    ];
    render(<NewsTicker headlines={unknownHeadlines} />);
    // Falls back to the raw emotion key
    const elements = screen.getAllByText("unknown_emotion");
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });
});
