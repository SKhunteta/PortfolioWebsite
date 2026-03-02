import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EmotionCard from "../EmotionCard";

describe("EmotionCard", () => {
  const defaultProps = {
    emotionKey: "joy",
    data: {
      price: 42.5,
      change: 1.2,
      signal: "BUY",
      reason: "Sunshine forecast boosted futures",
    },
    history: [40, 41, 42, 42.5],
  };

  it("renders the emotion name", () => {
    render(<EmotionCard {...defaultProps} />);
    expect(screen.getByText("Joy")).toBeInTheDocument();
  });

  it("renders the price formatted to 2 decimals", () => {
    render(<EmotionCard {...defaultProps} />);
    expect(screen.getByText("$42.50")).toBeInTheDocument();
  });

  it("renders positive change with + prefix and up arrow", () => {
    render(<EmotionCard {...defaultProps} />);
    expect(screen.getByText(/\+1\.20/)).toBeInTheDocument();
  });

  it("renders the signal badge", () => {
    render(<EmotionCard {...defaultProps} />);
    expect(screen.getByText("BUY")).toBeInTheDocument();
  });

  it("renders the reason text", () => {
    render(<EmotionCard {...defaultProps} />);
    expect(
      screen.getByText("Sunshine forecast boosted futures")
    ).toBeInTheDocument();
  });

  it("renders negative change with down arrow", () => {
    const props = {
      ...defaultProps,
      data: { ...defaultProps.data, change: -3.5, signal: "SELL" },
    };
    render(<EmotionCard {...props} />);
    expect(screen.getByText(/-3\.50/)).toBeInTheDocument();
  });

  it("returns null when emotionKey is invalid", () => {
    const { container } = render(
      <EmotionCard emotionKey="invalid" data={defaultProps.data} history={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when data is null", () => {
    const { container } = render(
      <EmotionCard emotionKey="joy" data={null} history={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("does not render reason when not provided", () => {
    const props = {
      ...defaultProps,
      data: { price: 10, change: 0, signal: "HOLD" },
    };
    render(<EmotionCard {...props} />);
    expect(
      screen.queryByText("Sunshine forecast boosted futures")
    ).not.toBeInTheDocument();
  });

  it("applies accent color as left border", () => {
    const { container } = render(<EmotionCard {...defaultProps} />);
    const card = container.firstChild;
    expect(card.style.borderLeftColor).toBe("rgb(245, 158, 11)");
  });
});
