import React, { useEffect } from "react";
import useLinkTrackerState from "./useLinkTrackerState";
import LinkHeader from "./LinkHeader";
import LineFilterBar from "./LineFilterBar";
import LinkMap from "./LinkMap";
import { DesktopSidebar, MobileBottomSheet } from "./StationSidebar";
import LinkFooter from "./LinkFooter";

const LinkTracker = () => {
  const tracker = useLinkTrackerState();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Link Light Rail Tracker";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-link-bg">
      <LinkHeader />

      <LineFilterBar
        activeLines={tracker.activeLines}
        onToggleLine={tracker.toggleLineFilter}
        operationalOnly={tracker.operationalOnly}
        onToggleOperational={tracker.toggleOperationalOnly}
      />

      {/* Main content: Map + Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row relative" style={{ minHeight: "60vh" }}>
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:flex-col w-96 border-r border-link-border overflow-hidden bg-link-bg">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <DesktopSidebar
              station={tracker.selectedStation}
              onNavigate={tracker.navigateStation}
              totalStations={tracker.totalStations}
              canNavigatePrev={tracker.canNavigatePrev}
              canNavigateNext={tracker.canNavigateNext}
            />
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative" style={{ minHeight: "400px" }}>
          <LinkMap
            selectedStation={tracker.selectedStation}
            activeLines={tracker.activeLines}
            filteredStations={tracker.filteredStations}
            onSelectStation={tracker.selectStation}
            mapRef={tracker.mapRef}
          />
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <div className="lg:hidden">
        <MobileBottomSheet
          station={tracker.selectedStation}
          onNavigate={tracker.navigateStation}
          onClose={tracker.clearSelection}
          totalStations={tracker.totalStations}
          canNavigatePrev={tracker.canNavigatePrev}
          canNavigateNext={tracker.canNavigateNext}
        />
      </div>

      <LinkFooter />
    </div>
  );
};

export default LinkTracker;
