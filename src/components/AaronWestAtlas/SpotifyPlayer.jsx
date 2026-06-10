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

const SpotifyPlayer = ({ trackId, autoPlaySignal, onPlaybackStarted }) => {
  const containerRef = useRef(null);
  const controllerRef = useRef(null);
  const currentTrackRef = useRef(null);
  const userPausedRef = useRef(false);
  const lastAutoPlaySignalRef = useRef(0);
  const lastPlayedTrackRef = useRef(null);
  const observerRef = useRef(null);
  const onPlaybackStartedRef = useRef(onPlaybackStarted);
  onPlaybackStartedRef.current = onPlaybackStarted;
  const [, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

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

          controller.addListener("playback_update", (e) => {
            const { isPaused, position } = e.data;

            // Notify parent when playback starts (used for journey timing)
            if (!isPaused) {
              if (onPlaybackStartedRef.current) onPlaybackStartedRef.current();
              userPausedRef.current = false;
            }

            // User-pause detection
            if (isPaused && position > 0) {
              userPausedRef.current = true;
            }
          });
        }
      );
    } catch {
      setLoading(false);
      setFailed(true);
    }
  }, [trackId]);

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
      controllerRef.current.loadUri(`spotify:track:${trackId}`);
      currentTrackRef.current = trackId;
    }
  }, [trackId]);

  // Auto-play: only when two consecutive slides share the same song —
  // let it keep playing seamlessly. No auto-play for new/different songs.
  useEffect(() => {
    if (
      autoPlaySignal > 0 &&
      autoPlaySignal !== lastAutoPlaySignalRef.current
    ) {
      const sameTrack = lastPlayedTrackRef.current === trackId;
      lastAutoPlaySignalRef.current = autoPlaySignal;
      lastPlayedTrackRef.current = trackId;

      if (sameTrack) {
        // Same song — just let it keep playing, nothing to do.
        return;
      }

      // Different song — reset user-paused so if they manually press play
      // it works, but do NOT auto-play.
      userPausedRef.current = false;
    }
    lastAutoPlaySignalRef.current = autoPlaySignal;
  }, [autoPlaySignal, trackId]);

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
      className="rounded-lg overflow-hidden relative"
      style={{ minHeight: 80 }}
    >
      {/* Spotify API target — kept separate so createController's DOM
          mutations don't destroy the React-managed loading overlay. */}
      <div ref={containerRef} />
      {/* Loading animation — commented out, autoplay grace period removed.
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
      */}
    </div>
  );
};

export default React.memo(SpotifyPlayer);
