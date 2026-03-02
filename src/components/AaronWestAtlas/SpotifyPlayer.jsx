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
  const wantsAutoPlayRef = useRef(false);
  const observerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [trackLoading, setTrackLoading] = useState(false);
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

    // Already initialized — the track-switch effect handles subsequent changes
    if (controllerRef.current) return;

    try {
      const IFrameAPI = await Promise.race([
        loadSpotifyIFrameAPI(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 8000)
        ),
      ]);

      // Re-check after await — another render may have initialized
      if (controllerRef.current) return;

      // Observe the container so we can add allow="autoplay" to the iframe
      // before it loads its content — this lets the browser permit playback
      // after the user clicks "Start the Journey".
      let observerTimeoutId;
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeName === "IFRAME") {
              node.allow = "autoplay; encrypted-media; clipboard-write";
              clearTimeout(observerTimeoutId);
              observer.disconnect();
              observerRef.current = null;
              return;
            }
          }
        }
      });
      observerRef.current = observer;
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
      });

      // Safety: disconnect observer if controller never calls back
      observerTimeoutId = setTimeout(() => {
        observer.disconnect();
        observerRef.current = null;
      }, 10000);

      IFrameAPI.createController(
        containerRef.current,
        {
          uri: `spotify:track:${trackId}`,
          width: "100%",
          height: 80,
        },
        (controller) => {
          clearTimeout(observerTimeoutId);
          observer.disconnect();
          observerRef.current = null;
          controllerRef.current = controller;
          currentTrackRef.current = trackId;
          setLoading(false);
          setTrackLoading(true);

          controller.addListener("playback_update", (e) => {
            const { isPaused, isBuffering, position } = e.data;

            // Dismiss loading overlay once the embed stops buffering
            // or playback begins — this is a reliable "track loaded" signal
            if (!isBuffering) {
              setTrackLoading(false);
            }

            // Event-driven autoplay: when the embed reports paused
            // and not buffering, the track is ready to play.
            if (wantsAutoPlayRef.current) {
              if (isPaused && !isBuffering) {
                tryPlay();
              }
              if (!isPaused) {
                wantsAutoPlayRef.current = false;
                setTrackLoading(false);
              }
            }

            // User-pause detection: only flag as user-paused when we are
            // NOT in the middle of an autoplay attempt and the track has
            // progressed past the start
            if (isPaused && !isBuffering && position > 0 && !wantsAutoPlayRef.current) {
              userPausedRef.current = true;
            }
            if (!isPaused) {
              userPausedRef.current = false;
            }
          });

          // Delayed retry: if autoplay was requested while controller
          // was initializing, wait 1s then try — long enough for the
          // track to buffer (avoids sputter) but catches the case
          // where playback_update events already settled.
          if (wantsAutoPlayRef.current) {
            setTimeout(() => {
              if (wantsAutoPlayRef.current) {
                tryPlay();
              }
            }, 1000);
          }
        }
      );
    } catch {
      setLoading(false);
      setFailed(true);
    }
  }, [trackId, tryPlay]);

  // Init controller (re-runs on trackId change but returns early if already initialized)
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
      setTrackLoading(true);
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
      const sameTrack = lastPlayedTrackRef.current === trackId;
      lastAutoPlaySignalRef.current = autoPlaySignal;
      lastPlayedTrackRef.current = trackId;

      if (sameTrack) return;

      // Reset user-paused state on navigation so new tracks auto-play
      userPausedRef.current = false;
      wantsAutoPlayRef.current = true;

      if (controllerRef.current) {
        // Delayed retry at 1s — long enough for the track to buffer
        // (avoids the start-stop sputter that happened at 200ms) but
        // catches the case where playback_update events already settled
        // before wantsAutoPlayRef was set. The guard ensures this is
        // a no-op if the event-driven approach already succeeded.
        const retry = setTimeout(() => {
          if (wantsAutoPlayRef.current) {
            tryPlay();
          }
        }, 1000);

        // Safety: clear autoplay flag after 15s to prevent stale state
        const safety = setTimeout(() => {
          wantsAutoPlayRef.current = false;
          setTrackLoading(false);
        }, 15000);
        return () => {
          clearTimeout(retry);
          clearTimeout(safety);
        };
      }
      // Controller still initializing — wantsAutoPlayRef is set,
      // the playback_update listener will handle it once active
    }
    lastAutoPlaySignalRef.current = autoPlaySignal;
  }, [autoPlaySignal, trackId, tryPlay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
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
      className="rounded-lg overflow-hidden relative"
      style={{ minHeight: 80 }}
    >
      {(loading || trackLoading) && (
        <div className="absolute inset-0 bg-atlas-bg/90 rounded-lg flex items-center justify-center z-20 pointer-events-none">
          <div className="flex items-center gap-2">
            <span
              className="block w-2 h-2 rounded-full bg-atlas-text-secondary animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="block w-2 h-2 rounded-full bg-atlas-text-secondary animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="block w-2 h-2 rounded-full bg-atlas-text-secondary animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
            <span className="text-sm text-atlas-text-secondary font-sans ml-2">
              Loading track&hellip;
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(SpotifyPlayer);
