import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MonetizedReader from "../index";
import { BOOK_TITLE, EXCERPT_TITLE } from "../constants";

describe("MonetizedReader page", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("gates the excerpt behind the consent screen, then connects", () => {
    render(
      <MemoryRouter>
        <MonetizedReader />
      </MemoryRouter>
    );

    expect(
      screen.getByText("Emotional Data Provider Agreement")
    ).toBeInTheDocument();
    expect(screen.queryByText(BOOK_TITLE)).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /accept & connect interface/i })
    );
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText(BOOK_TITLE)).toBeInTheDocument();
    expect(screen.getByText(`1. ${EXCERPT_TITLE}`)).toBeInTheDocument();
    expect(screen.getByText(/earned this session/i)).toBeInTheDocument();
  });
});
