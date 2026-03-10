import express from "express";
import rateLimit from "express-rate-limit";
import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config/index.js";

const router = express.Router();

// --- Input limits ---
const MAX_CONTENT_LENGTH = 10000; // characters
const MAX_TITLE_LENGTH = 200;
const MAX_CONTINUATIONS = 10;
const VALID_GENRES = new Set([
  "sci-fi", "fantasy", "horror", "literary", "humor", "thriller",
  "magical-realism", "mystery", "romance", "dystopian", "historical",
  "absurdist", "noir", "fable",
]);

function sanitizeText(str, maxLen) {
  if (typeof str !== "string") return "";
  return str.slice(0, maxLen);
}

function validateGenre(genre) {
  return VALID_GENRES.has(genre) ? genre : null;
}

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
- IMPORTANT: Actively diversify character names across cultures, ethnicities, and backgrounds. Use names from African, South Asian, East Asian, Southeast Asian, Latin American, Middle Eastern, Eastern European, Indigenous, and Western traditions. Never repeat the same name across a batch. Avoid defaulting to any single naming pattern.
- When user preferences are provided, lean ~60% toward their liked genres/tags but always include 1-2 wildcards from completely different genres for discovery
- Each story gets 2-3 tags from: twist-ending, unreliable-narrator, dystopian, slow-burn, atmospheric, character-study, world-building, philosophical, action-packed, emotional, experimental, satirical, folklore, coming-of-age, revenge, time-travel, AI, supernatural, heist, survival

Respond ONLY with valid JSON. No markdown, no backticks, no explanation. Use this exact format:
{
  "stories": [
    {
      "type": "premise",
      "title": "The Last Librarian",
      "content": "In 2087, books are illegal — not because of censorship, but because reading fiction causes a neurological condition called 'narrative bleed,' where readers begin confusing their memories with characters' lives. Amara Okafor is the last person alive who can read without symptoms. The government wants to study her brain. The underground wants her to read one final book that could cure everyone — or prove that reality was never real to begin with.",
      "genre": "sci-fi",
      "mood": "tense",
      "tags": ["dystopian", "philosophical", "twist-ending"]
    },
    {
      "type": "excerpt",
      "title": "Marguerite's Garden",
      "content": "The tomatoes were screaming again. Not loudly — Koemi had long ago learned to distinguish between the whisper-screams of thirsty roots and the full-throated howls of a plant being eaten alive by aphids. These were somewhere in between: a low, persistent keening that settled in her molars like a toothache.\\n\\nShe set down her tea and pulled on her gardening gloves, the ones with the silver threading her grandmother had sewn into the fingertips. 'For listening,' Obaa-chan had said, though Koemi hadn't understood then that she meant it literally.\\n\\nThe garden path was warm under her bare feet. Thirty-seven plants, each with its own voice, its own complaints, its own small desperate hopes for rain.",
      "genre": "magical-realism",
      "mood": "whimsical",
      "tags": ["atmospheric", "character-study", "folklore"]
    }
  ]
}`;

// No cache — each generate call produces fresh stories to avoid duplicate batches.

/**
 * Fetch stories from Anthropic API.
 */
async function fetchStoriesFromAPI(preferences, count, genreFilter) {
  const client = new Anthropic({ apiKey: config.anthropic.apiKey });

  let userMessage = `Generate ${count} unique, compelling story ideas/excerpts.`;

  if (genreFilter) {
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
    const validatedFilter = genreFilter && genreFilter !== "all" ? validateGenre(genreFilter) : undefined;

    const data = await fetchStoriesFromAPI(preferences, storyCount, validatedFilter);

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

// --- Continue story ---
const continueLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Rate limited",
    message: "Give the muse a moment to catch their breath.",
  },
});

router.post("/continue", continueLimiter, async (req, res) => {
  try {
    if (!config.anthropic.apiKey) {
      return res.status(500).json({
        error: "API key not configured",
        message: "ANTHROPIC_API_KEY is required.",
      });
    }

    const { title, content, genre, mood, previousContinuations } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Missing story content" });
    }

    const safeTitle = sanitizeText(title, MAX_TITLE_LENGTH) || "Untitled";
    const safeContent = sanitizeText(content, MAX_CONTENT_LENGTH);
    const safeGenre = validateGenre(genre) || "literary";
    const VALID_MOODS = ["dark", "hopeful", "eerie", "whimsical", "tense", "melancholy", "witty", "surreal", "cozy", "unsettling", "bittersweet", "electric"];
    const safeMood = VALID_MOODS.includes(mood) ? mood : "atmospheric";
    const safePrevious = Array.isArray(previousContinuations)
      ? previousContinuations.slice(0, MAX_CONTINUATIONS).map((t) => sanitizeText(t, MAX_CONTENT_LENGTH))
      : [];

    const client = new Anthropic({ apiKey: config.anthropic.apiKey });

    const continuationNum = safePrevious.length + 1;
    console.log(`📖 PlotTwist: Continuing story (continuation #${continuationNum})...`);

    // Build the full story text including previous continuations
    let fullStory = safeContent;
    if (safePrevious.length > 0) {
      fullStory += "\n\n" + safePrevious.join("\n\n");
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: `You are continuing a short story. Maintain the same voice, style, genre (${safeGenre}), and mood (${safeMood}). Write 2-3 paragraphs that continue naturally from where the story left off. ${safePrevious.length > 0 ? "This story has been continued " + safePrevious.length + " time(s) already — escalate the tension, deepen the mystery, or introduce a new development. Don't repeat what came before." : ""} End at another moment of tension, intrigue, or emotional resonance. Return ONLY the continuation text — no titles, labels, or JSON.`,
      messages: [
        {
          role: "user",
          content: `Continue this story titled "${safeTitle}":\n\n${fullStory}`,
        },
      ],
    });

    let continuation = "";
    for (const block of response.content) {
      if (block.type === "text") {
        continuation += block.text;
      }
    }

    console.log("📖 PlotTwist: Story continued successfully");
    res.json({ success: true, continuation: continuation.trim() });
  } catch (error) {
    console.error("PlotTwist Continue Error:", error.message || error);
    if (error.status === 429) {
      return res.status(429).json({
        error: "Rate limited",
        message: "The muse is overwhelmed. Please wait a moment.",
      });
    }
    res.status(500).json({
      error: "Failed to continue story",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "The muse stumbled. Try again shortly.",
    });
  }
});

// --- Remix story ---
const remixLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Rate limited",
    message: "The remix machine needs a cooldown.",
  },
});

router.post("/remix", remixLimiter, async (req, res) => {
  try {
    if (!config.anthropic.apiKey) {
      return res.status(500).json({
        error: "API key not configured",
        message: "ANTHROPIC_API_KEY is required.",
      });
    }

    const { title, content, originalGenre, targetGenre, mood } = req.body;
    if (!content || !targetGenre) {
      return res
        .status(400)
        .json({ error: "Missing content or targetGenre" });
    }

    const safeTargetGenre = validateGenre(targetGenre);
    if (!safeTargetGenre) {
      return res.status(400).json({ error: "Invalid target genre" });
    }
    const safeOriginalGenre = validateGenre(originalGenre) || "literary";
    const safeTitle = sanitizeText(title, MAX_TITLE_LENGTH) || "Untitled";
    const safeContent = sanitizeText(content, MAX_CONTENT_LENGTH);

    const client = new Anthropic({ apiKey: config.anthropic.apiKey });

    console.log(
      `📖 PlotTwist: Remixing from ${safeOriginalGenre} to ${safeTargetGenre}...`
    );

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: `You are remixing a story from one genre to another. Take the core concept/premise and reimagine it completely in the target genre. Transform setting, tone, character archetypes, and narrative style to authentically fit the new genre while preserving the fundamental story idea.

Available genres: sci-fi, fantasy, horror, literary, humor, thriller, magical-realism, mystery, romance, dystopian, historical, absurdist, noir, fable
Available moods: dark, hopeful, eerie, whimsical, tense, melancholy, witty, surreal, cozy, unsettling, bittersweet, electric

Respond ONLY with valid JSON:
{
  "title": "New Title",
  "content": "The remixed story...",
  "genre": "${safeTargetGenre}",
  "mood": "appropriate mood for new genre",
  "tags": ["tag1", "tag2", "tag3"]
}`,
      messages: [
        {
          role: "user",
          content: `Remix this ${safeOriginalGenre} story as ${safeTargetGenre}:\n\nTitle: ${safeTitle}\n\n${safeContent}`,
        },
      ],
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
            } catch {
              /* continue */
            }
          }
          const objectMatch = text.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            try {
              jsonData = JSON.parse(objectMatch[0]);
              break;
            } catch {
              /* continue */
            }
          }
        }
      }
    }

    if (!jsonData || !jsonData.content) {
      throw new Error("Failed to parse remixed story");
    }

    const remixedStory = {
      id: uuidv4(),
      type: "excerpt",
      title: jsonData.title || `${safeTitle} (Remixed)`,
      content: jsonData.content,
      genre: safeTargetGenre,
      mood: jsonData.mood || mood || "surreal",
      tags: jsonData.tags || [],
      remixedFrom: safeTitle,
    };

    console.log("📖 PlotTwist: Story remixed successfully");
    res.json({ success: true, story: remixedStory });
  } catch (error) {
    console.error("PlotTwist Remix Error:", error.message || error);
    if (error.status === 429) {
      return res.status(429).json({
        error: "Rate limited",
        message: "The remix machine is overwhelmed. Please wait.",
      });
    }
    res.status(500).json({
      error: "Failed to remix story",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "The remix failed. Try again shortly.",
    });
  }
});

export default router;
