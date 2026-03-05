import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StoryCard from "../StoryCard";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }, ref) => {
      const filtered = { ...props };
      delete filtered.initial;
      delete filtered.animate;
      delete filtered.whileInView;
      delete filtered.whileTap;
      delete filtered.whileHover;
      delete filtered.transition;
      delete filtered.viewport;
      delete filtered.exit;
      return <div ref={ref} {...filtered}>{children}</div>;
    }),
    button: React.forwardRef(({ children, ...props }, ref) => {
      const filtered = { ...props };
      delete filtered.initial;
      delete filtered.animate;
      delete filtered.whileTap;
      delete filtered.whileHover;
      delete filtered.transition;
      delete filtered.exit;
      return <button ref={ref} {...filtered}>{children}</button>;
    }),
    p: React.forwardRef(({ children, ...props }, ref) => {
      const filtered = { ...props };
      delete filtered.initial;
      delete filtered.animate;
      delete filtered.whileInView;
      delete filtered.transition;
      delete filtered.viewport;
      return <p ref={ref} {...filtered}>{children}</p>;
    }),
    h2: React.forwardRef(({ children, ...props }, ref) => {
      const filtered = { ...props };
      delete filtered.initial;
      delete filtered.animate;
      delete filtered.whileInView;
      delete filtered.transition;
      delete filtered.viewport;
      return <h2 ref={ref} {...filtered}>{children}</h2>;
    }),
    span: React.forwardRef(({ children, ...props }, ref) => {
      const filtered = { ...props };
      delete filtered.initial;
      delete filtered.animate;
      delete filtered.transition;
      return <span ref={ref} {...filtered}>{children}</span>;
    }),
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

const mockStory = {
  id: "test-1",
  type: "premise",
  title: "The Last Librarian",
  content: "In 2087, books are illegal.",
  genre: "sci-fi",
  mood: "tense",
  tags: ["dystopian", "philosophical"],
};

const defaultProps = {
  story: mockStory,
  index: 0,
  totalCount: 5,
  reaction: null,
  isSaved: false,
  sessionLikes: 0,
  onLike: vi.fn(),
  onDislike: vi.fn(),
  onSave: vi.fn(),
  showScrollCue: false,
};

describe("StoryCard", () => {
  it("renders the story title", () => {
    render(<StoryCard {...defaultProps} />);
    expect(screen.getByText("The Last Librarian")).toBeInTheDocument();
  });

  it("renders the story content", () => {
    render(<StoryCard {...defaultProps} />);
    expect(screen.getByText("In 2087, books are illegal.")).toBeInTheDocument();
  });

  it("renders genre badge", () => {
    render(<StoryCard {...defaultProps} />);
    expect(screen.getByText("Sci-Fi")).toBeInTheDocument();
  });

  it("renders mood text", () => {
    render(<StoryCard {...defaultProps} />);
    expect(screen.getByText("tense")).toBeInTheDocument();
  });

  it("renders tags with # prefix", () => {
    render(<StoryCard {...defaultProps} />);
    expect(screen.getByText("#dystopian")).toBeInTheDocument();
    expect(screen.getByText("#philosophical")).toBeInTheDocument();
  });

  it("renders story counter", () => {
    render(<StoryCard {...defaultProps} />);
    expect(screen.getByText("1 of 5")).toBeInTheDocument();
  });

  it("shows scroll cue when showScrollCue is true", () => {
    render(<StoryCard {...defaultProps} showScrollCue={true} />);
    expect(screen.getByText("scroll for more")).toBeInTheDocument();
  });

  it("hides scroll cue when showScrollCue is false", () => {
    render(<StoryCard {...defaultProps} showScrollCue={false} />);
    expect(screen.queryByText("scroll for more")).not.toBeInTheDocument();
  });

  it("calls onLike when like button is clicked", async () => {
    const onLike = vi.fn();
    render(<StoryCard {...defaultProps} onLike={onLike} />);
    const likeBtns = screen.getAllByRole("button", { name: /like story/i });
    await userEvent.click(likeBtns[0]);
    expect(onLike).toHaveBeenCalledTimes(1);
  });

  it("calls onDislike when dislike button is clicked", async () => {
    const onDislike = vi.fn();
    render(<StoryCard {...defaultProps} onDislike={onDislike} />);
    const dislikeBtns = screen.getAllByRole("button", { name: /dislike story/i });
    await userEvent.click(dislikeBtns[0]);
    expect(onDislike).toHaveBeenCalledTimes(1);
  });

  it("calls onSave when save button is clicked", async () => {
    const onSave = vi.fn();
    render(<StoryCard {...defaultProps} onSave={onSave} />);
    const saveBtns = screen.getAllByRole("button", { name: /save story/i });
    await userEvent.click(saveBtns[0]);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
