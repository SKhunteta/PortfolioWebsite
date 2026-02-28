import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  useMap,
} from "react-leaflet";
import { LOCATIONS, ALBUMS } from "./constants";
import "leaflet/dist/leaflet.css";

const MapRefSetter = ({ mapRef }) => {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
};

const AtlasMap = ({
  selectedLocation,
  activeAlbums,
  onSelectLocation,
  journeyPath,
  mapRef,
  config,
}) => {
  return (
    <MapContainer
      center={config.center}
      zoom={config.zoom}
      minZoom={config.minZoom}
      maxZoom={config.maxZoom}
      style={{ width: "100%", height: "100%", minHeight: "400px" }}
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <MapRefSetter mapRef={mapRef} />
      <TileLayer url={config.tileUrl} attribution={config.tileAttribution} />

      {LOCATIONS.map((loc) => {
        const isActive = activeAlbums.has(loc.album);
        const isSelected = selectedLocation?.id === loc.id;
        const album = ALBUMS[loc.album];

        return (
          <CircleMarker
            key={loc.id}
            center={[loc.lat, loc.lng]}
            radius={isSelected ? 10 : 6}
            fillColor={album.color}
            fillOpacity={isActive ? 0.9 : 0.15}
            color={isSelected ? "#2C2C2C" : album.color}
            weight={isSelected ? 2.5 : 1}
            opacity={isActive ? 1 : 0.2}
            eventHandlers={{
              click: () => onSelectLocation(loc.id),
            }}
          >
          </CircleMarker>
        );
      })}

      {journeyPath.length > 1 && (
        <Polyline
          positions={journeyPath}
          color="#2C2C2C"
          weight={2}
          dashArray="6 4"
          opacity={0.5}
        />
      )}
    </MapContainer>
  );
};

export default AtlasMap;
