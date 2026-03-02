import React, { useEffect, useRef, useState, useCallback } from "react";

const SPOTIFY_IFRAME_API_URL = "https://open.spotify.com/embed/iframe-api/v1";
const SPOTIFY_ARTIST_URL = "https://open.spotify.com/artist/59cc2f0IvGu6YVEtY4cS0p";

// Singleton: track whether the API script has been loaded
let apiScriptLoaded = false;
let apiReadyPromise = null;

function loadSpotifyIFrameAPI() {
  if (apiReadyPromise) return apiReadyPromise;

  apiReadyPromise = new Promise((resolve) => {
    if (window.SpotifyIframeApi) {
      resolve(window.SpotifyIframeApi);
      return;
    }

    window.onSpotifyIframeApiReady = (IFrameAPI) => {
      window.SpotifyIframeApi = IFrameAPI;
      resolve(IFrameAPI);
    };

    if (!apiScriptLoaded) {
      const script = document.createElement("script");
      script.src = SPOTIFY_IFRAME_API_URL;
      script.async = true;
      document.body.appendChild(script);
      apiScriptLoaded = true;
    }
  });

  return apiReadyPromise;
}

// Eagerly preload the Spotify IFrame API so it's ready before any track is needed
loadSpotifyIFrameAPI();

const SpotifyPlayer = ({ trackId, autoPlaySignal }) => {
  const containerRef = useRef(null);
  const controllerRef = useRef(null);
  const currentTrackRef = useRef(null);
  const userPausedRef = useRef(false);
  const lastAutoPlaySignalRef = useRef(0);
  const lastPlayedTrackRef = useRef(null);
  const pendingPlayRef = useRef(false);
  const [failed, setFailed] = useState(false);

  const tryPlay = useCallback(() => {
    if (controllerRef.current && !userPausedRef.current) {
      try {
        controllerRef.current.play();
      } catch {
        // browser autoplay policy — fail silently
      }
    }
  }, []);

  const initController = useCallback(async () => {
    if (!trackId || !containerRef.current) return;

    try {
      const IFrameAPI = await Promise.race([
        loadSpotifyIFrameAPI(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 8000)
        ),
      ]);

      // Don't reinit if we already have a controller
      if (controllerRef.current) {
        if (currentTrackRef.current !== trackId) {
          controllerRef.current.loadUri(`spotify:track:${trackId}`);
          currentTrackRef.current = trackId;
          if (pendingPlayRef.current) {
            pendingPlayRef.current = false;
            setTimeout(tryPlay, 50);
          }
        }
        return;
      }

      // Observe the container so we can add allow="autoplay" to the iframe
      // before it loads its content — this lets the browser permit playback
      // after the user clicks "Start the Journey".
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeName === "IFRAME") {
              node.allow = "autoplay; encrypted-media; clipboard-write";
              observer.disconnect();
              return;
            }
          }
        }
      });
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
      });

      IFrameAPI.createController(
        containerRef.current,
        {
          uri: `spotify:track:${trackId}`,
          width: "100%",
          height: 80,
        },
        (controller) => {
          observer.disconnect();
          controllerRef.current = controller;
          currentTrackRef.current = trackId;
          controller.addListener("playback_update", (e) => {
            if (e.data.isPaused && !e.data.isBuffering && e.data.position > 0) {
              userPausedRef.current = true;
            }
            if (!e.data.isPaused) {
              userPausedRef.current = false;
            }
          });
          // If play was requested while controller was initializing, play now
          if (pendingPlayRef.current) {
            pendingPlayRef.current = false;
            setTimeout(tryPlay, 300);
          }
        }
      );
    } catch {
      setFailed(true);
    }
  }, [trackId, tryPlay]);

  // Init on mount
  useEffect(() => {
    initController();
  }, [initController]);

  // Switch tracks when trackId changes (controller already exists)
  useEffect(() => {
    if (
      controllerRef.current &&
      trackId &&
      currentTrackRef.current !== trackId
    ) {
      controllerRef.current.loadUri(`spotify:track:${trackId}`);
      currentTrackRef.current = trackId;
    }
  }, [trackId]);

  // Auto-play when signal changes (journey or prev/next navigation)
  useEffect(() => {
    if (
      autoPlaySignal > 0 &&
      autoPlaySignal !== lastAutoPlaySignalRef.current
    ) {
      // Same track as the last auto-played track — let it keep playing
      // seamlessly instead of restarting the song.
      // NOTE: we use a dedicated ref here (not currentTrackRef) because the
      // track-switch effect above already updated currentTrackRef for this
      // render, which would make every track look like "same track".
      const sameTrack = lastPlayedTrackRef.current === trackId;
      lastAutoPlaySignalRef.current = autoPlaySignal;
      lastPlayedTrackRef.current = trackId;

      if (sameTrack) return;

      // Reset user-paused state on navigation so new tracks auto-play
      userPausedRef.current = false;

      if (controllerRef.current) {
        // Controller ready — give loadUri time to load the new track
        const timer = setTimeout(tryPlay, 300);
        return () => clearTimeout(timer);
      } else {
        // Controller still initializing — queue play for when it's ready
        pendingPlayRef.current = true;
      }
    }
    lastAutoPlaySignalRef.current = autoPlaySignal;
  }, [autoPlaySignal, trackId, tryPlay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        try {
          controllerRef.current.destroy();
        } catch {
          // ignore cleanup errors
        }
        controllerRef.current = null;
        currentTrackRef.current = null;
      }
    };
  }, []);

  if (!trackId || failed) {
    return (
      <a
        href={SPOTIFY_ARTIST_URL}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-atlas-text-muted hover:text-atlas-text transition-colors font-sans inline-flex items-center gap-1"
      >
        Listen on Spotify &rarr;
      </a>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded-lg overflow-hidden"
      style={{ minHeight: 80 }}
    />
  );
};

export default React.memo(SpotifyPlayer);
