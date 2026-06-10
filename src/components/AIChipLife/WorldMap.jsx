import React, { useMemo } from "react";
import { MAP_W, MAP_H, project, projectFocus } from "./projection";
import { CONTINENTS } from "./worldGeometry";
import { SCENES } from "./scenes";

const pathFor = (points) =>
  points
    .map(([lng, lat], i) => {
      const { x, y } = project(lng, lat);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ") + " Z";

// Pins, computed once, in map coordinates (including the +360 copy offset).
const PINS = SCENES.filter((s) => s.mapMode === "geographic" && !s.crossing).map((s) => ({
  id: s.id,
  ...projectFocus(s.focus),
  place: s.place,
}));

const CROSS_START = projectFocus({ lng: 127.4, lat: 37.4, copy: 0 }); // Korea
const CROSS_END = projectFocus({ lng: -119.85, lat: 47.23, copy: 1 }); // Quincy

// A duplicated copy of the continents lets the camera wrap across the
// antimeridian for the Pacific crossing without animating the viewBox.
const Continents = ({ offset }) => (
  <g transform={`translate(${offset},0)`}>
    {CONTINENTS.map((c) => (
      <path
        key={c.id}
        d={pathFor(c.points)}
        fill="#DCD6CC"
        stroke="#C4BCAE"
        strokeWidth="0.4"
        strokeLinejoin="round"
      />
    ))}
  </g>
);

const WorldMap = ({ focus, zoom, crossing = false, crossProgress = 0, reducedMotion = false, activeId }) => {
  const tx = 180 - zoom * focus.x;
  const ty = 90 - zoom * focus.y;

  const transform = `translate(${tx}px, ${ty}px) scale(${zoom})`;
  const transition = reducedMotion ? "none" : "transform 1.3s cubic-bezier(0.22, 1, 0.36, 1)";

  // Chip token position during the crossing, interpolated in map space.
  const token = useMemo(() => {
    const p = Math.max(0, Math.min(1, crossProgress));
    const x = CROSS_START.x + (CROSS_END.x - CROSS_START.x) * p;
    // A shallow arc north over the Pacific.
    const baseY = CROSS_START.y + (CROSS_END.y - CROSS_START.y) * p;
    const y = baseY - Math.sin(p * Math.PI) * 14;
    return { x, y, p };
  }, [crossProgress]);

  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
      style={{ backgroundColor: "#F3EFE8" }}
    >
      <g style={{ transform, transformOrigin: "0 0", transition }}>
        <Continents offset={0} />
        <Continents offset={MAP_W} />

        {/* Faint route line between consecutive geographic scenes. */}
        <polyline
          points={PINS.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#B9AE9C"
          strokeWidth={0.5 / Math.max(zoom, 1)}
          strokeDasharray="2 2"
          opacity="0.7"
        />

        {PINS.map((p) => {
          const active = p.id === activeId;
          return (
            <g key={p.id}>
              {active && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={3.2 / Math.max(zoom, 1)}
                  fill="none"
                  stroke="#1A1A1A"
                  strokeWidth={0.6 / Math.max(zoom, 1)}
                  opacity="0.5"
                />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={1.4 / Math.max(zoom, 1)}
                fill={active ? "#1A1A1A" : "#8C8378"}
              />
            </g>
          );
        })}

        {/* The completed chip, crossing the Pacific. */}
        {crossing && (
          <g transform={`translate(${token.x},${token.y})`}>
            <line
              x1={CROSS_START.x - token.x}
              y1={CROSS_START.y - token.y}
              x2={0}
              y2={0}
              stroke="#1A1A1A"
              strokeWidth={0.5 / Math.max(zoom, 1)}
              strokeDasharray="1.5 1.5"
              opacity="0.45"
            />
            <g transform={`scale(${1 / Math.max(zoom, 1)})`}>
              <rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="0.8" fill="#1A1A1A" />
              <rect x="-1.7" y="-1.7" width="3.4" height="3.4" rx="0.4" fill="#5BC0BE" />
            </g>
          </g>
        )}
      </g>
    </svg>
  );
};

export default WorldMap;
