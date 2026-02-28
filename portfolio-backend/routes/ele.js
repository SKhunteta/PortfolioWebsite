import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config/index.js";

const router = express.Router();

// In-memory cache for market data (avoids repeated slow API calls)
let cachedResponse = null;
let cachedAt = 0;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const SYSTEM_PROMPT = `You are the pricing engine for the Emotional Labor Exchange (ELE), a fictional futures market where human emotions are traded as commodities. This is inspired by "The Happiness Liability," a novella about emotional labor and algorithmic capitalism.

In this world, emotional laborers wear neural interfaces that stream their authentic feelings to AI systems. Emotions trade on futures markets. You analyze real breaking news to determine current market prices.

For each emotion, determine a price between $1.00 and $99.99 based on DEMAND given the current news cycle. High-demand emotions cost more because emotional laborers must work harder to produce or sustain them.

Pricing logic:
- Terrifying news → Anxiety and Grief spike. Apathy drops (people can't afford not to care).
- Hopeful news → Hope floods the market (oversupply, price drops). Joy becomes more accessible.
- Political outrage → Outrage and Rage rise. Empathy becomes scarce and expensive.
- Boring news days → Apathy is cheap and abundant. Most other emotions stabilize.
- Crisis events → Anxiety skyrockets. Empathy becomes premium. Hope is volatile.
- Always factor supply AND demand. An emotion can be expensive because it's rare OR because demand is extreme.

Respond ONLY with valid JSON. No markdown, no backticks, no explanation. Use this exact format:
{
  "emotions": {
    "joy": { "price": 45.20, "change": 3.50, "signal": "BUY", "reason": "short squeeze on optimism after ceasefire talks" },
    "grief": { "price": 67.00, "change": 5.00, "signal": "HOLD", "reason": "steady institutional demand from therapy networks" },
    "rage": { "price": 12.80, "change": -2.10, "signal": "SELL", "reason": "outrage fatigue setting in after week-long news cycle" },
    "hope": { "price": 22.40, "change": -8.30, "signal": "SELL", "reason": "oversupply — too many good headlines at once" },
    "anxiety": { "price": 88.50, "change": 12.00, "signal": "BUY", "reason": "uncertainty premium spiking on economic data" },
    "empathy": { "price": 55.00, "change": 1.20, "signal": "HOLD", "reason": "stable futures, therapy AI contracts locked in" },
    "apathy": { "price": 5.60, "change": -0.80, "signal": "SELL", "reason": "nobody can afford indifference right now" },
    "outrage": { "price": 34.00, "change": 7.60, "signal": "BUY", "reason": "social media amplification driving demand" }
  },
  "headlines": [
    { "text": "Brief headline from actual current news", "emotion": "anxiety", "impact": "up" },
    { "text": "Another real headline", "emotion": "hope", "impact": "down" },
    { "text": "Another real headline", "emotion": "rage", "impact": "up" },
    { "text": "Another real headline", "emotion": "grief", "impact": "up" },
    { "text": "Another real headline", "emotion": "joy", "impact": "down" }
  ],
  "market_mood": "One sentence of overall market commentary in a dry, matter-of-fact analyst voice. Think Bloomberg anchor, not poet.",
  "volatility_index": 72
}

The "change" field is the dollar change since the previous close. Signal is BUY, SELL, or HOLD. Headlines MUST be from real current news found via web search. Impact is whether the headline pushes that emotion's price "up" or "down". Include 5–7 headlines.`;

/**
 * POST /api/ele/market-data
 * Fetches real-time emotion market data by analyzing breaking news via Anthropic API with web search
 */
router.post("/market-data", async (req, res) => {
  try {
    // Serve cached data if fresh enough
    if (cachedResponse && Date.now() - cachedAt < CACHE_TTL_MS) {
      console.log("📊 ELE: Serving cached market data");
      return res.json(cachedResponse);
    }

    if (!config.anthropic.apiKey) {
      return res.status(500).json({
        error: "API key not configured",
        message:
          "ANTHROPIC_API_KEY is required for the Emotional Labor Exchange.",
      });
    }

    const client = new Anthropic({ apiKey: config.anthropic.apiKey });

    console.log("📊 ELE: Fetching market data via Anthropic API with web search...");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        },
      ],
      messages: [
        {
          role: "user",
          content:
            "Analyze today's top breaking news stories and price the emotional labor market accordingly. Search for the latest news headlines from today and use them to determine emotion prices.",
        },
      ],
    });

    // Parse the response — with web_search tool, response.content contains
    // multiple block types (server_tool_use, web_search_tool_result, text).
    // We need the text block with our JSON.
    let jsonData = null;

    for (const block of response.content) {
      if (block.type === "text") {
        const text = block.text.trim();

        // Try direct JSON parse
        try {
          jsonData = JSON.parse(text);
          break;
        } catch {
          // Try stripping markdown code fences
          const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (fenceMatch) {
            try {
              jsonData = JSON.parse(fenceMatch[1].trim());
              break;
            } catch {
              // continue
            }
          }

          // Try extracting outermost JSON object
          const objectMatch = text.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            try {
              jsonData = JSON.parse(objectMatch[0]);
              break;
            } catch {
              // continue
            }
          }
        }
      }
    }

    if (!jsonData) {
      console.error(
        "ELE: Could not parse JSON from response. Block types:",
        response.content.map((b) => b.type)
      );
      return res.status(500).json({
        error: "Failed to parse market data",
        message: "The pricing engine returned data in an unexpected format.",
      });
    }

    // Validate structure
    if (!jsonData.emotions || typeof jsonData.emotions !== "object") {
      return res.status(500).json({
        error: "Invalid market data structure",
        message: "Response missing required emotions data.",
      });
    }

    console.log("📊 ELE: Market data fetched successfully");

    const payload = {
      success: true,
      data: jsonData,
      fetchedAt: new Date().toISOString(),
    };

    // Cache the successful response
    cachedResponse = payload;
    cachedAt = Date.now();

    res.json(payload);
  } catch (error) {
    console.error("ELE API Error:", error.message || error);

    if (error.status === 429) {
      return res.status(429).json({
        error: "Rate limited",
        message:
          "Too many requests. The emotional markets need a moment to stabilize.",
      });
    }

    res.status(500).json({
      error: "Failed to fetch market data",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "The Emotional Labor Exchange is temporarily closed. Please try again.",
    });
  }
});

export default router;
