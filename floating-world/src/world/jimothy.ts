// Jimothy, the round raccoon of Ballard. In July 2026 a raccoon with
// short-spine syndrome — torso almost spherical, no neck to speak of, and
// famously spry with it — was filmed one evening near the Ballard Goodwill
// and became the neighborhood's beloved celebrity. He lives in the print as
// resident ambient life at the crows' honesty tier: no calendar, no live
// sightings, just the crepuscular hours a raccoon actually keeps —
// deterministic from the scene clock, never presented as a report.
//
// ?jimothy=on|off pins him for demos, tests and screenshots.

function parseOverride(): boolean | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("jimothy");
  if (raw == null) return null;
  return raw !== "off" && raw !== "0" && raw !== "none";
}

let override: boolean | null = parseOverride();

export function setJimothyOverride(value: boolean | null) {
  override = value;
}

export function jimothyOverride(): boolean | null {
  return override;
}
