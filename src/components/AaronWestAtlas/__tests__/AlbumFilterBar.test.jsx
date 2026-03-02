import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AlbumFilterBar from "../AlbumFilterBar";
import { ALBUMS, ALBUM_ORDER } from "../constants";

describe("AlbumFilterBar", () => {
  const defaultProps = {
    albums: ALBUMS,
    albumOrder: ALBUM_ORDER,
    activeAlbums: new Set(ALBUM_ORDER),
    onToggle: vi.fn(),
  };

  it("renders the Filter label", () => {
    render(<AlbumFilterBar {...defaultProps} />);
    expect(screen.getByText("Filter:")).toBeInTheDocument();
  });

  it("renders a button for each album", () => {
    render(<AlbumFilterBar {...defaultProps} />);
    ALBUM_ORDER.forEach((key) => {
      const album = ALBUMS[key];
      expect(
        screen.getByText(`${album.shortName} (${album.year})`)
      ).toBeInTheDocument();
    });
  });

  it("calls onToggle with album key when clicked", () => {
    const onToggle = vi.fn();
    render(<AlbumFilterBar {...defaultProps} onToggle={onToggle} />);

    const firstAlbum = ALBUMS[ALBUM_ORDER[0]];
    fireEvent.click(
      screen.getByText(`${firstAlbum.shortName} (${firstAlbum.year})`)
    );

    expect(onToggle).toHaveBeenCalledWith(ALBUM_ORDER[0]);
  });

  it("applies active styling when album is in activeAlbums", () => {
    render(<AlbumFilterBar {...defaultProps} />);
    const firstAlbum = ALBUMS[ALBUM_ORDER[0]];
    const button = screen.getByText(
      `${firstAlbum.shortName} (${firstAlbum.year})`
    ).closest("button");

    // jsdom normalizes hex colors to rgb()
    expect(button.style.opacity).not.toBe("0.5");
    expect(button.style.borderColor).toBeTruthy();
  });

  it("applies inactive styling when album is not in activeAlbums", () => {
    const inactiveAlbums = new Set(ALBUM_ORDER.slice(1));
    render(
      <AlbumFilterBar {...defaultProps} activeAlbums={inactiveAlbums} />
    );

    const firstAlbum = ALBUMS[ALBUM_ORDER[0]];
    const button = screen.getByText(
      `${firstAlbum.shortName} (${firstAlbum.year})`
    ).closest("button");

    expect(button.style.backgroundColor).toBe("transparent");
    expect(button.style.opacity).toBe("0.5");
  });

  it("renders album cover images", () => {
    render(<AlbumFilterBar {...defaultProps} />);
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(ALBUM_ORDER.length);
  });
});
