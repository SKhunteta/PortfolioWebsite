import React from "react";
import useAtlasState from "./useAtlasState";
import { ALBUMS, ALBUM_ORDER, MAP_CONFIG } from "./constants";
import AtlasHeader from "./AtlasHeader";
import AlbumFilterBar from "./AlbumFilterBar";
import AtlasMap from "./AtlasMap";
import { DesktopSidebar, MobileBottomSheet } from "./LyricSidebar";
import TimelineBar from "./TimelineBar";
import JourneyControls from "./JourneyControls";
import AtlasFooter from "./AtlasFooter";

const AaronWestAtlas = () => {
  const atlas = useAtlasState();

  return (
    <div className="min-h-screen flex flex-col bg-atlas-bg">
      <AtlasHeader />

      <AlbumFilterBar
        albums={ALBUMS}
        albumOrder={ALBUM_ORDER}
        activeAlbums={atlas.activeAlbums}
        onToggle={atlas.toggleAlbumFilter}
      />

      {/* Main content: Map + Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden" style={{ height: "calc(100vh - 160px)" }}>
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:flex-col w-96 shrink-0 border-r border-atlas-border bg-atlas-bg">
          <div className="flex-1 overflow-y-auto">
            <DesktopSidebar
              location={atlas.selectedLocation}
              onNavigate={atlas.navigateLocation}
              journeyActive={atlas.journeyActive}
              totalLocations={atlas.totalLocations}
            />
          </div>
          <JourneyControls
            journeyActive={atlas.journeyActive}
            journeyIndex={atlas.journeyIndex}
            onStart={atlas.startJourney}
            onStop={atlas.stopJourney}
            totalLocations={atlas.totalLocations}
          />
        </div>

        {/* Map */}
        <div className="flex-1 relative h-full">
          <AtlasMap
            selectedLocation={atlas.selectedLocation}
            activeAlbums={atlas.activeAlbums}
            onSelectLocation={atlas.selectLocation}
            journeyPath={atlas.journeyPath}
            mapRef={atlas.mapRef}
            config={MAP_CONFIG}
          />

          {/* Mobile journey controls - floating overlay */}
          <div className="lg:hidden absolute bottom-4 left-4 right-4 z-[999]">
            <div className="bg-atlas-bg/95 backdrop-blur-sm rounded-lg shadow-custom-lg border border-atlas-border">
              <JourneyControls
                journeyActive={atlas.journeyActive}
                journeyIndex={atlas.journeyIndex}
                onStart={atlas.startJourney}
                onStop={atlas.stopJourney}
                totalLocations={atlas.totalLocations}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <div className="lg:hidden">
        <MobileBottomSheet
          location={atlas.selectedLocation}
          onNavigate={atlas.navigateLocation}
          onClose={atlas.clearSelection}
          journeyActive={atlas.journeyActive}
          totalLocations={atlas.totalLocations}
        />
      </div>

      <TimelineBar
        selectedLocation={atlas.selectedLocation}
        activeAlbums={atlas.activeAlbums}
        onSelect={atlas.selectLocation}
        journeyIndex={atlas.journeyIndex}
        journeyActive={atlas.journeyActive}
      />

      <AtlasFooter />
    </div>
  );
};

export default AaronWestAtlas;
