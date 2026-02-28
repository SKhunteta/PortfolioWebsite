export const EMOTIONS = {
  joy: {
    name: "Joy",
    icon: "\u2600",
    accentColor: "#F59E0B",
    description: "The scarcest luxury. Professionals who produce it burn out fastest.",
  },
  grief: {
    name: "Grief",
    icon: "\u25C6",
    accentColor: "#3B82F6",
    description: "The backbone of the market. Always in demand.",
  },
  rage: {
    name: "Rage",
    icon: "\u26A1",
    accentColor: "#EF4444",
    description: "Powers customer service escalation algorithms.",
  },
  hope: {
    name: "Hope",
    icon: "\u25B3",
    accentColor: "#10B981",
    description: "Volatile. Floods the market after good news, crashes during crises.",
  },
  anxiety: {
    name: "Anxiety",
    icon: "\u25C8",
    accentColor: "#F97316",
    description: "The most expensive emotion in uncertain times.",
  },
  empathy: {
    name: "Empathy",
    icon: "\u2661",
    accentColor: "#8B5CF6",
    description: "Gets scarce and expensive during outrage cycles.",
  },
  apathy: {
    name: "Apathy",
    icon: "\u2014",
    accentColor: "#9CA3AF",
    description: "Cheap and abundant on boring news days.",
  },
  outrage: {
    name: "Outrage",
    icon: "\uD83D\uDD25",
    accentColor: "#DC2626",
    description: "The market's stimulant. Easy to produce, hard to sustain.",
  },
};

export const EMOTION_ORDER = [
  "joy",
  "grief",
  "rage",
  "hope",
  "anxiety",
  "empathy",
  "apathy",
  "outrage",
];

export function getSignalStyle(signal) {
  switch (signal?.toUpperCase()) {
    case "BUY":
      return "border-ele-up text-ele-up bg-emerald-50";
    case "SELL":
      return "border-ele-down text-ele-down bg-red-50";
    case "HOLD":
    default:
      return "border-ele-text-tertiary text-ele-text-tertiary bg-gray-50";
  }
}
