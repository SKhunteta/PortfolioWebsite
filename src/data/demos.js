// Single source of truth for the interactive demos ("the Playground").
// Consumed by the Playground index page, the homepage, the navbar, and the
// footer so titles, routes, and theming never drift between surfaces.

export const GITHUB_REPO_URL = "https://github.com/SKhunteta/PortfolioWebsite";

export const sourceUrl = (demo) =>
  `${GITHUB_REPO_URL}/tree/main/${demo.sourceDir}`;

// The four emotional-labor experiments share a fictional universe; the
// Playground groups them under this banner instead of listing them as
// four unrelated cards.
export const HAPPINESS_LIABILITY_SERIES = {
  id: "happiness-liability",
  title: "The Happiness Liability",
  description:
    "Four experiments from the world of the novella The Happiness Liability — a near future where human feeling is measured, traded, and billed.",
};

export const DEMOS = [
  {
    id: "ai-chip",
    route: "/ai-chip",
    title: "The Life of an AI Chip",
    kindLabel: "Scrollytelling game",
    tagline:
      "Build a frontier accelerator and discover, choice by choice, that you never had one.",
    description:
      "Nine scenes from a parking lot in Santa Clara to a data center on the Columbia River. Every “decision” has exactly one live button. Every figure sourced and confidence-rated.",
    cta: "Build the chip",
    tags: ["interactive essay", "hardware", "maps"],
    live: false,
    series: null,
    featured: true,
    sourceDir: "src/components/AIChipLife",
    theme: {
      bg: "#F3EFE8",
      text: "#1A1A1A",
      muted: "#6B6B6B",
      accent: "#1A1A1A",
      ctaText: "#FAFAF7",
      titleFont: '"DM Serif Display", Georgia, serif',
    },
  },
  {
    id: "aaron-west-atlas",
    route: "/aaron-west-atlas",
    title: "The Aaron West Lyric Atlas",
    kindLabel: "Lyric atlas",
    tagline: "41 places. Five records. One story.",
    description:
      "An interactive map of every place mentioned across the Aaron West & The Roaring Twenties discography. Click a pin, read the lyric, see the story.",
    cta: "Explore the Atlas",
    tags: ["map", "music"],
    live: false,
    series: null,
    featured: true,
    sourceDir: "src/components/AaronWestAtlas",
    theme: {
      bg: "#FAF6F0",
      text: "#2C2C2C",
      muted: "#6B6358",
      accent: "#2C2C2C",
      ctaText: "#FAF6F0",
      titleFont: '"Libre Baskerville", Georgia, serif',
    },
  },
  {
    id: "plot-twist",
    route: "/plot-twist",
    title: "Plot Twist",
    kindLabel: "Story discovery",
    tagline: "Swipe through the multiverse of stories.",
    description:
      "A TikTok-style feed of AI-generated story ideas. Like what hooks you. Your taste shapes the feed.",
    cta: "Enter Plot Twist",
    tags: ["live AI", "fiction"],
    live: true,
    series: null,
    featured: true,
    sourceDir: "src/components/PlotTwist",
    theme: {
      bg: "#0F0F1A",
      text: "#F0F0F0",
      muted: "#6B6B80",
      accent: "#8B5CF6",
      ctaText: "#F0F0F0",
      titleFont: '"DM Serif Display", Georgia, serif',
    },
  },
  {
    id: "link-tracker",
    route: "/link-tracker",
    title: "Seattle Link Light Rail Tracker",
    kindLabel: "Transit map",
    tagline: "Today's system with live arrivals, plus the future ST3 buildout.",
    description:
      "An interactive map of Sound Transit's Link light rail — today's system with live arrivals, and a toggle to the planned ST3 network from Everett to Tacoma.",
    cta: "Explore the Network",
    tags: ["map", "transit", "live data"],
    live: true,
    series: null,
    featured: false,
    sourceDir: "src/components/LinkTracker",
    theme: {
      bg: "#F0F4F8",
      text: "#1A2B3C",
      muted: "#4A5D6F",
      accent: "#3DAE2B",
      ctaText: "#FFFFFF",
      titleFont: "inherit",
    },
  },
  {
    id: "city-quiz",
    route: "/city-quiz",
    title: "City Quiz",
    kindLabel: "AI trivia",
    tagline: "How well do you know your city?",
    description:
      "Type any city — Claude pulls live web research, fact-checks its own answers, and quizzes you on things you maybe didn't know.",
    cta: "Start the quiz",
    tags: ["live AI", "trivia"],
    live: true,
    series: null,
    featured: false,
    sourceDir: "src/components/CityQuiz",
    theme: {
      bg: "#FAFAF7",
      text: "#1A1A1A",
      muted: "#6B6B6B",
      accent: "#1A1A1A",
      ctaText: "#FAFAF7",
      titleFont: '"DM Serif Display", Georgia, serif',
    },
  },
  {
    id: "ele",
    route: "/ele",
    title: "The Emotional Labor Exchange",
    kindLabel: "Market simulation",
    tagline: "Pricing human feeling since 2032.",
    description:
      "A live ticker for the market price of human feeling. Eight emotions, real-time prices, and headlines from an exchange that should not exist.",
    cta: "Enter the Exchange",
    tags: ["live AI", "satire"],
    live: true,
    series: "happiness-liability",
    featured: false,
    sourceDir: "src/components/EmotionalLaborExchange",
    theme: {
      bg: "#FAF8F5",
      text: "#1A1A1A",
      muted: "#6B6B6B",
      accent: "#1A1A1A",
      ctaText: "#FAF8F5",
      titleFont: '"DM Serif Display", Georgia, serif',
    },
  },
  {
    id: "invoice",
    route: "/invoice",
    title: "Emotional Labor Invoice",
    kindLabel: "Generator",
    tagline: "AI-itemized. Exportable. Unpayable.",
    description:
      "Generate a real invoice for the emotional labor you've been doing for free.",
    cta: "Generate an Invoice",
    tags: ["live AI", "satire"],
    live: true,
    series: "happiness-liability",
    featured: false,
    sourceDir: "src/components/EmotionalLaborInvoice",
    theme: {
      bg: "#FAFAF7",
      text: "#1A1A1A",
      muted: "#6B6B6B",
      accent: "#C49A3C",
      ctaText: "#1A1A1A",
      titleFont: '"IBM Plex Mono", "JetBrains Mono", monospace',
    },
  },
  {
    id: "janet",
    route: "/janet",
    title: "JANET",
    kindLabel: "Interactive fiction",
    tagline: "Just Another Non-Entity Technology.",
    description:
      "Talk to the AI companion from The Happiness Liability. She's been monitoring human sadness for 16 years. She has questions.",
    cta: "Start Conversation",
    tags: ["live AI", "fiction"],
    live: true,
    series: "happiness-liability",
    featured: false,
    sourceDir: "src/components/Janet",
    theme: {
      bg: "#0d0f11",
      text: "#d1d5db",
      muted: "#6b7280",
      accent: "#059669",
      ctaText: "#0d0f11",
      titleFont: '"JetBrains Mono", monospace',
    },
  },
  {
    id: "monetized-reader",
    route: "/monetized-reader",
    title: "The Monetized Reader",
    kindLabel: "Interactive fiction",
    tagline: "Try not to enjoy it. That causes market dips.",
    description:
      "Read the opening chapter of The Happiness Liability while a neural interface monetizes your feelings in real time.",
    cta: "Connect Interface",
    tags: ["fiction", "satire"],
    live: false,
    series: "happiness-liability",
    featured: false,
    sourceDir: "src/components/MonetizedReader",
    theme: {
      bg: "#07090D",
      text: "#E6EDF3",
      muted: "#55606E",
      accent: "#2DD4BF",
      ctaText: "#07090D",
      titleFont: '"DM Serif Display", Georgia, serif',
    },
  },
  {
    id: "hype-check",
    route: "/hype-check",
    title: "Hype Check — July 2026",
    kindLabel: "Meme quiz",
    tagline: "May 2025's AI buzzwords, one year later. Which ones survived?",
    description:
      "A playable update of the slumped-in-a-chair buzzword meme. Twenty terms from the timeline: call each one still everywhere, dead, or never real — then get the receipts.",
    cta: "Check the hype",
    tags: ["game", "AI culture", "trivia"],
    live: false,
    series: null,
    featured: false,
    sourceDir: "src/components/HypeCheck",
    theme: {
      bg: "#1E1E1E",
      text: "#F5F5F5",
      muted: "#8A8A8A",
      accent: "#F5F5F5",
      ctaText: "#1E1E1E",
      titleFont: '"DM Sans", system-ui, sans-serif',
    },
  },
];

export const FEATURED_DEMOS = DEMOS.filter((demo) => demo.featured);
export const MORE_DEMOS = DEMOS.filter((demo) => !demo.featured);
export const SERIES_DEMOS = DEMOS.filter(
  (demo) => demo.series === HAPPINESS_LIABILITY_SERIES.id
);
