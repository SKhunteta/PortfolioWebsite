// Hype Check — July 2026. A playable update of the "guy slumped in a
// folding chair surrounded by AI buzzwords" meme (May 2025 edition).
// All facts reflect reporting as of July 2026; see KNOWLEDGE_CUTOFF.

export const STATES = {
  INTRO: "intro",
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
  },
  {
    id: "vibe-coding",
    term: "vibe coding",
    category: "alive",
    verdictLabel: "Still everywhere. It's in the dictionary now.",
    fact:
      "Coined in early 2025, added to dictionaries by the end of it. In 2026 it stopped being a trend and became the default description for how a lot of software gets written.",
    factDate: "2026",
  },
  {
    id: "cursor",
    term: "cursor",
    category: "alive",
    verdictLabel: "Still everywhere. One of the last IDEs standing.",
    fact:
      "Cursor 3 shipped in April 2026 with a dedicated agents window and Composer 2, its own frontier coding model. Of the dozens of 2025 'AI IDEs,' roughly five names now take almost all of the paid usage — Cursor leads them.",
    factDate: "April 2026",
  },
  {
    id: "agentic-workflows",
    term: "agentic workflows",
    category: "alive",
    verdictLabel: "Still everywhere. Unfortunately.",
    fact:
      "Agentic AI sits at the very peak of the 2026 hype cycle. Analysts estimate only a small fraction of the thousands of self-declared 'AI agent' vendors are building genuinely agentic systems — the industry even coined a word for the rest: 'agent washing.'",
    factDate: "2026",
  },
  {
    id: "io-device",
    term: "io",
    category: "alive",
    verdictLabel: "Technically alive. Still hasn't shipped.",
    fact:
      "OpenAI paid about $6.5 billion for Jony Ive's io in May 2025. As of July 2026 there is still no device — the debut is promised for 'late 2026,' and the first product, a smart speaker with a camera, is slated for early 2027.",
    factDate: "July 2026",
  },
  {
    id: "devin",
    term: "devin",
    category: "alive",
    verdictLabel: "Still everywhere. It ate Windsurf.",
    fact:
      "The 'AI software engineer' everyone dunked on in 2025 outlived the joke: Cognition bought Windsurf's remains and relaunched the IDE as Devin Desktop in June 2026. Devin is now one of the top five paid coding tools.",
    factDate: "June 2026",
  },
  {
    id: "world-models",
    term: "world models",
    category: "alive",
    verdictLabel: "Still everywhere. The new lab obsession.",
    fact:
      "By 2026 the frontier labs' favorite pitch moved from chatbots to models that perceive, predict, and simulate the physical world. 'World models' are to 2026 what 'AGI timelines' were to 2023.",
    factDate: "2026",
  },
  {
    id: "geo",
    term: "GEO",
    category: "alive",
    verdictLabel: "Still everywhere. SEO's weird successor.",
    fact:
      "Generative Engine Optimization — getting your brand into AI answers instead of search results. When chatbots became the front page of the internet, an entire industry sprang up to game them.",
    factDate: "2026",
  },
  {
    id: "workslop",
    term: "workslop",
    category: "alive",
    verdictLabel: "Still everywhere. Painfully real.",
    fact:
      "The 2026 word for AI-generated output that looks like work but says nothing, sibling of 'promptslop' and 'deckslop.' Coined as backlash; now unavoidable in every thinkpiece about AI at work.",
    factDate: "2026",
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
  },
  {
    id: "gpt-4-5",
    term: "gpt-4.5",
    category: "dead",
    verdictLabel: "Dead. Retired within months.",
    fact:
      "OpenAI's biggest non-reasoning model launched in February 2025 and was pulled from the API that same summer — too expensive to serve. By July 2026 ChatGPT is on the GPT-5.6 family, and the '.5' era reads like ancient history.",
    factDate: "2025",
  },
  {
    id: "swe-1",
    term: "SWE-1",
    category: "dead",
    verdictLabel: "Dead. Went down with the ship.",
    fact:
      "Windsurf's in-house frontier model family, launched May 2025. When the company was carved up and the brand retired, SWE-1 quietly disappeared with it.",
    factDate: "2026",
  },
  {
    id: "gemini-2-5",
    term: "gemini 2.5",
    category: "dead",
    verdictLabel: "Superseded. Two generations back.",
    fact:
      "State of the art at Google I/O 2025, replaced by Gemini 3 within the year. In AI-years, gemini 2.5 is now vintage hardware.",
    factDate: "Late 2025",
  },
  {
    id: "veo-3",
    term: "veo 3",
    category: "dead",
    verdictLabel: "Superseded. Its slop lives on.",
    fact:
      "The video model that broke the internet at Google I/O 2025 was leapfrogged by newer Veo generations within a year. The AI-slop aesthetic it pioneered, however, turned out to be immortal.",
    factDate: "2026",
  },
  {
    id: "prompt-engineering",
    term: "prompt engineering",
    category: "dead",
    verdictLabel: "Dead as a job title.",
    fact:
      "2023's 'career of the future' quietly vanished from job boards. By 2026 the skill was renamed 'context engineering' — less magic words, more curating what the model sees — and everyone pretended it was new.",
    factDate: "2026",
  },
  {
    id: "bolt",
    term: "bolt",
    category: "dead",
    verdictLabel: "Faded. A consolidation casualty.",
    fact:
      "One of the dozens of text-to-app builders that raised in 2025. The market consolidated to a handful of names by 2026, and bolt wasn't one of them.",
    factDate: "2026",
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
    min: 19,
    title: "You Are the Timeline",
    blurb: "Log off. The chair is waiting for you.",
  },
  {
    min: 16,
    title: "Terminally Online",
    blurb: "You knew about the rebrand before the press release.",
  },
  {
    min: 11,
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

export const CLOUD_SIZES = {
  sm: "text-sm sm:text-base",
  md: "text-base sm:text-xl",
  lg: "text-lg sm:text-2xl",
};
