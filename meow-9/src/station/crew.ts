// The duty crew — MEOW-9 doesn't run itself. Five uniformed professionals
// keep the hab breathing; everyone else is a resident of leisure (the two
// collared girls first among them — they don't wear uniforms, they OWN the
// place). Each crew cat wears a service harness in her section's color and
// holds a duty post she actually walks to and works between naps.

export type CrewRole = "commander" | "engineer" | "medic" | "comms" | "botanist";

export interface DutyPost {
  x: number; // where she sits — just outside her console's collider
  z: number;
  faceX: number; // what she faces while on shift
  faceZ: number;
}

export interface CrewMember {
  role: CrewRole;
  name: string;
  title: string; // roster-board shorthand
  cloth: string; // harness fabric (matte, reads on black fur)
  light: string; // service-light emissive (kept under the 1.05 bloom threshold)
  post: DutyPost;
}

// Station zones — the single source for console footprints. colliders.ts
// derives the furniture circles from these and Room.tsx builds the props at
// them, so a console can never drift away from its own collider.
export const ZONES = {
  command: { x: 0, z: -4.35 }, // under the porthole — the conn faces the room
  engineering: { x: -6.35, z: 1.4 }, // spin-governor console, -x wall
  medbay: { x: 6.05, z: -2.9 }, // scanner bed, +x wall
  comms: { x: -1.8, z: 4.55 }, // antenna rig, front wall
  hydroponics: { x: -6.4, z: -3.5 }, // catnip rack, -x wall
  cargo: { x: 3.9, z: -4.25 }, // crate stack, back-right corner
} as const;

export const CREW: CrewMember[] = [
  {
    role: "commander",
    name: "BAST",
    title: "COMMANDER",
    cloth: "#8a6a1f",
    light: "#ffb02a",
    post: { x: 0, z: -3.55, faceX: ZONES.command.x, faceZ: ZONES.command.z },
  },
  {
    role: "engineer",
    name: "KEPLER",
    title: "SPIN ENGINEER",
    cloth: "#8a4a1c",
    light: "#ff8a3a",
    post: { x: -5.6, z: 1.4, faceX: ZONES.engineering.x, faceZ: ZONES.engineering.z },
  },
  {
    role: "medic",
    name: "MISO",
    title: "MEDICAL",
    cloth: "#9fc4bc",
    light: "#5effc9",
    post: { x: 5.25, z: -2.9, faceX: ZONES.medbay.x, faceZ: ZONES.medbay.z },
  },
  {
    role: "comms",
    name: "STATIC",
    title: "COMMS",
    cloth: "#1f5f86",
    light: "#5ee9ff",
    post: { x: -1.8, z: 3.8, faceX: ZONES.comms.x, faceZ: ZONES.comms.z },
  },
  {
    role: "botanist",
    name: "CLOVER",
    title: "HYDROPONICS",
    cloth: "#2e6b3a",
    light: "#7dffb0",
    post: { x: -5.65, z: -3.5, faceX: ZONES.hydroponics.x, faceZ: ZONES.hydroponics.z },
  },
];

// Crew occupies roster slots 2..6 — inside the touch profile's 10-cat cut,
// so phones get the full crew too. Slots 0/1 are the girls.
export const CREW_INDEX_BASE = 2;

export const CREW_BY_ROLE = Object.fromEntries(CREW.map((m) => [m.role, m])) as Record<
  CrewRole,
  CrewMember
>;
