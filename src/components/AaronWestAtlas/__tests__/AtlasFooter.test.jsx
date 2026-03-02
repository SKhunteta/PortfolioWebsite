import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AtlasFooter from "../AtlasFooter";

describe("AtlasFooter", () => {
  it("renders the atlas name", () => {
    render(<AtlasFooter />);
    expect(
      screen.getByText("The Aaron West Lyric Atlas")
    ).toBeInTheDocument();
  });

  it("renders a link to Spotify", () => {
    render(<AtlasFooter />);
    const spotifyLink = screen.getByText("Spotify");
    expect(spotifyLink).toBeInTheDocument();
    expect(spotifyLink.closest("a")).toHaveAttribute("target", "_blank");
  });

  it("renders a link to Instagram", () => {
    render(<AtlasFooter />);
    const instaLink = screen.getByText("Instagram");
    expect(instaLink).toBeInTheDocument();
    expect(instaLink.closest("a")).toHaveAttribute("target", "_blank");
  });

  it("renders a link to Apple Music", () => {
    render(<AtlasFooter />);
    const appleMusicLink = screen.getByText("Apple Music");
    expect(appleMusicLink).toBeInTheDocument();
    expect(appleMusicLink.closest("a")).toHaveAttribute("target", "_blank");
  });

  it("renders a link to Hopeless Records", () => {
    render(<AtlasFooter />);
    const label = screen.getByText("Hopeless Records");
    expect(label).toBeInTheDocument();
  });

  it("credits Soupy Campbell for lyrics", () => {
    render(<AtlasFooter />);
    expect(screen.getByText("Soupy Campbell")).toBeInTheDocument();
  });

  it("includes the fan project disclaimer", () => {
    render(<AtlasFooter />);
    expect(
      screen.getByText(/fan project and a craft study/)
    ).toBeInTheDocument();
  });
});
