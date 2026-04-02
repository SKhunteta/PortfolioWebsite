import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  useMap,
} from "react-leaflet";
import { STATIONS, LINES, LINE_ORDER, LINE_PATHS, MAP_CONFIG } from "./constants";
import "leaflet/dist/leaflet.css";

const MapRefSetter = ({ mapRef }) => {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
};

const LinkMap = ({
  selectedStation,
  activeLines,
  filteredStations,
  onSelectStation,
  mapRef,
}) => {
  const filteredIds = new Set(filteredStations.map((s) => s.id));

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
      <TileLayer url={MAP_CONFIG.tileUrl} attribution={MAP_CONFIG.tileAttribution} />

      {LINE_ORDER.map((lineId) => {
        if (!activeLines.has(lineId)) return null;
        const line = LINES[lineId];
        const path = LINE_PATHS[lineId];
        if (!path) return null;
        return (
          <Polyline
            key={lineId}
            positions={path}
            color={line.color}
            weight={3}
            opacity={0.7}
          />
        );
      })}

      {STATIONS.map((station) => {
        const isFiltered = filteredIds.has(station.id);
        const isSelected = selectedStation?.id === station.id;
        const primaryLine = LINES[station.lines[0]];
        const isMultiLine = station.lines.length > 1;

        return (
          <CircleMarker
            key={station.id}
            center={[station.lat, station.lng]}
            radius={isSelected ? 10 : isMultiLine ? 7 : 6}
            fillColor={primaryLine.color}
            fillOpacity={isFiltered ? 0.9 : 0.15}
            color={isSelected ? "#1A2B3C" : isMultiLine ? "#FFFFFF" : primaryLine.color}
            weight={isSelected ? 2.5 : isMultiLine ? 2 : 1}
            opacity={isFiltered ? 1 : 0.2}
            eventHandlers={{
              click: () => onSelectStation(station.id),
            }}
          />
        );
      })}
    </MapContainer>
  );
};

export default LinkMap;
