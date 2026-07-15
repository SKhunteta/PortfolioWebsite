// Dilates downtown Tacoma's building cluster outward from a point on the
// T Line corridor, so the track (TacomaLink.tsx / TacomaTrack.tsx) reads
// with real clearance instead of grazing every footprint. Toy-scale
// license — the same exaggeration the landmark heights already take —
// applied only to the buildings in Landmarks.tsx; the T Line, I-5, and the
// rest of TacomaRoads.tsx stay at their real coordinates, so spreading the
// buildings out only ever widens the gap around them.
const CENTER_LAT = 47.249;
const CENTER_LNG = -122.437;
const SCALE = 1.25;

export function spreadTacoma(lat: number, lng: number): [number, number] {
  return [CENTER_LAT + (lat - CENTER_LAT) * SCALE, CENTER_LNG + (lng - CENTER_LNG) * SCALE];
}
