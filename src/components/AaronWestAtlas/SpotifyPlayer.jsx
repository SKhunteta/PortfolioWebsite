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

const SpotifyPlayer = ({ trackId, autoPlaySignal }) => {
  const containerRef = useRef(null);
  const controllerRef = useRef(null);
  const currentTrackRef = useRef(null);
  const userPausedRef = useRef(false);
  const lastAutoPlaySignalRef = useRef(autoPlaySignal);
  const [failed, setFailed] = useState(false);

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
        }
        return;
      }

      IFrameAPI.createController(
        containerRef.current,
        {
          uri: `spotify:track:${trackId}`,
          width: "100%",
          height: 80,
        },
        (controller) => {
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
        }
      );
    } catch {
      setFailed(true);
    }
  }, [trackId]);

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
      autoPlaySignal !== lastAutoPlaySignalRef.current &&
      controllerRef.current &&
      !userPausedRef.current
    ) {
      const timer = setTimeout(() => {
        if (controllerRef.current && !userPausedRef.current) {
          try {
            controllerRef.current.play();
          } catch {
            // browser autoplay policy — fail silently
          }
        }
      }, 300);
      lastAutoPlaySignalRef.current = autoPlaySignal;
      return () => clearTimeout(timer);
    }
    lastAutoPlaySignalRef.current = autoPlaySignal;
  }, [autoPlaySignal]);

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
