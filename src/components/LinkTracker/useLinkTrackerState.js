import { useState, useCallback, useMemo, useRef } from "react";
import { STATIONS, LINE_ORDER } from "./constants";

export default function useLinkTrackerState() {
  const [selectedStation, setSelectedStation] = useState(null);
  const [activeLines, setActiveLines] = useState(new Set(LINE_ORDER));
  const [operationalOnly, setOperationalOnly] = useState(false);
  const mapRef = useRef(null);

  const filteredStations = useMemo(() => {
    return STATIONS.filter((s) => {
      const lineMatch = s.lines.some((l) => activeLines.has(l));
      const statusMatch = !operationalOnly || s.operational;
      return lineMatch && statusMatch;
    });
  }, [activeLines, operationalOnly]);

  const selectStation = useCallback((stationId) => {
    const station = STATIONS.find((s) => s.id === stationId) || null;
    setSelectedStation(station);
    if (station && mapRef.current) {
      mapRef.current.flyTo([station.lat, station.lng], 14, { duration: 1 });
    }
  }, []);

  const clearSelection = useCallback(() => setSelectedStation(null), []);

  const toggleLineFilter = useCallback((lineId) => {
    setActiveLines((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        if (next.size > 1) next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  }, []);

  const toggleOperationalOnly = useCallback(() => {
    setOperationalOnly((prev) => !prev);
  }, []);

  const navigateStation = useCallback(
    (direction) => {
      if (!selectedStation) return;
      const idx = filteredStations.findIndex((s) => s.id === selectedStation.id);
      if (idx === -1) return;
      const nextIdx = idx + direction;
      if (nextIdx >= 0 && nextIdx < filteredStations.length) {
        const next = filteredStations[nextIdx];
        setSelectedStation(next);
        if (mapRef.current) {
          mapRef.current.flyTo([next.lat, next.lng], 14, { duration: 1 });
        }
      }
    },
    [selectedStation, filteredStations]
  );

  const selectedIndex = selectedStation
    ? filteredStations.findIndex((s) => s.id === selectedStation.id)
    : -1;

  return {
    selectedStation,
    selectStation,
    clearSelection,
    activeLines,
    toggleLineFilter,
    operationalOnly,
    toggleOperationalOnly,
    filteredStations,
    navigateStation,
    canNavigatePrev: selectedIndex > 0,
    canNavigateNext: selectedIndex >= 0 && selectedIndex < filteredStations.length - 1,
    totalStations: filteredStations.length,
    mapRef,
  };
}
