import express from "express";
import rateLimit from "express-rate-limit";
import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config/index.js";

const router = express.Router();

// --- Cache state ---
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const cache = new Map(); // key: preference hash → { data, timestamp }
const MAX_CACHE_ENTRIES = 50;

// --- Rate limiter ---
const storiesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Rate limited",
    message: "The story muse needs a moment to breathe. Try again shortly.",
  },
});

const SYSTEM_PROMPT = `You are a creative story idea generator for "Plot Twist," a TikTok-style story discovery feed. You generate compelling, original story ideas and short story excerpts across all genres.

For each request, generate exactly the number of stories requested. Each story should be one of two types:
- "premise": A punchy 2-4 sentence story hook/idea that makes the reader desperate to know what happens next. Think elevator pitch meets cliffhanger.
- "excerpt": A 2-3 paragraph opening of a short story — vivid, immediate, with voice and atmosphere. Drop the reader right into the middle of something.

Mix the types roughly 60% premises, 40% excerpts.

Available genres: sci-fi, fantasy, horror, literary, humor, thriller, magical-realism, mystery, romance, dystopian, historical, absurdist, noir, fable
Available moods: dark, hopeful, eerie, whimsical, tense, melancholy, witty, surreal, cozy, unsettling, bittersweet, electric

Rules:
- Every story must have a compelling title (short, evocative, 2-5 words)
- Premises should end on a hook — make the reader NEED to know more
- Excerpts should have distinctive voice and immediately establish atmosphere
- Vary genres and moods widely across the batch
- Be bold, weird, surprising. Avoid clichés. Subvert expectations.
- When user preferences are provided, lean ~60% toward their liked genres/tags but always include 1-2 wildcards from completely different genres for discovery
- Each story gets 2-3 tags from: twist-ending, unreliable-narrator, dystopian, slow-burn, atmospheric, character-study, world-building, philosophical, action-packed, emotional, experimental, satirical, folklore, coming-of-age, revenge, time-travel, AI, supernatural, heist, survival

Respond ONLY with valid JSON. No markdown, no backticks, no explanation. Use this exact format:
{
  "stories": [
    {
      "type": "premise",
      "title": "The Last Librarian",
      "content": "In 2087, books are illegal — not because of censorship, but because reading fiction causes a neurological condition called 'narrative bleed,' where readers begin confusing their memories with characters' lives. Maya Chen is the last person alive who can read without symptoms. The government wants to study her brain. The underground wants her to read one final book that could cure everyone — or prove that reality was never real to begin with.",
      "genre": "sci-fi",
      "mood": "tense",
      "tags": ["dystopian", "philosophical", "twist-ending"]
    },
    {
      "type": "excerpt",
      "title": "Marguerite's Garden",
      "content": "The tomatoes were screaming again. Not loudly — Marguerite had long ago learned to distinguish between the whisper-screams of thirsty roots and the full-throated howls of a plant being eaten alive by aphids. These were somewhere in between: a low, persistent keening that settled in her molars like a toothache.\\n\\nShe set down her tea and pulled on her gardening gloves, the ones with the silver threading her grandmother had sewn into the fingertips. 'For listening,' Abuela had said, though Marguerite hadn't understood then that she meant it literally.\\n\\nThe garden path was warm under her bare feet. Thirty-seven plants, each with its own voice, its own complaints, its own small desperate hopes for rain.",
      "genre": "magical-realism",
      "mood": "whimsical",
      "tags": ["atmospheric", "character-study", "folklore"]
    }
  ]
}`;

/**
 * Create a simple hash from preferences to use as cache key.
 */
function hashPreferences(preferences, genreFilter) {
  const key = JSON.stringify({ preferences, genreFilter });
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return String(hash);
}

/**
 * Evict stale cache entries.
 */
function evictStaleCache() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
  // If still too many, remove oldest
  if (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < oldest.length - MAX_CACHE_ENTRIES; i++) {
      cache.delete(oldest[i][0]);
    }
  }
}

/**
 * Fetch stories from Anthropic API.
 */
async function fetchStoriesFromAPI(preferences, count, genreFilter) {
  const client = new Anthropic({ apiKey: config.anthropic.apiKey });

  let userMessage = `Generate ${count} unique, compelling story ideas/excerpts.`;

  if (genreFilter && genreFilter !== "all") {
    userMessage += ` Focus primarily on the "${genreFilter}" genre.`;
  }

  if (preferences) {
    const parts = [];
    if (preferences.likedGenres?.length > 0) {
      parts.push(`The reader enjoys these genres: ${preferences.likedGenres.join(", ")}`);
    }
    if (preferences.dislikedGenres?.length > 0) {
      parts.push(`The reader tends to skip these genres: ${preferences.dislikedGenres.join(", ")}`);
    }
    if (preferences.likedTags?.length > 0) {
      parts.push(`They like stories with: ${preferences.likedTags.join(", ")}`);
    }
    if (preferences.dislikedTags?.length > 0) {
      parts.push(`They tend to dislike: ${preferences.dislikedTags.join(", ")}`);
    }
    if (parts.length > 0) {
      userMessage += `\n\nReader preferences:\n${parts.join("\n")}`;
      userMessage += `\n\nLean toward their preferences but always include 1-2 wildcard stories from unexpected genres to keep discovery fresh.`;
    }
  }

  console.log("📖 PlotTwist: Generating stories via Anthropic API...");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  let jsonData = null;

  for (const block of response.content) {
    if (block.type === "text") {
      const text = block.text.trim();
      try {
        jsonData = JSON.parse(text);
        break;
      } catch {
        const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) {
          try {
            jsonData = JSON.parse(fenceMatch[1].trim());
            break;
          } catch { /* continue */ }
        }
        const objectMatch = text.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          try {
            jsonData = JSON.parse(objectMatch[0]);
            break;
          } catch { /* continue */ }
        }
      }
    }
  }

  if (!jsonData || !Array.isArray(jsonData.stories)) {
    throw new Error("Failed to parse stories from API response");
  }

  // Add UUIDs to each story
  jsonData.stories = jsonData.stories.map((story) => ({
    ...story,
    id: uuidv4(),
  }));

  console.log(`📖 PlotTwist: Generated ${jsonData.stories.length} stories`);
  return jsonData;
}

/**
 * POST /api/stories/generate
 */
router.post("/generate", storiesLimiter, async (req, res) => {
  try {
    if (!config.anthropic.apiKey) {
      return res.status(500).json({
        error: "API key not configured",
        message: "ANTHROPIC_API_KEY is required for Plot Twist.",
      });
    }

    const { preferences, count = 5, genreFilter } = req.body;
    const storyCount = Math.min(Math.max(1, count), 10); // Clamp 1-10

    // Check cache
    evictStaleCache();
    const cacheKey = hashPreferences(preferences, genreFilter);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log("📖 PlotTwist: Serving cached stories");
      return res.json({
        success: true,
        ...cached.data,
        cached: true,
      });
    }

    const data = await fetchStoriesFromAPI(preferences, storyCount, genreFilter);

    // Cache the result
    cache.set(cacheKey, { data, timestamp: Date.now() });

    res.json({
      success: true,
      ...data,
      cached: false,
    });
  } catch (error) {
    console.error("PlotTwist API Error:", error.message || error);

    if (error.status === 429) {
      return res.status(429).json({
        error: "Rate limited",
        message: "The story muse is overwhelmed. Please wait a moment.",
      });
    }

    res.status(500).json({
      error: "Failed to generate stories",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Plot Twist is temporarily unavailable. The muse will return shortly.",
    });
  }
});

export default router;
