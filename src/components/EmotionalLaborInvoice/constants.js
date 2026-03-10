export const MODIFIERS = [
  {
    key: "while_working",
    label: "Performed while also doing your actual job",
    multiplier: 1.25,
    surchargeLabel: "Dual-tasking surcharge (1.25\u00d7)",
  },
  {
    key: "code_switching",
    label: "Required code-switching",
    multiplier: 1.5,
    surchargeLabel: "Code-switching surcharge (1.5\u00d7)",
  },
  {
    key: "expected",
    label: "You were not asked, it was expected",
    multiplier: 1.3,
    surchargeLabel: "Unasked labor premium (1.3\u00d7)",
  },
  {
    key: "invisible",
    label: "The other person doesn't know you did this",
    multiplier: 1.4,
    surchargeLabel: "Invisibility tax (1.4\u00d7)",
  },
  {
    key: "suppressed_emotions",
    label: "You had to suppress your own emotions to do it",
    multiplier: 2.0,
    surchargeLabel: "Emotional suppression fee (2.0\u00d7)",
  },
  {
    key: "recurring",
    label: "This labor is recurring (weekly/daily)",
    multiplier: 1.75,
    surchargeLabel: "Recurring labor surcharge (1.75\u00d7)",
  },
  {
    key: "language_barrier",
    label: "Performed across a language barrier",
    multiplier: 1.5,
    surchargeLabel: "Cross-linguistic premium (1.5\u00d7)",
  },
  {
    key: "power_imbalance",
    label: "Performed for someone with more institutional power than you",
    multiplier: 1.35,
    surchargeLabel: "Power differential adjustment (1.35\u00d7)",
  },
  {
    key: "unacknowledged",
    label: "Service was not acknowledged by recipient",
    multiplier: 1.25,
    surchargeLabel: "Non-acknowledgment adjustment (1.25\u00d7)",
  },
];

export const DURATIONS = [
  "5 min",
  "15 min",
  "30 min",
  "1 hour",
  "2 hours",
  "Half a day",
  "All day",
  "Ongoing",
  "Years",
];

export const CLIENT_GHOST_TEXTS = [
  "My employer",
  "American society",
  "My father",
  "The healthcare system",
  "A stranger on the bus",
  "My partner's family",
  "Nobody in particular, everybody in general",
];

export const SERVICE_GHOST_TEXT =
  "Translated my mother's symptoms to the ER nurse while she cried and the nurse looked at the clock";
