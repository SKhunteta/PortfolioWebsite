import React from "react";

const AtlasFooter = () => {
  return (
    <footer className="border-t border-atlas-border bg-atlas-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center space-y-3">
          <p className="font-serif-atlas text-sm text-atlas-text">
            The Aaron West Lyric Atlas
          </p>
          <p className="text-xs text-atlas-text-secondary font-sans">
            An interactive map of every place in the{" "}
            <a
              href="https://open.spotify.com/artist/59cc2f0IvGu6YVEtY4cS0p?si=lGaPfWNiR9mxWia7y6qKVA"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-atlas-text transition-colors"
            >
              Aaron West &amp; The Roaring Twenties
            </a>{" "}
            discography. All lyrics by{" "}
            <a
              href="https://www.thewonderyearsband.com/"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-atlas-text transition-colors"
            >
              Soupy Campbell
            </a>
            .
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-atlas-text-muted font-sans">
            <a
              href="https://open.spotify.com/artist/59cc2f0IvGu6YVEtY4cS0p?si=lGaPfWNiR9mxWia7y6qKVA"
              target="_blank"
              rel="noreferrer"
              className="hover:text-atlas-text transition-colors"
            >
              Spotify
            </a>
            <span className="text-atlas-border">|</span>
            <a
              href="https://www.instagram.com/thisisaaronwest?igsh=MWo1ZWpmd2k3c3NzZA=="
              target="_blank"
              rel="noreferrer"
              className="hover:text-atlas-text transition-colors"
            >
              Instagram
            </a>
            <span className="text-atlas-border">|</span>
            <a
              href="https://music.apple.com/us/artist/aaron-west-and-the-roaring-twenties/867040082"
              target="_blank"
              rel="noreferrer"
              className="hover:text-atlas-text transition-colors"
            >
              Apple Music
            </a>
            <span className="text-atlas-border">|</span>
            <a
              href="https://hopelessrecords.com/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-atlas-text transition-colors"
            >
              Hopeless Records
            </a>
          </div>
          <p className="text-xs text-atlas-text-muted italic font-sans">
            This is a fan project and a craft study, not a commercial product.
            Built by Shreyans Khunteta.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default AtlasFooter;
