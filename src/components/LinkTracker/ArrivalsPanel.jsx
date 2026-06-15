import React, { useEffect, useState } from "react";
import { LINES } from "./constants";
import { API_ENDPOINTS } from "../../config/api";

const POLL_INTERVAL_MS = 30 * 1000;

// Live arrivals for an open station, via the backend OneBusAway proxy.
// The proxy returns { available: false } when no API key is configured or
// upstream data is unavailable; in that case the panel renders nothing.
const ArrivalsPanel = ({ station, compact = false }) => {
  const [state, setState] = useState({ loading: true, arrivals: null });

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const load = async () => {
      try {
        const res = await fetch(
          `${API_ENDPOINTS.linkArrivals}/${encodeURIComponent(station.id)}` +
            `?lat=${station.lat}&lng=${station.lng}`
        );
        const data = await res.json();
        if (cancelled) return;
        setState({
          loading: false,
          arrivals: data.available ? data.arrivals : null,
        });
      } catch {
        if (!cancelled) setState({ loading: false, arrivals: null });
      }
      timer = setTimeout(load, POLL_INTERVAL_MS);
    };

    setState({ loading: true, arrivals: null });
    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [station.id, station.lat, station.lng]);

  // Only show Link trains. Guards against non-Link routes (e.g. RapidRide
  // buses, which share the "<letter> Line" naming) slipping onto the board.
  const trains = (state.arrivals || []).filter((a) =>
    Object.values(LINES).some((l) => l.name === a.line)
  );

  if (state.loading || trains.length === 0) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border border-link-border bg-white/60 ${
        compact ? "p-2.5" : "p-3"
      }`}
    >
      <p
        className={`font-semibold text-link-text font-sans mb-1.5 ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        Next departures
      </p>
      <ul className="space-y-1">
        {trains.slice(0, 6).map((a, i) => {
          const line = Object.values(LINES).find((l) => l.name === a.line);
          return (
            <li
              key={i}
              className={`flex items-center gap-2 font-sans text-link-text-secondary ${
                compact ? "text-xs" : "text-sm"
              }`}
            >
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold shrink-0"
                style={{ backgroundColor: line?.color || "#8899AA" }}
              >
                {line?.shortName || "?"}
              </span>
              <span className="flex-1 truncate">{a.headsign}</span>
              <span className="font-semibold text-link-text shrink-0">
                {a.minutes <= 0 ? "Now" : `${a.minutes} min`}
              </span>
              {!a.realtime && (
                <span className="text-[10px] text-link-text-muted shrink-0">
                  (sched)
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ArrivalsPanel;
