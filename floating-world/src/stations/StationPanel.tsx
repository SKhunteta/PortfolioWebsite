// The reading layer. Rest on a station (hover on desktop, tap on touch) and a
// quiet card fades up: the place's name and neighborhood, what the real
// station looks like (stations/identity.ts — the researched architecture and
// signature art), one whispered fact, and — derived live from the trains on
// screen — what's inbound and how far out. DOM, outside the canvas,
// pointer-transparent so it never eats a drag.
//
// The in-world sprite (Labels.tsx) still floats the name at the station; this
// is the marginalia beside it, not a replacement.

import { useEffect, useRef, useState } from "react";
import { useUi } from "../trains/store";
import { STATION_BY_ID } from "../map/network";
import { INPUT_TOUCH } from "../world/device";
import { loreForName, openedYear, StationLore } from "./lore";
import { identityForName, StationIdentity } from "./identity";
import { arrivalsForStation, formatEta, Arrival } from "./arrivals";

interface PanelData {
  id: string;
  name: string;
  neighborhood?: string;
  openedYear: string | null;
  whisper?: string;
  accent?: string;
  structure?: string;
  look?: string;
  art?: string;
}

// The researched platform configuration, in plain words.
const STRUCTURE_LABEL: Record<StationIdentity["structure"], string> = {
  elevated: "elevated",
  underground: "underground",
  "at-grade": "street level",
};

function buildData(id: string): PanelData | null {
  const station = STATION_BY_ID.get(id);
  if (!station) return null;
  const lore: StationLore | null = loreForName(station.name);
  const identity = identityForName(station.name);
  return {
    id,
    name: station.name,
    neighborhood: lore?.neighborhood,
    openedYear: openedYear(lore),
    // The fact is the better whisper; the blurb is the fallback voice.
    whisper: lore?.notableFact ?? lore?.blurb,
    accent: identity?.accent,
    structure: identity ? STRUCTURE_LABEL[identity.structure] : undefined,
    look: identity?.look,
    art: identity?.art,
  };
}

export function StationPanel() {
  const hoverId = useUi((s) => s.hoverStationId);
  const setHoverStation = useUi((s) => s.setHoverStation);
  // `data` persists through the fade-out so the card doesn't blank mid-dissolve.
  const [data, setData] = useState<PanelData | null>(null);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const open = hoverId != null;
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dismiss with Escape too — a keyboard way out to match the tap-away and the
  // close button (the tap-opened card was easy to open, hard to leave).
  useEffect(() => {
    if (hoverId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHoverStation(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hoverId, setHoverStation]);

  useEffect(() => {
    if (hoverId == null) {
      // Hold the last card briefly so the opacity transition has something to
      // fade; then release it.
      clearTimer.current = setTimeout(() => setData(null), 600);
      return () => {
        if (clearTimer.current) clearTimeout(clearTimer.current);
      };
    }
    if (clearTimer.current) clearTimeout(clearTimer.current);
    setData(buildData(hoverId));
  }, [hoverId]);

  // Poll the derived board while a station is open. 1 Hz is plenty — the ETAs
  // shift by seconds and the trains are already animating underneath.
  useEffect(() => {
    if (hoverId == null) return;
    const tick = () => setArrivals(arrivalsForStation(hoverId));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [hoverId]);

  if (!data) return null;

  const sub = [data.neighborhood, data.structure, data.openedYear ? `opened ${data.openedYear}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={`station-panel ${open ? "station-panel-open" : ""}`}
      style={data.accent ? { borderLeftColor: data.accent } : undefined}
    >
      {/* Tap opened this card; give touch an obvious way to close it (desktop
          dismisses on hover-out). */}
      {INPUT_TOUCH && (
        <button
          type="button"
          className="station-panel-close"
          aria-label="Close station panel"
          onClick={() => setHoverStation(null)}
        >
          ×
        </button>
      )}
      <div className="station-panel-name">
        {data.accent && (
          <span className="station-panel-swatch" style={{ background: data.accent }} />
        )}
        {data.name}
      </div>
      {sub && <div className="station-panel-sub">{sub}</div>}

      {data.look && <p className="station-panel-look">{data.look}</p>}
      {data.whisper && <p className="station-panel-whisper">{data.whisper}</p>}
      {data.art && <div className="station-panel-art">{data.art}</div>}

      {arrivals.length > 0 && (
        <ul className="station-panel-arrivals">
          {arrivals.slice(0, 4).map((a) => (
            <li key={`${a.lineId}:${a.headsign}`}>
              <span className="station-panel-line" style={{ background: a.color }} />
              <span className="station-panel-dest">{a.headsign}</span>
              <span className="station-panel-eta">{formatEta(a)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
