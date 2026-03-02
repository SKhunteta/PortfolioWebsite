import React, { useEffect, useRef, useState, useCallback } from "react";

const SPOTIFY_IFRAME_API_URL = "https://open.spotify.com/embed/iframe-api/v1";
const SPOTIFY_ARTIST_URL = "https://open.spotify.com/artist/59cc2f0IvGu6YVEtY4cS0p";
const AUTOPLAY_GRACE_MS = 800;

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
  const wantsAutoPlayRef = useRef(false);
  const autoPlayAtRef = useRef(0);
  const observerRef = useRef(null);
  const onPlaybackStartedRef = useRef(onPlaybackStarted);
  onPlaybackStartedRef.current = onPlaybackStarted;
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

          // Reset the grace-period clock so the buffer gets a full
          // grace period from when the embed is actually ready, not
          // from the original autoplay request (which may be seconds
          // old if the controller was still initializing).
          if (wantsAutoPlayRef.current) {
            autoPlayAtRef.current = Date.now();
          }

          controller.addListener("playback_update", (e) => {
            const { isPaused, isBuffering, position } = e.data;

            // Dismiss loading overlay once the embed stops buffering,
            // but only when we're NOT in an autoplay sequence — during
            // autoplay the overlay stays visible until playback genuinely
            // starts (handled by the !isPaused branch below).
            if (!isBuffering && !wantsAutoPlayRef.current) {
              setTrackLoading(false);
            }

            // Event-driven autoplay: once the embed reports the track
            // is ready (isPaused && !isBuffering) AND the grace period
            // has passed since the autoplay was requested, trigger
            // playback. The grace period lets the audio buffer fill
            // so the song starts cleanly without sputtering.
            if (wantsAutoPlayRef.current) {
              if (
                isPaused &&
                !isBuffering &&
                Date.now() - autoPlayAtRef.current >= AUTOPLAY_GRACE_MS
              ) {
                tryPlay();
              }
              if (!isPaused) {
                wantsAutoPlayRef.current = false;
                setTrackLoading(false);
                if (onPlaybackStartedRef.current) onPlaybackStartedRef.current();
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

          // Polling retry: if autoplay was requested while the
          // controller was initializing, keep trying every 500ms
          // (after the grace period) until playback starts.
          // The playback_update listener clears wantsAutoPlayRef
          // once !isPaused, which stops the loop.
          if (wantsAutoPlayRef.current) {
            const retryId = setInterval(() => {
              if (!wantsAutoPlayRef.current) {
                clearInterval(retryId);
              } else if (Date.now() - autoPlayAtRef.current >= AUTOPLAY_GRACE_MS) {
                tryPlay();
              }
            }, 500);
            setTimeout(() => {
              clearInterval(retryId);
              wantsAutoPlayRef.current = false;
              setTrackLoading(false);
            }, 15000);
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
      autoPlayAtRef.current = Date.now();
      setTrackLoading(true);

      if (controllerRef.current) {
        // Polling retry: try play() every 500ms after the grace
        // period until the playback_update listener confirms the track
        // is playing (clears wantsAutoPlayRef). This is more robust
        // than a single-shot timeout since play() can silently fail
        // if the track is still buffering.
        const retryId = setInterval(() => {
          if (!wantsAutoPlayRef.current) {
            clearInterval(retryId);
          } else if (Date.now() - autoPlayAtRef.current >= AUTOPLAY_GRACE_MS) {
            tryPlay();
          }
        }, 500);

        // Safety: clear autoplay flag after 15s to prevent stale state
        const safety = setTimeout(() => {
          clearInterval(retryId);
          wantsAutoPlayRef.current = false;
          setTrackLoading(false);
        }, 15000);
        return () => {
          clearInterval(retryId);
          clearTimeout(safety);
        };
      }
      // Controller still initializing — wantsAutoPlayRef is set,
      // the playback_update listener will handle it once active.
      // Add a safety timeout so the loading overlay can't persist
      // forever if autoplay never succeeds.
      const safety = setTimeout(() => {
        wantsAutoPlayRef.current = false;
        setTrackLoading(false);
      }, 15000);
      return () => clearTimeout(safety);
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
      className="rounded-lg overflow-hidden relative"
      style={{ minHeight: 80 }}
    >
      {/* Spotify API target — kept separate so createController's DOM
          mutations don't destroy the React-managed loading overlay. */}
      <div ref={containerRef} />
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
