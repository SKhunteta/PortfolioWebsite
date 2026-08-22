// The Fremont Bridge's openings. The real bridge is the most-opened bascule
// bridge in America — roughly 35 openings a day, a mechanical ballet the ship
// canal performs on demand — EXCEPT during the federal rush-hour restriction
// (weekdays 7–9 am and 4–6 pm, when it need not open for pleasure craft).
//
// The print keeps the same shape at the Seafair honesty tier: openings are a
// deterministic hash over wall-clock slots — two tabs and a reload agree, the
// rush-hour windows genuinely stay shut, and no schedule is printed so
// nothing can lie the way a readout could. The cadence is storybook-
// compressed (an opening lands roughly every quarter hour instead of the
// real ~25–40 minutes) for the same reason the ferries sail faster than
// life: real pace reads as frozen at this distance. It is an estimate about
// the bridge's day, never a claim about a specific boat.
//
// Pure logic, node-safe, vitest-covered (world/__tests__/fremont.test.ts).
// ?bridge=on|off pins it: on loops openings continuously (rush gate lifted)
// for demos and screenshots, off welds the span shut.

import { localHour } from "./traffic";

export interface BridgeState {
  open01: number; // 0 span closed .. 1 leaves fully raised
  // The sailboat that asked: crossing progress 0..1 and direction (+1 sails
  // east→west toward the Locks, -1 west→east toward the lake), or null when
  // the canal under the bridge is empty.
  boat: { t01: number; dir: 1 | -1 } | null;
}

// One slot every 7 minutes; a hashed coin decides whether that slot opens.
export const SLOT_S = 420;
export const OPEN_SHARE = 0.5;

// The opening itself, seconds into the slot: leaves rise, hold while the
// mast glides through, settle back. (Contained well inside the slot.)
const START_S = 40;
const RAISE_S = 16;
const HOLD_S = 110;
const LOWER_S = 16;

// The boat is on the water a little before the leaves move (it is WHY they
// move) and clears just after the hold ends.
const BOAT_START_S = START_S - 24;
const BOAT_END_S = START_S + RAISE_S + HOLD_S + 8;

const ease = (t: number) => t * t * (3 - 2 * t);

/** Deterministic 0..1 from a slot id — the chalk/gumwall hash family. */
function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Seattle-local weekday. Cached by the QUERIED date's epoch hour (local
// midnight always lands on a whole-hour boundary), not by wall time — this
// module answers for arbitrary dates in tests, unlike seafair's now-only read.
const WEEKDAY_FMT =
  typeof Intl !== "undefined"
    ? new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "short" })
    : null;
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const weekdayCache = { hourKey: NaN, value: 0 };

function seattleWeekday(date: Date): number {
  const hourKey = Math.floor(date.getTime() / 3_600_000);
  if (hourKey === weekdayCache.hourKey) return weekdayCache.value;
  weekdayCache.hourKey = hourKey;
  weekdayCache.value = WEEKDAY_FMT ? WEEKDAYS[WEEKDAY_FMT.format(date)] ?? 0 : 0;
  return weekdayCache.value;
}

/** The real restriction: weekdays 7–9 am and 4–6 pm the bridge stays down.
 *  Cached by the queried epoch minute (the windows sit on whole local hours)
 *  so the per-frame caller never pays Intl twice in the same minute. */
const rushCache = { minuteKey: NaN, value: false };

export function rushRestricted(date: Date): boolean {
  const minuteKey = Math.floor(date.getTime() / 60_000);
  if (minuteKey === rushCache.minuteKey) return rushCache.value;
  rushCache.minuteKey = minuteKey;
  const wd = seattleWeekday(date);
  if (wd === 0 || wd === 6) {
    rushCache.value = false;
  } else {
    const h = localHour(date);
    rushCache.value = (h >= 7 && h < 9) || (h >= 16 && h < 18);
  }
  return rushCache.value;
}

function slotState(sIntoSlot: number): BridgeState {
  const upEnd = START_S + RAISE_S;
  const holdEnd = upEnd + HOLD_S;
  const downEnd = holdEnd + LOWER_S;
  let open01 = 0;
  if (sIntoSlot >= START_S && sIntoSlot < upEnd) open01 = ease((sIntoSlot - START_S) / RAISE_S);
  else if (sIntoSlot >= upEnd && sIntoSlot < holdEnd) open01 = 1;
  else if (sIntoSlot >= holdEnd && sIntoSlot < downEnd)
    open01 = 1 - ease((sIntoSlot - holdEnd) / LOWER_S);
  return { open01, boat: null };
}

/** The honest state, no override: where the leaves and the sailboat stand at
 *  this instant. Deterministic from the wall clock — consecutive frames,
 *  other tabs, and a reload all see the same opening mid-swing. */
export function bridgeStateAt(date: Date): BridgeState {
  if (rushRestricted(date)) return { open01: 0, boat: null };
  const epochS = date.getTime() / 1000;
  const slot = Math.floor(epochS / SLOT_S);
  if (hash01(slot) >= OPEN_SHARE) return { open01: 0, boat: null };
  const s = epochS - slot * SLOT_S;
  const state = slotState(s);
  if (s >= BOAT_START_S && s < BOAT_END_S) {
    state.boat = {
      t01: (s - BOAT_START_S) / (BOAT_END_S - BOAT_START_S),
      dir: hash01(slot * 2 + 1) < 0.5 ? 1 : -1,
    };
  }
  return state;
}

type BridgeOverride = "on" | "off" | "open" | null;

function parseOverride(): BridgeOverride {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("bridge");
  if (raw === "" || raw === "on") return "on";
  if (raw === "off") return "off";
  if (raw === "open") return "open";
  return null;
}

let override: BridgeOverride = parseOverride();

export function setBridgeOverride(value: BridgeOverride) {
  override = value;
}

export function bridgeState(date = new Date()): BridgeState {
  if (override === "off") return { open01: 0, boat: null };
  // Held fully raised with the boat mid-cut — a deterministic freeze for
  // screenshots and the smoke harness, like ?reel='s camera pin.
  if (override === "open") return { open01: 1, boat: { t01: 0.5, dir: 1 } };
  if (override === "on") {
    // Demo loop: every slot opens, rush gate lifted, same in-slot choreography.
    const epochS = date.getTime() / 1000;
    const s = epochS - Math.floor(epochS / SLOT_S) * SLOT_S;
    const state = slotState(s);
    if (s >= BOAT_START_S && s < BOAT_END_S) {
      state.boat = {
        t01: (s - BOAT_START_S) / (BOAT_END_S - BOAT_START_S),
        dir: hash01(Math.floor(epochS / SLOT_S) * 2 + 1) < 0.5 ? 1 : -1,
      };
    }
    return state;
  }
  return bridgeStateAt(date);
}
