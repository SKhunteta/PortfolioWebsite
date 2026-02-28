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

// Static seed data so the page renders instantly on first visit.
// Silently replaced by live API data once it arrives.
export const FALLBACK_MARKET_DATA = {
  emotions: {
    joy:     { price: 42.10, change:  2.80, signal: "BUY",  reason: "mild optimism in consumer sentiment surveys" },
    grief:   { price: 61.50, change:  4.20, signal: "HOLD", reason: "steady institutional demand from therapy networks" },
    rage:    { price: 18.30, change: -1.40, signal: "SELL", reason: "outrage fatigue after prolonged news cycle" },
    hope:    { price: 29.70, change: -5.10, signal: "SELL", reason: "oversupply — too many feel-good headlines at once" },
    anxiety: { price: 78.90, change:  9.60, signal: "BUY",  reason: "uncertainty premium on mixed economic signals" },
    empathy: { price: 52.40, change:  1.00, signal: "HOLD", reason: "stable futures, locked-in care-industry contracts" },
    apathy:  { price:  8.20, change: -0.50, signal: "SELL", reason: "hard to stay indifferent in the current climate" },
    outrage: { price: 31.60, change:  6.30, signal: "BUY",  reason: "social media amplification keeping demand elevated" },
  },
  headlines: [
    { text: "Markets waver as investors parse mixed jobs data",          emotion: "anxiety", impact: "up"   },
    { text: "Community rallies around local disaster relief effort",     emotion: "empathy", impact: "up"   },
    { text: "Tech layoffs continue amid restructuring wave",            emotion: "grief",   impact: "up"   },
    { text: "Viral social media post reignites policy debate",          emotion: "outrage", impact: "up"   },
    { text: "Scientists announce promising breakthrough in renewables", emotion: "hope",    impact: "down" },
  ],
  market_mood: "A sideways session — traders hedging on uncertainty while the algorithms wait for a catalyst.",
  volatility_index: 58,
};

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
