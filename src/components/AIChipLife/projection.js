// Equirectangular projection for the inline SVG world map.
// viewBox is "0 0 360 180", so one user unit equals one degree.
// x = lng + 180, y = 90 - lat. The map group is rendered twice (a copy at
// x + 360) so the camera can wrap across the antimeridian for the Pacific
// crossing in scene 7 without animating the viewBox.

export const MAP_W = 360;
export const MAP_H = 180;

export const project = (lng, lat) => ({ x: lng + 180, y: 90 - lat });

// Project a scene focus that may live in the duplicated copy of the world
// (copy: 0 = primary map, 1 = the copy offset by +360 to the east).
export const projectFocus = ({ lng, lat, copy = 0 }) => {
  const { x, y } = project(lng, lat);
  return { x: x + copy * MAP_W, y };
};
