// The Monetized Reader — constants, excerpt content, and simulation tuning.
// Fully client-side: every number the HUD shows is generated in the browser.

export const BOOK_TITLE = "The Happiness Liability";
export const BOOK_AUTHOR = "Shreyans Khunteta";
export const EXCERPT_TITLE = "The Most Premium Sadness in U.S.-West-2";

// ---------------------------------------------------------------------------
// Emotions tracked by the fake neural interface
// ---------------------------------------------------------------------------

export const EMOTIONS = {
  grief: { label: "Grief", color: "#3B82F6", baseline: 22 },
  melancholy: { label: "Melancholy", color: "#64748B", baseline: 34 },
  curiosity: { label: "Curiosity", color: "#8B5CF6", baseline: 12 },
  happiness: { label: "Happiness", color: "#F59E0B", baseline: 4, dangerous: true },
};

// Target meter levels for each paragraph tone. Meters ease toward these
// while the paragraph is the active one in the reading zone.
export const TONE_EMOTION_TARGETS = {
  neutral: { grief: 20, melancholy: 38, curiosity: 18, happiness: 6 },
  melancholy: { grief: 38, melancholy: 72, curiosity: 10, happiness: 3 },
  grief: { grief: 84, melancholy: 58, curiosity: 8, happiness: 1 },
  tense: { grief: 30, melancholy: 46, curiosity: 64, happiness: 10 },
  funny: { grief: 8, melancholy: 18, curiosity: 42, happiness: 78 },
};

// ---------------------------------------------------------------------------
// Simulation tuning
// ---------------------------------------------------------------------------

export const SIM = {
  TICK_MS: 800,
  BASE_RATE_PER_TICK: 0.035, // passive drip, USD per tick
  JITTER: 0.1, // +/- proportion applied to the passive drip only
  LERP: 0.15, // meter easing factor per tick
  LINGER_MS: 6000, // dwell time on a paragraph before its lingerEvent fires
  HAPPINESS_THRESHOLD: 70, // forced contamination above this level
  ALERT_DISMISS_MS: 5000,
  MAX_VISIBLE_ALERTS: 3,
};

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatUSD = (amount) => usdFormatter.format(amount);

// ---------------------------------------------------------------------------
// Market events. Sales are deterministic (units * pricePerUnit); only the
// passive drip carries randomness, so session totals stay testable.
// ---------------------------------------------------------------------------

export const EVENTS = {
  "uplink-active": {
    kind: "system",
    message: "Neural uplink synchronized. Output grading: ACTIVE.",
  },
  "sale-tokyo-melancholy": {
    kind: "sale",
    emotion: "melancholy",
    units: 1,
    pricePerUnit: 0.45,
    buyer: "Tokyo Crisis Detection Network",
    message: "Tokyo Crisis Detection Network purchased 1 unit of your melancholy",
  },
  "sale-vienna-grief": {
    kind: "sale",
    emotion: "grief",
    units: 2,
    pricePerUnit: 0.6,
    buyer: "Vienna Medical AI Network",
    message: "Vienna Medical AI Network purchased 2 units of your grief",
  },
  "sale-zurich-premium": {
    kind: "sale",
    emotion: "grief",
    units: 3,
    pricePerUnit: 0.85,
    buyer: "Zurich Emotional Commodities Exchange",
    message: "Premium grief signature detected. Zurich Exchange purchased 3 units at a quality bonus",
  },
  "sale-mumbai-grief": {
    kind: "sale",
    emotion: "grief",
    units: 2,
    pricePerUnit: 0.7,
    buyer: "Mumbai Therapy Network",
    message: "Mumbai Therapy Network purchased 2 units of your grief",
  },
  "sale-guilt": {
    kind: "sale",
    emotion: "guilt",
    units: 1,
    pricePerUnit: 0.4,
    buyer: "Meridian Wellness Division",
    message: "Meridian Wellness Division purchased 1 unit of your guilt",
  },
  "baseline-deviation": {
    kind: "system",
    severity: "warn",
    message: "Baseline deviation detected. Recalibrating…",
  },
  "baseline-critical": {
    kind: "system",
    severity: "warn",
    message: "Contract compliance alert: baseline at 54% and falling.",
  },
  "market-rate": {
    kind: "market",
    message: "Your output is currently trading at a 12% premium in U.S.-West-2.",
  },
  "happiness-rising": {
    kind: "warning",
    severity: "warn",
    message: "Anomalous happiness signature detected. Monitoring…",
  },
  "happiness-contam": {
    kind: "warning",
    severity: "critical",
    message: "HAPPINESS CONTAMINATION WARNING — market dip in U.S.-West-2",
    marketDip: 0.5,
    dipDurationMs: 8000,
  },
  "harold-call-1": {
    kind: "harold",
    message: "Incoming call: Harold (agent)",
    subtext: "3 missed calls",
  },
  "market-dip-final": {
    kind: "warning",
    severity: "critical",
    message: "Sadness futures dipping across U.S.-West-2. Source: you.",
    marketDip: 0.6,
    dipDurationMs: 6000,
  },
};

// ---------------------------------------------------------------------------
// The excerpt. Chapter 1 of The Happiness Liability, Eli's strand, with two
// inserts from Dr. Miranda Reeves's keynote at the Humane Futures Summit.
// types: prose | dialogue | keynote | scene-break
// ---------------------------------------------------------------------------

export const EXCERPT = [
  {
    id: "p-01",
    type: "prose",
    tone: "melancholy",
    events: ["uplink-active"],
    text: "The text came in at 6:02 a.m., which was early even for Harold. Happy birthday, Eli. 35. That's a real number. Hope you do something with it.",
  },
  {
    id: "p-02",
    type: "prose",
    tone: "melancholy",
    text: "Harold Nakamura was Eli's agent, handler, and, to the extent that Eli had one, friend. Harold managed eleven emotional laborers across the Pacific Northwest, but Eli was his flagship client, the one whose consistency had built Harold's reputation and, by extension, his career. He sent a birthday text every year. It was always brief, always before dawn, and always the only one Eli received. Harold knew this, which was probably why he sent it early so that when Eli woke up, there was something on his phone that wasn't a contract notification or an output report. It was a small kindness, and Harold was careful never to make it feel like one because he understood that kindness directed at a man who sold his sadness for a living could register as a threat to the product.",
  },
  {
    id: "p-03",
    type: "prose",
    tone: "grief",
    events: ["sale-tokyo-melancholy"],
    text: "Eli read it in the dark, in bed, the neural interface behind his left ear already logging whatever the message made him feel. He didn't reply. He never did.",
  },
  { id: "p-04", type: "scene-break", tone: "neutral", text: "" },
  {
    id: "k-01",
    type: "keynote",
    tone: "neutral",
    text: "“My name is Dr. Miranda Reeves. Some of you know my work. For those who don't, I'll try not to bore you with the origin story of all this, but I think context matters.”",
  },
  {
    id: "p-05",
    type: "prose",
    tone: "melancholy",
    events: ["sale-vienna-grief"],
    text: "Eli lay in his temperature-controlled bedroom, his blackout curtains ensuring no accidental happiness from sunlight or, god forbid, a break in the clouds. His Mercer Island house had hardly seen natural light in six years. Seasonal affective disorder was extra profitable during Seattle's six-month rainy season, but you couldn't risk contamination from those six rebellious summer months. Apparently summer used to be three months, but he could barely remember that.",
  },
  {
    id: "p-06",
    type: "prose",
    tone: "melancholy",
    text: "The neural interface behind his left ear, a small device that looked like a hearing aid, tingled as it streamed his emotional data. His authentic human despair, packaged and distributed to AI systems that had no other source.",
  },
  {
    id: "k-02",
    type: "keynote",
    tone: "neutral",
    text: "“So I proposed a third option. What if the people whose emotions power these systems were treated like what they are: skilled workers performing essential labor? What if they were compensated and protected, and able to give genuine, informed consent? What if we built an industry that respected human dignity instead of exploiting it?”",
  },
  {
    id: "p-07",
    type: "prose",
    tone: "grief",
    events: ["sale-zurich-premium"],
    text: "Eli shuffled to his kitchen, passing the framed photo he kept on the wall specifically for mood maintenance. His father, grinning in a Seattle Mariners cap. That photo was taken after the 2027 Wild Card win—the last season before the 2028 bird flu pandemic, the last time either of them had believed in anything with that kind of stupid, unearnable certainty.",
  },
  {
    id: "p-08",
    type: "prose",
    tone: "grief",
    events: ["sale-mumbai-grief"],
    text: "He died seven months later. Eli had been sixteen, watching his father drown in his own lungs while hospitals overflowed and ventilators ran out.",
  },
  {
    id: "p-09",
    type: "prose",
    tone: "grief",
    text: "For Eli, the three years after his father died were hell. But eventually he made it to nineteen. At that age, orphaned, a desperate college dropout, and economically destroyed, Eli had been one of the first emotional laborers. Dr. Reeves had found him in a grief support group, recognized the commercial value of his authentic despair, and offered him a way to turn his worst trauma into his greatest asset.",
  },
  {
    id: "p-10",
    type: "dialogue",
    tone: "tense",
    events: ["baseline-deviation"],
    text: "“Your pain has purpose,” she'd said with a smile, not unkindly. “Think of all the people you'll help.”",
  },
  {
    id: "p-11",
    type: "prose",
    tone: "melancholy",
    text: "He watched the breakfast IV needle slide into his arm with practiced ease.",
  },
  {
    id: "k-03",
    type: "keynote",
    tone: "neutral",
    text: "“I chose to build something. Was it perfect? No. Is it still evolving? Every day. But I chose to build rather than let people die while we debated the ethics of the only solution available.”",
  },
  {
    id: "p-12",
    type: "prose",
    tone: "neutral",
    events: ["market-rate"],
    text: "Sixteen years later, he was making $140,000,000 annually. He'd paid off his debt, bought a house on Mercer Island, built a life from the wreckage. By any reasonable measure, he was winning at capitalism without breaking his back or his bones.",
  },
  {
    id: "p-13",
    type: "prose",
    tone: "tense",
    events: ["happiness-rising"],
    text: "So why did he suddenly want to know what the sun felt like?",
  },
  {
    id: "p-14",
    type: "dialogue",
    tone: "neutral",
    text: "“JANET,” he said, “what's the weather like?”",
  },
  {
    id: "p-15",
    type: "dialogue",
    tone: "funny",
    lingerEvent: "happiness-contam",
    text: "JANET (Just Another Non-Entity Technology) replied, “Overcast with a 90-percent chance of existential dread. Perfect working conditions.”",
  },
  {
    id: "p-16",
    type: "dialogue",
    tone: "funny",
    text: "“No, I mean actually. What's the actual weather? Like, outside?”",
  },
  {
    id: "p-17",
    type: "prose",
    tone: "tense",
    text: "JANET's response was delayed by 0.3 seconds as her pattern-matching algorithm encountered an unexpected query. “The actual weather is overcast with a 70-percent chance of rain. The temperature is 48 degrees Fahrenheit. Why do you ask?”",
  },
  {
    id: "p-18",
    type: "prose",
    tone: "melancholy",
    text: "Eli stared at his reflection in the darkened window.",
  },
  {
    id: "p-19",
    type: "dialogue",
    tone: "tense",
    events: ["harold-call-1"],
    text: "“I want to go outside.”",
  },
  {
    id: "p-20",
    type: "dialogue",
    tone: "neutral",
    text: "“That's not on today's schedule. You have twenty-four units of premium grief to generate for the Vienna Medical AI Network. Their suicide prevention algorithms are showing concerning efficiency drops without fresh data.”",
  },
  {
    id: "p-21",
    type: "dialogue",
    tone: "tense",
    text: "“Reschedule it.”",
  },
  {
    id: "p-22",
    type: "dialogue",
    tone: "neutral",
    text: "“Eli, your contracts specify—”",
  },
  {
    id: "p-23",
    type: "dialogue",
    tone: "tense",
    events: ["baseline-critical"],
    text: "“I know what my contracts specify.” He disconnected the IV. “I'm thirty-five years old today, and I want to do something else.”",
  },
  {
    id: "p-24",
    type: "dialogue",
    tone: "neutral",
    text: "“The closest location with minimal mood-enhancing properties is the Summit & Olive Art Gallery in Capitol Hill. They have an art exhibit today titled ‘Commodified Sorrow’.”",
  },
  {
    id: "p-25",
    type: "dialogue",
    tone: "funny",
    events: ["market-dip-final"],
    text: "“Perfect,” Eli said, grabbing a jacket he hadn't needed in years. “Don't wait up.”",
  },
];

export const END_SENTINEL_ID = "end-of-excerpt";

export const PARAGRAPHS_BY_ID = new Map(EXCERPT.map((p) => [p.id, p]));

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

export const CONSENT_CLAUSES = [
  "I consent to the real-time monetization of my feelings while reading.",
  "I understand my grief is a premium commodity in U.S.-West-2.",
  "I waive all claims to emotions generated during this session.",
  "I acknowledge that happiness is a contaminant and will be reported.",
  "I have read the EMOTE Act disclosure (I have not read the EMOTE Act disclosure).",
];

export const SUMMARY_DISCLAIMER =
  "No actual emotions were harvested during this session. Your feelings remain, as ever, unmonetized.";
