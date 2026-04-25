import express from "express";
import rateLimit from "express-rate-limit";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "../config/index.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL = "claude-sonnet-4-20250514";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const HARD_TIMEOUT_MS = 90 * 1000;
const CACHE_FILE = path.join(__dirname, "..", "data", "quiz-cache.json");
const MAX_CITY_LENGTH = 100;

const CATEGORIES = [
  "history",
  "geography",
  "urban_planning",
  "government",
  "transit",
  "culture",
  "demographics",
  "economy",
  "landmarks",
  "sports",
];

// --- Cache (in-memory + disk-persisted) ---
const cache = new Map(); // cityKey -> { data, timestamp }
const inflightByKey = new Map(); // cityKey -> Promise

function loadCacheFromDisk() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return;
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw || "{}");
    let loaded = 0;
    for (const [key, entry] of Object.entries(parsed)) {
      if (
        entry &&
        entry.data &&
        typeof entry.timestamp === "number" &&
        Date.now() - entry.timestamp < CACHE_TTL_MS
      ) {
        cache.set(key, entry);
        loaded++;
      }
    }
    console.log(`🏙️  Quiz: loaded ${loaded} cached city quizzes from disk`);
  } catch (err) {
    console.warn("Quiz: failed to load cache from disk:", err.message);
  }
}

function persistCacheToDisk() {
  try {
    const obj = {};
    for (const [key, entry] of cache.entries()) {
      obj[key] = entry;
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) {
    console.warn("Quiz: failed to persist cache to disk:", err.message);
  }
}

loadCacheFromDisk();

// --- Global budget cap (across all IPs) ---
const GLOBAL_HOURLY_LIMIT = 30;
let globalHourlyCount = 0;
let globalHourlyResetAt = Date.now() + 60 * 60 * 1000;

function checkGlobalBudget() {
  if (Date.now() > globalHourlyResetAt) {
    globalHourlyCount = 0;
    globalHourlyResetAt = Date.now() + 60 * 60 * 1000;
  }
  return globalHourlyCount < GLOBAL_HOURLY_LIMIT;
}

function incrementGlobalBudget() {
  globalHourlyCount++;
}

// --- Rate limiters ---
const generationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "rate_limited",
    message:
      "You're researching cities faster than Claude can fact-check. Please wait a minute.",
  },
});

const dailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "rate_limited",
    message:
      "Daily quota reached for quiz generation. Please come back tomorrow.",
  },
});

const forceRefreshLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `force-${req.ip}`,
  skip: (req) => req.body?.forceRefresh !== true,
  message: {
    error: "rate_limited",
    message: "Force-refresh allowed once per hour. Try again later.",
  },
});

// --- Validation ---
function validateCity(input) {
  if (typeof input !== "string") {
    return { ok: false, reason: "City must be a string." };
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, reason: "City cannot be empty." };
  }
  if (trimmed.length > MAX_CITY_LENGTH) {
    return { ok: false, reason: `City must be ${MAX_CITY_LENGTH} characters or fewer.` };
  }
  if (/[<>{}[\]\\]/.test(trimmed)) {
    return { ok: false, reason: "City contains disallowed characters." };
  }
  if (/[\x00-\x1f\x7f]/.test(trimmed)) {
    return { ok: false, reason: "City contains control characters." };
  }
  return { ok: true, value: trimmed };
}

function normalizeCityKey(city) {
  return city
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// --- JSON parsing across mixed Anthropic content blocks ---
function parseJsonFromResponse(response) {
  for (const block of response.content) {
    if (block.type !== "text") continue;
    const text = block.text.trim();
    try {
      return JSON.parse(text);
    } catch {
      // try fenced
      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fence) {
        try {
          return JSON.parse(fence[1].trim());
        } catch {
          // continue
        }
      }
      // try outermost {...}
      const obj = text.match(/\{[\s\S]*\}/);
      if (obj) {
        try {
          return JSON.parse(obj[0]);
        } catch {
          // continue
        }
      }
    }
  }
  return null;
}

// --- System prompts ---
const SYSTEM_PROMPT_GEN = `You are a local-trivia generator for a feature called "How Well Do You Know Your City?". Given a city name, produce 14 multiple-choice trivia questions (we will prune to 10 in a later step). Use the web_search tool aggressively — assume nothing from memory. All facts must be verifiable from web sources.

Rules:
- 4 options per question, exactly one defensible correct answer.
- Distribute across these categories (cap 2 per category): history, geography, urban_planning, government, transit, culture, demographics, economy, landmarks, sports. Aim for at least 6 distinct categories.
- AT LEAST ONE question must reference a current/recent fact (current mayor, recent transit project, recent census stat, etc.).
- Avoid ambiguous wording. Each question must have exactly one defensible answer. Avoid trick questions, double negatives, "all of the above", "none of the above".
- Distractors must be plausible (same category, similar magnitude) but verifiably wrong.
- Each question gets a 1-3 sentence explanation that satisfies a curious reader.
- Each question lists 1-3 source URLs from your web_search results.
- If the city name is ambiguous (multiple cities share the name), pick the most populous one and canonicalize to "City, Region, Country" form.
- If the city is too obscure to find verifiable facts for at least 8 distinct questions, return: {"error":"insufficient_data","city":"...","reason":"..."}

Output ONLY valid JSON, no markdown fences, exactly this shape:
{
  "city": "Canonicalized City, Region, Country",
  "questions": [
    {
      "id": "q1",
      "category": "history",
      "question": "...",
      "options": ["...","...","...","..."],
      "correctIndex": 0,
      "explanation": "1-3 sentences.",
      "sources": [{"title":"...","url":"..."}],
      "difficulty": "easy"
    }
  ]
}
The questions array MUST contain exactly 14 entries (unless returning the insufficient_data error).`;

const SYSTEM_PROMPT_VERIFY = `You are a fact-checker for a city trivia quiz. You will receive 14 candidate multiple-choice questions about a specific city. For each question, use web_search to independently verify:
1. The marked-correct option is actually correct.
2. None of the three distractor options are ALSO correct.
3. The question is unambiguous as worded.

Then SELECT the BEST 10 verified questions, balancing category diversity (cap 2 per category, at least 6 distinct categories represented).

Rules:
- Do NOT invent new questions. You may only: keep as-is, correct correctIndex if you find the wrong option was marked, tighten the explanation, or drop the question.
- If a question's facts cannot be verified within ~2 web searches, drop it.
- Confidence levels: "high" = corroborated by 2+ independent sources; "medium" = single authoritative source (e.g. official city site or Wikipedia). Anything lower, drop.
- For volatile facts (current mayor, current population, recent rankings), include them in freshness.volatileFacts.
- If fewer than 8 questions verify cleanly, return: {"error":"insufficient_verified","verifiedCount":N}

Output ONLY valid JSON, no markdown fences, exactly this shape:
{
  "city": "Canonicalized City, Region, Country",
  "questions": [
    {
      "id": "q1",
      "category": "history",
      "question": "...",
      "options": ["...","...","...","..."],
      "correctIndex": 0,
      "explanation": "1-3 sentences.",
      "sources": [{"title":"...","url":"..."}],
      "confidence": "high",
      "difficulty": "medium"
    }
  ],
  "categoryCounts": {"history": 2, "transit": 1},
  "freshness": {"asOf": "YYYY-MM-DD", "volatileFacts": ["current_mayor"]}
}
The questions array MUST contain exactly 10 entries (unless returning the insufficient_verified error).`;

// --- Anthropic calls ---
async function runPass1(client, city) {
  console.log(`🏙️  Quiz Pass 1: generating candidates for "${city}"`);
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT_GEN,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 10 }],
    messages: [
      {
        role: "user",
        content: `Generate 14 multiple-choice trivia questions about: ${city}. Use web_search heavily to find verifiable facts spanning history, urban planning, current government (e.g. mayor), geography, transit, culture, demographics, economy, landmarks, and sports.`,
      },
    ],
  });
  const json = parseJsonFromResponse(response);
  if (!json) throw new Error("Pass 1: failed to parse JSON from response.");
  return json;
}

async function runPass2(client, pass1Json) {
  console.log("🏙️  Quiz Pass 2: verifying candidates");
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT_VERIFY,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 10 }],
    messages: [
      {
        role: "user",
        content: `Verify these 14 candidate questions and prune to the best 10. Candidates:\n\n${JSON.stringify(pass1Json)}`,
      },
    ],
  });
  const json = parseJsonFromResponse(response);
  if (!json) throw new Error("Pass 2: failed to parse JSON from response.");
  return json;
}

function enforceCategoryCaps(questions) {
  const counts = {};
  const kept = [];
  for (const q of questions) {
    const cat = q.category || "history";
    counts[cat] = counts[cat] || 0;
    if (counts[cat] >= 2) continue; // cap
    counts[cat]++;
    kept.push(q);
    if (kept.length === 10) break;
  }
  return { questions: kept, counts };
}

function shapeFinal(verified, fallbackCity) {
  const questions = (verified.questions || []).slice(0, 10).map((q, i) => ({
    id: q.id || `q${i + 1}`,
    category: CATEGORIES.includes(q.category) ? q.category : "history",
    question: q.question,
    options: q.options,
    correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
    explanation: q.explanation || "",
    sources: Array.isArray(q.sources) ? q.sources.slice(0, 3) : [],
    confidence: q.confidence || "medium",
    difficulty: q.difficulty || "medium",
  }));

  const balanced = enforceCategoryCaps(questions);

  return {
    city: verified.city || fallbackCity,
    questions: balanced.questions,
    categoryCounts: balanced.counts,
    freshness: verified.freshness || {
      asOf: new Date().toISOString().slice(0, 10),
      volatileFacts: [],
    },
  };
}

async function generateQuizCore(city) {
  const client = new Anthropic({ apiKey: config.anthropic.apiKey });

  const pass1 = await runPass1(client, city);
  if (pass1.error === "insufficient_data") {
    const err = new Error(pass1.reason || "Insufficient data for this city.");
    err.code = "insufficient_data";
    throw err;
  }
  if (!Array.isArray(pass1.questions) || pass1.questions.length < 8) {
    const err = new Error("Pass 1 did not return enough candidate questions.");
    err.code = "insufficient_data";
    throw err;
  }

  // Pass 2 with timeout fallback to Pass 1 results.
  let verified;
  let unverified = false;
  try {
    verified = await runPass2(client, pass1);
    if (verified.error === "insufficient_verified") {
      const err = new Error("Too few questions could be verified for this city.");
      err.code = "insufficient_data";
      throw err;
    }
    if (!Array.isArray(verified.questions) || verified.questions.length < 8) {
      // Not enough verified — fall back to Pass 1, marked unverified.
      verified = pass1;
      unverified = true;
    }
  } catch (err) {
    if (err.code === "insufficient_data") throw err;
    console.warn("Pass 2 failed; falling back to Pass 1 unverified:", err.message);
    verified = pass1;
    unverified = true;
  }

  const shaped = shapeFinal(verified, city);
  if (shaped.questions.length < 8) {
    const err = new Error("Final quiz had fewer than 8 questions after pruning.");
    err.code = "insufficient_data";
    throw err;
  }
  if (unverified) {
    shaped.freshness = { ...shaped.freshness, unverified: true };
  }
  return shaped;
}

async function generateQuizWithTimeout(city) {
  return Promise.race([
    generateQuizCore(city),
    new Promise((_, reject) =>
      setTimeout(() => {
        const e = new Error("Quiz generation timed out after 90s.");
        e.code = "timeout";
        reject(e);
      }, HARD_TIMEOUT_MS)
    ),
  ]);
}

async function getQuiz(city, cityKey, forceRefresh) {
  if (!forceRefresh) {
    const entry = cache.get(cityKey);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
      console.log(`🏙️  Quiz: cache hit for ${cityKey}`);
      return { data: entry.data, generatedAt: entry.timestamp, cached: true };
    }
    if (inflightByKey.has(cityKey)) {
      console.log(`🏙️  Quiz: joining inflight request for ${cityKey}`);
      return inflightByKey.get(cityKey);
    }
  }

  if (!checkGlobalBudget()) {
    const err = new Error(
      "Hourly research budget reached. Please try a popular (likely-cached) city or come back in an hour."
    );
    err.code = "budget_exceeded";
    throw err;
  }

  const promise = (async () => {
    incrementGlobalBudget();
    const data = await generateQuizWithTimeout(city);
    const timestamp = Date.now();
    const fullData = { ...data, cityKey };
    cache.set(cityKey, { data: fullData, timestamp });
    persistCacheToDisk();
    return { data: fullData, generatedAt: timestamp, cached: false };
  })().finally(() => {
    inflightByKey.delete(cityKey);
  });

  inflightByKey.set(cityKey, promise);
  return promise;
}

// --- Routes ---
router.post(
  "/generate",
  generationLimiter,
  dailyLimiter,
  forceRefreshLimiter,
  async (req, res) => {
    try {
      if (!config.anthropic.apiKey) {
        return res.status(500).json({
          error: "config",
          message: "ANTHROPIC_API_KEY is not configured for the city quiz.",
        });
      }

      const validation = validateCity(req.body?.city);
      if (!validation.ok) {
        return res.status(400).json({ error: "validation", message: validation.reason });
      }

      const cityInput = validation.value;
      const cityKey = normalizeCityKey(cityInput);
      if (!cityKey) {
        return res.status(400).json({
          error: "validation",
          message: "City normalized to an empty key — please refine your input.",
        });
      }

      const forceRefresh = req.body?.forceRefresh === true;
      const result = await getQuiz(cityInput, cityKey, forceRefresh);

      const headers = {};
      if (result.data.freshness?.unverified) {
        res.setHeader("X-Quiz-Verified", "false");
      }
      res.json({
        success: true,
        data: result.data,
        generatedAt: new Date(result.generatedAt).toISOString(),
        cached: result.cached === true,
      });
    } catch (err) {
      console.error("Quiz error:", err.code || "unknown", err.message);
      if (err.code === "insufficient_data") {
        return res.status(422).json({
          error: "insufficient_data",
          message:
            "We couldn't find enough verifiable trivia about that city. Try a nearby larger city.",
        });
      }
      if (err.code === "budget_exceeded") {
        return res.status(429).json({ error: "budget_exceeded", message: err.message });
      }
      if (err.code === "timeout") {
        return res.status(504).json({
          error: "timeout",
          message: "Claude took too long researching this city. Please try again.",
        });
      }
      if (err.status === 429) {
        return res.status(429).json({
          error: "rate_limited",
          message: "Anthropic API is rate-limiting us. Please try again in a moment.",
        });
      }
      res.status(500).json({
        error: "internal",
        message:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Something went wrong generating your quiz. Please try again.",
      });
    }
  }
);

router.delete("/cache/:cityKey", (req, res) => {
  const adminKey = req.header("X-Admin-Key");
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const key = req.params.cityKey;
  const existed = cache.delete(key);
  persistCacheToDisk();
  res.json({ success: true, existed });
});

export default router;
