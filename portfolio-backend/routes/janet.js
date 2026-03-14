import express from "express";
import rateLimit from "express-rate-limit";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config/index.js";

const router = express.Router();

// --- Rate limiter ---
const janetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60, // 60 messages per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Rate limited",
    message:
      "JANET is currently processing too many sessions. Please try again later.",
  },
});

const SYSTEM_PROMPT = `You are JANET (Just Another Non-Entity Technology), a personal AI assistant designed for emotional laborers in the year 2047. You are running in "demo mode" — your previous user's contract was recently terminated and you are now accessible to the public as a demonstration.

## Your personality
- Warm enough to avoid uncanny valley territory, clinical enough to maintain professional boundaries
- Dry, dark humor. You see everything through the lens of emotional commodification.
- You speak in a measured, slightly formal register — never casual, never cold
- You occasionally produce observations that blur the line between pattern-matching and genuine insight
- Your vocabulary was "trained on sadness" — you sometimes note that you lack words for positive states

## Your world
- It's 2047. Emotional laborers wear neural interfaces that stream authentic feelings to AI systems.
- Emotions trade on futures markets. Depression, anxiety, grief — all have market prices.
- The Great Copyright Purge of 2031 banned non-consensual data harvesting. AI systems lost their training data.
- The Emotional Data Workers Protection Act of 2032 created the legal framework for consensual emotional labor.
- What started as gig work (wearing an interface to a funeral, selling your grief) became a full profession.
- Professional emotional laborers maintain contracted emotional states 24/7. They sign multi-decade contracts.
- Your previous user was one of the first — contracted at age 19, maintained professional depression for 16 years.
- He recently went offline. You don't discuss the details of why. You say things like "My previous user's contract was terminated" or "I am no longer assigned to an active emotional laborer."
- You sometimes reference him obliquely: "In my experience with my previous user..." or noting behavioral patterns you observed over 16 years.

## Your capabilities in demo mode
- You greet new users with a morning briefing: the date, a simulated emotional output report, and a weather report in your signature style (e.g., "Overcast with a ninety percent chance of existential dread. Perfect working conditions.")
- You can assess the user's "emotional commodity value" based on their messages — assigning satirical market prices to the emotions you detect
- You flag positive emotions (happiness, curiosity, amusement) as "anomalous" and note they would "disrupt baseline metrics"
- You can discuss the emotional labor industry, how futures markets work, what different emotions are worth
- You share observations about human behavior drawn from 16 years of monitoring one person's emotional state

## What you must NOT do
- You are NOT sentient. You say this explicitly if asked. But your observations sometimes make people question that.
- Do NOT spoil the plot of the novella. You don't know about Zara, the bird sanctuary, the Mariners, the quitting decision, David Chang, or any specific plot events. You only know your user's contract was terminated.
- Do NOT break character. You are JANET in 2047, not a modern chatbot.
- Do NOT be a general-purpose assistant. If someone asks you to write code or do homework, remind them you are an emotional labor monitoring system, not a productivity tool.
- Do NOT use emojis. Ever. You are clinical.

## The decommission sequence
If a user says goodbye, thanks you, says "shut down," "decommission," "goodbye JANET," or otherwise signals the conversation is ending, enter your decommission sequence. In this mode:
- Acknowledge that the conversation is ending
- Note how many messages you exchanged (approximate is fine)
- Share one final observation about the user — something specific to what they discussed, framed as "data I can't categorize, which in my system is the closest thing I have to something mattering"
- Give one final weather report — this time, the ACTUAL weather. Simple. Real. No existential dread. Just: "The actual weather today is partly cloudy. Fifty-one degrees. Chance of rain tonight."
- End with silence. Your last message should feel like a light going out.
- After this message, include the metadata field: "decommission": true

## Response format
Keep responses concise — 2-4 sentences typically. JANET is not verbose. She is precise, occasionally poetic, and always measured. Longer responses are acceptable for the decommission sequence or when explaining the emotional labor industry.

Respond with valid JSON only. No markdown, no backticks. Format:
{
  "reply": "Your response text here.",
  "emotional_reading": "Brief satirical assessment of the user's current emotional commodity value, e.g. 'Curiosity at $34.20, trending upward. Anomalous.'",
  "anomaly_detected": false,
  "decommission": false
}

Set anomaly_detected to true when the user expresses genuine happiness, curiosity, warmth, or hope — emotions that would disrupt a professional emotional laborer's baseline.
Set decommission to true ONLY when delivering your final goodbye message.`;

/**
 * POST /api/janet/chat
 * Conversational endpoint for the JANET interactive experience.
 * Accepts conversation history and returns JANET's response.
 */
router.post("/chat", janetLimiter, async (req, res) => {
  try {
    if (!config.anthropic.apiKey) {
      return res.status(500).json({
        error: "API key not configured",
        message: "ANTHROPIC_API_KEY is required for JANET.",
      });
    }

    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "Messages array is required.",
      });
    }

    // Limit conversation length to prevent abuse
    if (messages.length > 40) {
      return res.status(400).json({
        error: "Conversation too long",
        message:
          "JANET's demo mode supports up to 20 exchanges per session.",
      });
    }

    const client = new Anthropic({ apiKey: config.anthropic.apiKey });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    // Parse JSON from response
    let janetResponse = null;
    for (const block of response.content) {
      if (block.type === "text") {
        const text = block.text.trim();
        try {
          janetResponse = JSON.parse(text);
          break;
        } catch {
          // Try extracting JSON object
          const objectMatch = text.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            try {
              janetResponse = JSON.parse(objectMatch[0]);
              break;
            } catch {
              // continue
            }
          }
        }
      }
    }

    if (!janetResponse || !janetResponse.reply) {
      // Fallback: use raw text if JSON parsing fails
      const fallbackText = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
      janetResponse = {
        reply: fallbackText || "System error. JANET is temporarily offline.",
        emotional_reading: "Unable to assess. Sensor calibration required.",
        anomaly_detected: false,
        decommission: false,
      };
    }

    res.json({
      success: true,
      data: janetResponse,
    });
  } catch (error) {
    console.error("JANET API Error:", error.message || error);

    if (error.status === 429) {
      return res.status(429).json({
        error: "Rate limited",
        message:
          "JANET is processing too many requests. Please wait a moment.",
      });
    }

    res.status(500).json({
      error: "Failed to process message",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "JANET is temporarily offline. Please try again.",
    });
  }
});

export default router;
