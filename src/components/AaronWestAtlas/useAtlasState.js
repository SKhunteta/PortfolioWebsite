import { useState, useCallback, useRef, useEffect } from "react";
import { LOCATIONS, ALBUM_ORDER } from "./constants";

const sorted = [...LOCATIONS].sort((a, b) => a.narrativeOrder - b.narrativeOrder);

export default function useAtlasState() {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeAlbums, setActiveAlbums] = useState(new Set(ALBUM_ORDER));
  const [journeyActive, setJourneyActive] = useState(false);
  const [journeyIndex, setJourneyIndex] = useState(0);
  const [journeyPath, setJourneyPath] = useState([]);
  const [autoPlaySignal, setAutoPlaySignal] = useState(0);
  const journeyTimerRef = useRef(null);
  const mapRef = useRef(null);

  const selectLocation = useCallback((locationId) => {
    const loc = LOCATIONS.find((l) => l.id === locationId) || null;
    setSelectedLocation(loc);
    if (loc && mapRef.current) {
      mapRef.current.flyTo([loc.lat, loc.lng], 10, { duration: 1.5 });
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLocation(null);
  }, []);

  const toggleAlbumFilter = useCallback((albumId) => {
    setActiveAlbums((prev) => {
      const next = new Set(prev);
      if (next.has(albumId)) {
        if (next.size > 1) next.delete(albumId);
      } else {
        next.add(albumId);
      }
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setActiveAlbums(new Set(ALBUM_ORDER));
  }, []);

  const navigateLocation = useCallback(
    (direction) => {
      if (!selectedLocation) {
        selectLocation(sorted[0].id);
        return;
      }
      const currentIdx = sorted.findIndex(
        (l) => l.id === selectedLocation.id
      );
      const nextIdx = currentIdx + direction;
      if (nextIdx >= 0 && nextIdx < sorted.length) {
        selectLocation(sorted[nextIdx].id);
        setAutoPlaySignal((s) => s + 1);
        // Sync journey state so auto-advance continues from the new position
        if (journeyActive) {
          if (journeyTimerRef.current) {
            clearTimeout(journeyTimerRef.current);
            journeyTimerRef.current = null;
          }
          setJourneyIndex(nextIdx);
          setJourneyPath(
            sorted.slice(0, nextIdx + 1).map((l) => [l.lat, l.lng])
          );
        }
      }
    },
    [selectedLocation, selectLocation, journeyActive]
  );

  const stopJourney = useCallback(() => {
    setJourneyActive(false);
    if (journeyTimerRef.current) {
      clearTimeout(journeyTimerRef.current);
      journeyTimerRef.current = null;
    }
  }, []);

  const startJourney = useCallback(() => {
    setJourneyActive(true);
    setJourneyIndex(0);
    setJourneyPath([]);
    setActiveAlbums(new Set(ALBUM_ORDER));
    const first = sorted[0];
    setSelectedLocation(first);
    setAutoPlaySignal((s) => s + 1);
    setJourneyPath([[first.lat, first.lng]]);
    if (mapRef.current) {
      mapRef.current.flyTo([first.lat, first.lng], 6, { duration: 1.5 });
    }
  }, []);

  // Auto-advance journey
  useEffect(() => {
    if (!journeyActive) return;

    journeyTimerRef.current = setTimeout(() => {
      setJourneyIndex((prev) => {
        const next = prev + 1;
        if (next >= sorted.length) {
          stopJourney();
          return prev;
        }
        const loc = sorted[next];
        setSelectedLocation(loc);
        setAutoPlaySignal((s) => s + 1);
        setJourneyPath((p) => [...p, [loc.lat, loc.lng]]);
        if (mapRef.current) {
          // Zoom closer for nearby points, wider for distant ones
          const prevLoc = sorted[prev];
          const dist = Math.abs(loc.lat - prevLoc.lat) + Math.abs(loc.lng - prevLoc.lng);
          const zoom = dist > 10 ? 5 : dist > 3 ? 7 : 10;
          mapRef.current.flyTo([loc.lat, loc.lng], zoom, { duration: 1.5 });
        }
        return next;
      });
    }, 30000);

    return () => {
      if (journeyTimerRef.current) {
        clearTimeout(journeyTimerRef.current);
      }
    };
  }, [journeyActive, journeyIndex, stopJourney]);

  const filteredLocations = LOCATIONS.filter((loc) =>
    activeAlbums.has(loc.album)
  );

  const currentSortedIndex = selectedLocation
    ? sorted.findIndex((l) => l.id === selectedLocation.id)
    : -1;

  return {
    selectedLocation,
    selectLocation,
    clearSelection,
    navigateLocation,
    activeAlbums,
    toggleAlbumFilter,
    resetFilters,
    filteredLocations,
    journeyActive,
    journeyIndex,
    journeyPath,
    startJourney,
    stopJourney,
    mapRef,
    totalLocations: LOCATIONS.length,
    sortedLocations: sorted,
    canNavigatePrev: currentSortedIndex > 0,
    canNavigateNext: currentSortedIndex >= 0 && currentSortedIndex < sorted.length - 1,
    autoPlaySignal,
  };
}
