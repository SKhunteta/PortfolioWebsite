import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  STATIONS,
  ERAS,
  LINES_FOR_ERA,
  stationLinesForEra,
  stationVisibleInEra,
} from "./constants";

export default function useLinkTrackerState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [era, setEraState] = useState(() =>
    searchParams.get("view") === "future" ? ERAS.FUTURE : ERAS.CURRENT
  );
  const [activeLines, setActiveLines] = useState(
    () => new Set(LINES_FOR_ERA[era])
  );
  const [selectedStation, setSelectedStation] = useState(() => {
    const id = searchParams.get("station");
    return STATIONS.find((s) => s.id === id) || null;
  });
  const mapRef = useRef(null);

  // Keep the URL shareable: /link-tracker?view=future&station=westlake
  useEffect(() => {
    const params = {};
    if (era === ERAS.FUTURE) params.view = "future";
    if (selectedStation) params.station = selectedStation.id;
    setSearchParams(params, { replace: true });
  }, [era, selectedStation, setSearchParams]);

  const filteredStations = useMemo(() => {
    return STATIONS.filter((s) => {
      if (!stationVisibleInEra(s, era)) return false;
      return stationLinesForEra(s, era).some((l) => activeLines.has(l));
    });
  }, [activeLines, era]);

  const flyTo = useCallback((station) => {
    if (station && mapRef.current) {
      mapRef.current.flyTo([station.lat, station.lng], 14, { duration: 1 });
    }
  }, []);

  const selectStation = useCallback(
    (stationId) => {
      const station = STATIONS.find((s) => s.id === stationId) || null;
      setSelectedStation(station);
      flyTo(station);
    },
    [flyTo]
  );

  const clearSelection = useCallback(() => setSelectedStation(null), []);

  const setEra = useCallback((nextEra) => {
    setEraState(nextEra);
    setActiveLines(new Set(LINES_FOR_ERA[nextEra]));
    setSelectedStation((prev) =>
      prev && stationVisibleInEra(prev, nextEra) ? prev : null
    );
  }, []);

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

  const navigateStation = useCallback(
    (direction) => {
      if (!selectedStation) return;
      const idx = filteredStations.findIndex(
        (s) => s.id === selectedStation.id
      );
      if (idx === -1) return;
      const nextIdx = idx + direction;
      if (nextIdx >= 0 && nextIdx < filteredStations.length) {
        const next = filteredStations[nextIdx];
        setSelectedStation(next);
        flyTo(next);
      }
    },
    [selectedStation, filteredStations, flyTo]
  );

  const selectedIndex = selectedStation
    ? filteredStations.findIndex((s) => s.id === selectedStation.id)
    : -1;

  return {
    era,
    setEra,
    selectedStation,
    selectStation,
    clearSelection,
    activeLines,
    toggleLineFilter,
    filteredStations,
    navigateStation,
    canNavigatePrev: selectedIndex > 0,
    canNavigateNext:
      selectedIndex >= 0 && selectedIndex < filteredStations.length - 1,
    totalStations: filteredStations.length,
    mapRef,
  };
}
