import React from "react";

const AlbumFilterBar = ({ albums, albumOrder, activeAlbums, onToggle }) => {
  return (
    <div className="border-b border-atlas-border bg-atlas-bg/80 backdrop-blur-sm sticky top-[52px] z-[1000]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs text-atlas-text-muted shrink-0 font-sans">
            Filter:
          </span>
          {albumOrder.map((key) => {
            const album = albums[key];
            const isActive = activeAlbums.has(key);
            return (
              <button
                key={key}
                onClick={() => onToggle(key)}
                className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all duration-200 border"
                style={{
                  backgroundColor: isActive ? album.color : "transparent",
                  borderColor: album.color,
                  color: isActive ? "#FAF6F0" : album.color,
                  opacity: isActive ? 1 : 0.5,
                }}
              >
                <img
                  src={album.coverImage}
                  alt={album.title}
                  className="w-4 h-4 rounded-sm object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                {album.shortName} ({album.year})
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AlbumFilterBar;
