import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Leaflet needs real DOM measurement; stub the react-leaflet primitives so the
// page can render under jsdom.
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  CircleMarker: ({ eventHandlers }) => (
    <button data-testid="marker" onClick={eventHandlers?.click} />
  ),
  Polyline: () => <div data-testid="polyline" />,
  useMap: () => ({ flyTo: vi.fn() }),
  useMapEvents: () => ({ getZoom: () => 11 }),
}));
vi.mock("leaflet/dist/leaflet.css", () => ({}));

import LinkTracker from "../index";

const renderTracker = (initialEntry = "/link-tracker") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LinkTracker />
    </MemoryRouter>
  );

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ available: false }),
  });
});

describe("LinkTracker page", () => {
  it("renders with the Present era active and only operating lines", () => {
    renderTracker();
    expect(screen.getByText("Seattle Link Light Rail Tracker")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Present" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    // Operating lines only — no 3/4 Line chips in the Present view.
    expect(screen.getByRole("button", { name: /1 Line/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /T Line/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /3 Line/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /4 Line/ })).toBeNull();
  });

  it("shows future lines after toggling eras", () => {
    renderTracker();
    fireEvent.click(screen.getByRole("button", { name: "Future (ST3)" }));
    expect(screen.getByRole("button", { name: /3 Line/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /4 Line/ })).toBeInTheDocument();
  });

  it("opens a station from the URL with corrected status data", () => {
    renderTracker("/link-tracker?station=judkins-park");
    // Crosslake Connection station: opened 2026, not 2024.
    expect(screen.getAllByText("Judkins Park").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Open since 2026/).length).toBeGreaterThan(0);
  });

  it("deep-links into the future era", () => {
    renderTracker("/link-tracker?view=future&station=alaska-junction");
    expect(screen.getByRole("button", { name: "Future (ST3)" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getAllByText(/Planned — 2032/).length).toBeGreaterThan(0);
  });
});
