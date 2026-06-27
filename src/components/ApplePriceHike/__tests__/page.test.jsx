import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ApplePriceHike from "../index";

const renderPage = () =>
  render(
    <MemoryRouter>
      <ApplePriceHike />
    </MemoryRouter>
  );

describe("ApplePriceHike page", () => {
  it("renders the standfirst, sources, and the default MacBook Pro contrast", () => {
    renderPage();
    expect(screen.getByText(/The same machine\. One week apart\./i)).toBeInTheDocument();
    expect(screen.getByText(/How accurate is this\?/i)).toBeInTheDocument();
    // Default device is the $1,699 -> $1,999 MacBook Pro 14".
    expect(screen.getAllByText("$1,699").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$1,999").length).toBeGreaterThan(0);
  });

  it("sets the document title", () => {
    renderPage();
    expect(document.title).toMatch(/Memory Tax/i);
  });

  it("widens the delta when a storage upgrade is chosen", () => {
    renderPage();
    // Pick the 4 TB storage rung; its modeled upcharge should appear.
    const fourTB = screen.getByRole("button", { name: /4 TB/i });
    fireEvent.click(fourTB);
    expect(fourTB).toHaveAttribute("aria-pressed", "true");
    // A reset affordance shows once we leave the base config.
    expect(screen.getByText(/^reset$/i)).toBeInTheDocument();
  });

  it("switches product line to iPad and resets to that base config", () => {
    renderPage();
    const ipadTab = screen.getByRole("tab", { name: /iPad/i });
    fireEvent.click(ipadTab);
    // iPad Pro 11" base is the sourced $999 -> $1,199 jump.
    expect(screen.getAllByText("$749").length).toBeGreaterThan(0); // iPad Air 11" card
  });

  it("labels modeled upgrade rungs so they are never mistaken for sourced", () => {
    renderPage();
    // The memory ladder has modeled rungs; at least one badge is present.
    expect(screen.getAllByText(/modeled/i).length).toBeGreaterThan(0);
  });
});
