import type { Mesh } from "three";

// Every surface the laser pointer can land on registers itself here (walls,
// deck, ceiling, furniture tops). One shared array so the pointer does a
// single manual raycast per frame instead of per-mesh R3F event handlers.
export const laserSurfaces: Mesh[] = [];

/** Ref callback — attach as `ref={registerSurface}` on any laser-target mesh. */
export function registerSurface(m: Mesh | null): void {
  if (m && !laserSurfaces.includes(m)) laserSurfaces.push(m);
}
