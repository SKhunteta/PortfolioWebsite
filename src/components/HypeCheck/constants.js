// Hype Check — July 2026. A playable update of the "guy slumped in a
// folding chair surrounded by AI buzzwords" meme (May 2025 edition).
// All facts reflect reporting as of July 2026; see KNOWLEDGE_CUTOFF.

// There is no intro state — the page opens straight into free-roam play.
export const STATES = {
  PLAYING: "playing",
  REVEAL: "reveal",
  DONE: "done",
};

export const KNOWLEDGE_CUTOFF = "July 2026";

// The three verdicts a player can hand down on a buzzword.
export const CHOICES = [
  { id: "alive", label: "Still everywhere" },
  { id: "dead", label: "Dead or absorbed" },
  { id: "fake", label: "Never existed" },
];

export const CHOICE_LABELS = Object.fromEntries(
  CHOICES.map((c) => [c.id, c.label])
);

// Overwhelm meter tuning. The meter starts mid-anxiety, calms on correct
// answers, and spikes on wrong ones. Value is clamped to [0, 100].
export const OVERWHELM = {
  START: 40,
  CORRECT_DELTA: -6,
  WRONG_DELTA: 12,
  MIN: 0,
  MAX: 100,
  RISING_AT: 34,
  OVERLOAD_AT: 67,
};

// Every term the game quizzes on. `category` is the correct answer.
// Real terms carry `sources` — links backing the fact, shown on the
// reveal card. Invented ("fake") terms have nothing to cite.
export const TERMS = [
  // ——— Still everywhere ———
  {
    id: "mcp",
    term: "MCP",
    category: "alive",
    verdictLabel: "Still everywhere. It became plumbing.",
    fact:
      "The Model Context Protocol hit roughly 97 million monthly SDK downloads by spring 2026, and its biggest spec revision yet shipped as a release candidate for July 28, 2026. The buzzword survived by becoming boring infrastructure.",
    factDate: "July 2026",
    sources: [
      {
        label: "MCP blog",
        url: "https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/",
      },
      {
        label: "Bitcoin.com News",
        url: "https://news.bitcoin.com/mcp-in-2026-97-million-downloads-and-growing-crypto-infrastructure-from-bitgo-to-coingecko/",
      },
    ],
  },
  {
    id: "vibe-coding",
    term: "vibe coding",
    category: "alive",
    verdictLabel: "Still everywhere. It's in the dictionary now.",
    fact:
      "Coined in early 2025, added to dictionaries by the end of it. In 2026 it stopped being a trend and became the default description for how a lot of software gets written.",
    factDate: "2026",
    sources: [
      {
        label: "Karpathy on X",
        url: "https://x.com/karpathy/status/1886192184808149383",
      },
      {
        label: "CNN",
        url: "https://www.cnn.com/2025/11/06/tech/vibe-coding-collins-word-year-scli-intl",
      },
    ],
  },
  {
    id: "cursor",
    term: "cursor",
    category: "alive",
    verdictLabel: "Still everywhere. One of the last IDEs standing.",
    fact:
      "Cursor 3 shipped April 2026 with a dedicated Agents window and Composer 2 — a model Cursor trained itself, though it admitted the base was Moonshot's Kimi K2.5. Of 2025's dozens of 'AI IDEs,' a handful now take most paid usage; Cursor leads on revenue.",
    factDate: "April 2026",
    sources: [
      {
        label: "Cursor docs",
        url: "https://cursor.com/docs/agent/agents-window",
      },
      {
        label: "Dataconomy",
        url: "https://dataconomy.com/2026/03/23/cursor-admits-composer-2-based-on-moonshot-ais-kimi-2-5/",
      },
    ],
  },
  {
    id: "agentic-workflows",
    term: "agentic workflows",
    category: "alive",
    verdictLabel: "Still everywhere. Unfortunately.",
    fact:
      "Agentic AI sits at the very peak of the 2026 hype cycle. Analysts estimate only a small fraction of the thousands of self-declared 'AI agent' vendors are building genuinely agentic systems — the industry even coined a word for the rest: 'agent washing.'",
    factDate: "2026",
    sources: [
      {
        label: "Gartner hype cycle",
        url: "https://www.gartner.com/en/articles/hype-cycle-for-agentic-ai",
      },
      {
        label: "Gartner on agent washing",
        url: "https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027",
      },
    ],
  },
  {
    id: "io-device",
    term: "io",
    category: "alive",
    verdictLabel: "Technically alive. Still hasn't shipped.",
    fact:
      "OpenAI paid about $6.5 billion for Jony Ive's io in May 2025. As of July 2026 there is still no device — the debut is promised for 'late 2026,' and the first product, a smart speaker with a camera, is slated for early 2027.",
    factDate: "July 2026",
    sources: [
      {
        label: "TechCrunch",
        url: "https://techcrunch.com/2025/05/21/jony-ive-to-lead-openais-design-work-following-6-5b-acquisition-of-his-company",
      },
      {
        label: "MacRumors",
        url: "https://www.macrumors.com/2026/02/20/jony-ive-openai-smart-speaker-2027/",
      },
    ],
  },
  {
    id: "devin",
    term: "devin",
    category: "alive",
    verdictLabel: "Still everywhere. It ate Windsurf.",
    fact:
      "The 'AI software engineer' everyone dunked on in 2025 outlived the joke: Cognition bought Windsurf's remains in July 2025 and relaunched the IDE as Devin Desktop on June 2, 2026. Not bad for the industry's favorite punching bag.",
    factDate: "June 2026",
    sources: [
      {
        label: "Cognition",
        url: "https://cognition.com/blog/windsurf",
      },
      {
        label: "Devin blog",
        url: "https://devin.ai/blog/windsurf-is-now-devin-desktop",
      },
    ],
  },
  {
    id: "world-models",
    term: "world models",
    category: "alive",
    verdictLabel: "Still everywhere. The new lab obsession.",
    fact:
      "By 2026 the frontier labs' favorite pitch moved from chatbots to models that perceive, predict, and simulate the physical world. 'World models' are to 2026 what 'AGI timelines' were to 2023.",
    factDate: "2026",
    sources: [
      {
        label: "TIME",
        url: "https://time.com/article/2026/07/15/world-models-are-ai-s-next-frontier/",
      },
      {
        label: "Forbes",
        url: "https://www.forbes.com/sites/josipamajic/2026/06/30/world-model-startups-raise-3-billion-vcs-bet-beyond-llms/",
      },
    ],
  },
  {
    id: "geo",
    term: "GEO",
    category: "alive",
    verdictLabel: "Still everywhere. SEO's weird successor.",
    fact:
      "Generative Engine Optimization — getting your brand into AI answers instead of search results. When chatbots became the front page of the internet, an entire industry sprang up to game them.",
    factDate: "2026",
    sources: [
      {
        label: "GEO paper (arXiv)",
        url: "https://arxiv.org/abs/2311.09735",
      },
      {
        label: "Search Engine Land",
        url: "https://searchengineland.com/mastering-generative-engine-optimization-in-2026-full-guide-469142",
      },
    ],
  },
  {
    id: "workslop",
    term: "workslop",
    category: "alive",
    verdictLabel: "Still everywhere. Painfully real.",
    fact:
      "Coined September 2025 by BetterUp Labs and Stanford researchers in Harvard Business Review: AI output that masquerades as good work but says nothing. Its parent word 'slop' was Merriam-Webster's 2025 Word of the Year.",
    factDate: "September 2025",
    sources: [
      {
        label: "Harvard Business Review",
        url: "https://hbr.org/2025/09/ai-generated-workslop-is-destroying-productivity",
      },
      {
        label: "Merriam-Webster",
        url: "https://www.merriam-webster.com/wordplay/word-of-the-year",
      },
    ],
  },
  {
    id: "bolt",
    term: "bolt",
    category: "alive",
    verdictLabel: "Still here. Lovable took the crown, though.",
    fact:
      "Bolt didn't fade — it's still one of the two dominant text-to-app builders in 2026, with a Microsoft Azure partnership and deep enterprise reach. But Lovable overtook it, crossing $200M ARR, and Bolt never cracked the top tier of paid AI coding tools.",
    factDate: "2026",
    sources: [
      {
        label: "Bolt",
        url: "https://bolt.new/blog/bolt-microsoft-partnership",
      },
      {
        label: "TechCrunch",
        url: "https://techcrunch.com/2025/11/19/as-lovable-hits-200m-arr-its-ceo-credits-staying-in-europe-for-its-success",
      },
    ],
  },
  // ——— Dead or absorbed ———
  {
    id: "windsurf",
    term: "windsurf",
    category: "dead",
    verdictLabel: "Dead. Rebranded out of existence.",
    fact:
      "After 2025's acquisition saga — a collapsed OpenAI deal, a Google licensing raid, then a sale of the remains to Cognition — the brand was retired. Windsurf became 'Devin Desktop' on June 2, 2026.",
    factDate: "June 2026",
    sources: [
      {
        label: "CNBC",
        url: "https://www.cnbc.com/2025/07/14/cognition-to-buy-ai-startup-windsurf-days-after-google-poached-ceo.html",
      },
      {
        label: "Devin blog",
        url: "https://devin.ai/blog/windsurf-is-now-devin-desktop",
      },
    ],
  },
  {
    id: "gpt-4-5",
    term: "gpt-4.5",
    category: "dead",
    verdictLabel: "Dead. Retired within months.",
    fact:
      "OpenAI's biggest non-reasoning model launched in February 2025 and was pulled from the API that same summer — too expensive to serve. By July 2026 ChatGPT is on the GPT-5.6 family, and the '.5' era reads like ancient history.",
    factDate: "2025",
    sources: [
      {
        label: "OpenAI",
        url: "https://openai.com/index/introducing-gpt-4-5/",
      },
      {
        label: "VentureBeat",
        url: "https://venturebeat.com/ai/openai-moves-forward-with-gpt-4-5-deprecation-in-api-triggering-developer-anguish-and-confusion",
      },
    ],
  },
  {
    id: "gemini-2-5",
    term: "gemini 2.5",
    category: "dead",
    verdictLabel: "Superseded. Two generations back.",
    fact:
      "State of the art at Google I/O 2025, replaced by Gemini 3 within the year. In AI-years, gemini 2.5 is now vintage hardware.",
    factDate: "Late 2025",
    sources: [
      {
        label: "Google (I/O 2025)",
        url: "https://blog.google/innovation-and-ai/models-and-research/google-deepmind/google-gemini-updates-io-2025/",
      },
      {
        label: "Google (Gemini 3)",
        url: "https://blog.google/products-and-platforms/products/gemini/gemini-3/",
      },
    ],
  },
  {
    id: "veo-3",
    term: "veo 3",
    category: "dead",
    verdictLabel: "Superseded. Its slop lives on.",
    fact:
      "The video model that broke the internet at Google I/O 2025 was superseded within a year — first by Veo 3.1, then by Gemini Omni, which replaced Veo in the Gemini app at I/O 2026. A 'Veo 4' never shipped. The slop aesthetic, however, is immortal.",
    factDate: "May 2026",
    sources: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Veo_(text-to-video_model)",
      },
      {
        label: "Google",
        url: "https://gemini.google/overview/video-generation/",
      },
    ],
  },
  {
    id: "prompt-engineering",
    term: "prompt engineering",
    category: "dead",
    verdictLabel: "Dead as a job title.",
    fact:
      "2023's 'career of the future' quietly vanished from job boards. By 2026 the skill was renamed 'context engineering' — less magic words, more curating what the model sees — and everyone pretended it was new.",
    factDate: "2026",
    sources: [
      {
        label: "Fortune",
        url: "https://www.fortune.com/2025/05/07/prompt-engineering-200k-six-figure-role-now-obsolete-thanks-to-ai",
      },
      {
        label: "Gartner",
        url: "https://www.gartner.com/en/articles/context-engineering",
      },
    ],
  },
  // ——— Never existed ———
  {
    id: "gpt-4-5o-mini",
    term: "gpt-4.5o mini",
    category: "fake",
    verdictLabel: "Never existed. But you hesitated.",
    fact:
      "We mashed up three real OpenAI naming conventions and it sounded completely plausible. That's the joke, and also the problem.",
    factDate: "Never",
  },
  {
    id: "cursor-for-excel",
    term: "Cursor for Excel",
    category: "fake",
    verdictLabel: "Never existed. Probably pitched, though.",
    fact:
      "We made this one up — but every 2025 pitch deck was 'we're building Cursor for X,' so if it exists by the time you read this, we're sorry.",
    factDate: "Never",
  },
  {
    id: "vibe-ops",
    term: "vibe ops",
    category: "fake",
    verdictLabel: "Never existed. Please keep it that way.",
    fact:
      "Vibe-managing production infrastructure is not a real discipline. Yet. We are begging you not to make it one.",
    factDate: "Never",
  },
  {
    id: "prompt-sommelier",
    term: "prompt sommelier",
    category: "fake",
    verdictLabel: "Never existed.",
    fact:
      "An invented job title. Unlike 'prompt engineer,' which was real, paid six figures, and no longer exists either.",
    factDate: "Never",
  },
];

// Score tiers for the end screen, checked from the top down.
// `min` is the minimum number of correct answers (out of TERMS.length).
export const TIERS = [
  {
    min: 18,
    title: "You Are the Timeline",
    blurb: "Log off. The chair is waiting for you.",
  },
  {
    min: 15,
    title: "Terminally Online",
    blurb: "You knew about the rebrand before the press release.",
  },
  {
    min: 10,
    title: "Chronically Informed",
    blurb: "You know what MCP stands for. Seek sunlight.",
  },
  {
    min: 6,
    title: "Casually Scrolling",
    blurb: "You saw the headlines. You did not click.",
  },
  {
    min: 0,
    title: "Blessedly Offline",
    blurb: "You missed all of it. Honestly? Enviable.",
  },
];

// Decorative background chatter for the word cloud. Positions are
// percentages of the stage; sway/bob feed the drift keyframes.
export const CLOUD_WORDS = [
  { text: "this changes everything", top: 6, left: 4, size: "sm", sway: 16, delay: 0 },
  { text: "agents", top: 12, left: 38, size: "lg", sway: -12, delay: 1.2 },
  { text: "GPT-5.6", top: 5, left: 62, size: "md", sway: 10, delay: 2.1 },
  { text: "world models", top: 16, left: 78, size: "md", sway: -18, delay: 0.6 },
  { text: "the browser is the OS", top: 26, left: 6, size: "md", sway: 14, delay: 1.8 },
  { text: "agent washing", top: 32, left: 30, size: "sm", sway: -10, delay: 2.6 },
  { text: "digital coworkers", top: 24, left: 52, size: "sm", sway: 12, delay: 0.9 },
  { text: "Gemini 3", top: 38, left: 12, size: "lg", sway: -14, delay: 1.5 },
  { text: "superintelligence", top: 44, left: 34, size: "md", sway: 18, delay: 2.9 },
  { text: "context engineering", top: 52, left: 8, size: "sm", sway: -16, delay: 0.3 },
  { text: "workslop", top: 58, left: 30, size: "lg", sway: 10, delay: 2.2 },
  { text: "GEO", top: 66, left: 14, size: "md", sway: -12, delay: 1.1 },
  { text: "AI browsers", top: 72, left: 32, size: "sm", sway: 14, delay: 2.5 },
  { text: "Devin Desktop", top: 80, left: 10, size: "md", sway: -10, delay: 0.7 },
  { text: "MCP Apps", top: 86, left: 34, size: "sm", sway: 12, delay: 1.9 },
  { text: "still no io device", top: 90, left: 58, size: "sm", sway: -14, delay: 2.8 },
];

// Explore mode: deterministic stage positions for the clickable term
// buttons. A pure function of index — render never touches
// Math.random — laying terms out in three loose columns with a small
// per-row stagger so the cloud reads scattered, not gridded. Values
// are percentages of the stage; left never exceeds ~68% so buttons
// (capped at the remaining width) can't overflow narrow viewports.
const EXPLORE_COLUMN_LEFTS = [4, 36, 64];

export const explorePositionFor = (index) => {
  const col = index % EXPLORE_COLUMN_LEFTS.length;
  const row = Math.floor(index / EXPLORE_COLUMN_LEFTS.length);
  return {
    top: 12 + row * 11 + col * 2,
    left: EXPLORE_COLUMN_LEFTS[col] + (row % 2) * 4,
    sway: index % 2 === 0 ? 12 : -14,
    delay: (index % 6) * 0.45,
  };
};

export const CLOUD_SIZES = {
  sm: "text-sm sm:text-base",
  md: "text-base sm:text-xl",
  lg: "text-lg sm:text-2xl",
};
