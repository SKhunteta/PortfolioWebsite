import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App";

// Mock heavy components to keep tests fast and focused on routing
vi.mock("../components/EmotionalLaborExchange", () => ({
  default: () => <div data-testid="ele-page">ELE Page</div>,
}));

vi.mock("../components/AaronWestAtlas", () => ({
  default: () => <div data-testid="atlas-page">Atlas Page</div>,
}));

vi.mock("../components/ChatSection", () => ({
  default: () => <div data-testid="chat-section">Chat Section</div>,
}));

describe("App", () => {
  it("renders the home page at /", () => {
    // App includes its own BrowserRouter, so we just render it
    // The default URL in jsdom is http://localhost/
    render(<App />);
    // Multiple instances: Navbar (desktop + mobile) + Hero + Footer
    const brandNames = screen.getAllByText("Shreyans Khunteta");
    expect(brandNames.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Hero section on the home page", () => {
    render(<App />);
    expect(screen.getByText("Senior Software Engineer & Writer")).toBeInTheDocument();
  });

  it("renders the Navbar on the home page", () => {
    render(<App />);
    expect(
      screen.getAllByText("Shreyans Khunteta").length
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders the Footer on the home page", () => {
    render(<App />);
    expect(screen.getByText(/React & Vite/)).toBeInTheDocument();
  });

  it("renders About section on the home page", () => {
    render(<App />);
    expect(screen.getByText("About Me")).toBeInTheDocument();
  });

  it("renders Resume CTA on the home page", () => {
    render(<App />);
    expect(screen.getByText("View Full Resume")).toBeInTheDocument();
  });

  it("renders Projects section on the home page", () => {
    render(<App />);
    expect(screen.getByText("My Projects")).toBeInTheDocument();
  });

  it("renders Contact section on the home page", () => {
    render(<App />);
    // "Let's Connect" appears in both Contact heading and Navbar link
    const connectElements = screen.getAllByText("Let's Connect");
    expect(connectElements.length).toBeGreaterThanOrEqual(1);
  });
});
