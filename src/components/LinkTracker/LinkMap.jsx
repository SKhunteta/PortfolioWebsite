import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  STATIONS,
  LINES,
  MAP_CONFIG,
  ERAS,
  CURRENT_PATHS,
  FUTURE_PATHS,
  LINES_FOR_ERA,
  stationLinesForEra,
} from "./constants";
import "leaflet/dist/leaflet.css";

const MapRefSetter = ({ mapRef }) => {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
};

// At/above this zoom, dots keep their full size; below it they shrink toward
// RADIUS_FLOOR so the network stops collapsing into an overlapping blob.
const RADIUS_BASE_ZOOM = MAP_CONFIG.zoom;
const RADIUS_FLOOR = 0.4;

// Linear scale in [RADIUS_FLOOR, 1] driven by how far the current zoom sits
// between minZoom and the baseline zoom.
const radiusScale = (zoom) => {
  if (zoom >= RADIUS_BASE_ZOOM) return 1;
  const span = RADIUS_BASE_ZOOM - MAP_CONFIG.minZoom;
  if (span <= 0) return 1;
  const t = (zoom - MAP_CONFIG.minZoom) / span; // 0 at minZoom, 1 at baseline
  return RADIUS_FLOOR + (1 - RADIUS_FLOOR) * Math.max(0, Math.min(1, t));
};

// Tracks the live zoom level so markers can rescale as the user zooms.
const ZoomWatcher = ({ onZoom }) => {
  const map = useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
  });
  return null;
};

const LinkMap = ({
  era,
  selectedStation,
  activeLines,
  filteredStations,
  onSelectStation,
  mapRef,
}) => {
  const filteredIds = new Set(filteredStations.map((s) => s.id));
  const [zoom, setZoom] = useState(MAP_CONFIG.zoom);
  const scale = radiusScale(zoom);

  // Normalize both path shapes to segments of { status, points }.
  const segmentsForLine = (lineId) => {
    if (era === ERAS.CURRENT) {
      const path = CURRENT_PATHS[lineId];
      return path ? path.map((points) => ({ status: "open", points })) : [];
    }
    return FUTURE_PATHS[lineId] || [];
  };

  return (
    <MapContainer
      center={MAP_CONFIG.center}
      zoom={MAP_CONFIG.zoom}
      minZoom={MAP_CONFIG.minZoom}
      maxZoom={MAP_CONFIG.maxZoom}
      className="absolute inset-0 z-0"
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <MapRefSetter mapRef={mapRef} />
      <ZoomWatcher onZoom={setZoom} />
      <TileLayer url={MAP_CONFIG.tileUrl} attribution={MAP_CONFIG.tileAttribution} />

      {LINES_FOR_ERA[era].map((lineId) => {
        if (!activeLines.has(lineId)) return null;
        const line = LINES[lineId];
        return segmentsForLine(lineId).map((segment, i) => (
          <Polyline
            key={`${era}-${lineId}-${i}`}
            positions={segment.points}
            color={line.color}
            weight={3}
            opacity={segment.status === "planned" ? 0.55 : 0.75}
            dashArray={segment.status === "planned" ? "6 8" : null}
          />
        ));
      })}

      {STATIONS.map((station) => {
        const stationLines = stationLinesForEra(station, era);
        if (stationLines.length === 0) return null;
        const isFiltered = filteredIds.has(station.id);
        const isSelected = selectedStation?.id === station.id;
        const primaryLine = LINES[stationLines[0]];
        const isMultiLine = stationLines.length > 1;
        const isOpen = station.status === "open";

        return (
          <CircleMarker
            key={`${era}-${station.id}`}
            center={[station.lat, station.lng]}
            radius={(isSelected ? 10 : isMultiLine ? 7 : 6) * scale}
            fillColor={isOpen ? primaryLine.color : "#FFFFFF"}
            fillOpacity={isFiltered ? (isOpen ? 0.9 : 0.8) : 0.15}
            color={
              isSelected
                ? "#1A2B3C"
                : isOpen
                  ? isMultiLine
                    ? "#FFFFFF"
                    : primaryLine.color
                  : primaryLine.color
            }
            weight={
              (isSelected ? 2.5 : isOpen ? (isMultiLine ? 2 : 1) : 2) *
              Math.max(0.6, scale)
            }
            opacity={isFiltered ? 1 : 0.2}
            eventHandlers={{
              click: () => onSelectStation(station.id),
              keypress: (e) => {
                if (e.originalEvent.key === "Enter") onSelectStation(station.id);
              },
              add: (e) => {
                const el = e.target.getElement?.();
                if (el) {
                  el.setAttribute("tabindex", "0");
                  el.setAttribute("role", "button");
                  el.setAttribute(
                    "aria-label",
                    `${station.name} station${isOpen ? "" : ` (${station.status})`}`
                  );
                }
              },
            }}
          />
        );
      })}
    </MapContainer>
  );
};

export default LinkMap;
