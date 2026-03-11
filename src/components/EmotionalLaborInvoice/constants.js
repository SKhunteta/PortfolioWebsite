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
  {
    key: "sleep_deprived",
    label: "Performed while sleep-deprived",
    multiplier: 1.3,
    surchargeLabel: "Sleep deprivation surcharge (1.3\u00d7)",
  },
  {
    key: "personal_crisis",
    label: "During a personal crisis",
    multiplier: 1.6,
    surchargeLabel: "Personal crisis premium (1.6\u00d7)",
  },
  {
    key: "unreciprocated",
    label: "For someone who wouldn't do the same",
    multiplier: 1.45,
    surchargeLabel: "Non-reciprocity adjustment (1.45\u00d7)",
  },
];

export const PRESET_SCENARIOS = [
  {
    label: "Holiday dinner with family",
    client: "My family",
    description:
      "Navigated politically charged dinner conversation while maintaining the illusion that everything is fine, mediated two simmering conflicts, and performed enthusiastic gratitude for a meal I didn\u2019t ask for.",
    duration: "Half a day",
    emotions: ["empathy", "anxiety", "apathy"],
  },
  {
    label: "Being the only ___ in the room",
    client: "The institution",
    description:
      "Represented an entire demographic in a meeting where no one noticed my discomfort, fielded \u2018innocent\u2019 questions, and smiled through microaggressions to keep my professional reputation intact.",
    duration: "2 hours",
    emotions: ["rage", "anxiety", "empathy"],
  },
  {
    label: "Unpaid therapy for a friend",
    client: "A close friend",
    description:
      "Listened to a 90-minute crisis call, offered thoughtful advice that will be ignored, and validated feelings I wasn\u2019t allowed to have about the situation.",
    duration: "1 hour",
    emotions: ["empathy", "grief", "hope"],
  },
  {
    label: "Managing someone\u2019s feelings about your boundary",
    client: "Someone who should know better",
    description:
      "Set a boundary, then spent twice as long comforting the other person about how the boundary made them feel.",
    duration: "2 hours",
    emotions: ["rage", "empathy", "anxiety"],
  },
  {
    label: "Explaining your existence",
    client: "A well-meaning stranger",
    description:
      "Patiently educated someone about a basic aspect of your lived experience they could have googled, while performing gratitude for their curiosity.",
    duration: "30 min",
    emotions: ["apathy", "rage", "empathy"],
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
