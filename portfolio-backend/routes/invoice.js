import express from "express";
import rateLimit from "express-rate-limit";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config/index.js";
import { getMarketData } from "./ele.js";

const router = express.Router();

// --- Rate limiter ---
const invoiceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Rate limited",
    message:
      "Your emotional labor is being processed. Please wait before filing another invoice.",
  },
});

// --- Modifier multipliers ---
const MODIFIER_MULTIPLIERS = {
  while_working: { multiplier: 1.25, label: "Dual-tasking surcharge (1.25×)" },
  code_switching: {
    multiplier: 1.5,
    label: "Code-switching surcharge (1.5×)",
  },
  expected: {
    multiplier: 1.3,
    label: "Unasked labor premium (1.3×)",
  },
  invisible: { multiplier: 1.4, label: "Invisibility tax (1.4×)" },
  suppressed_emotions: {
    multiplier: 2.0,
    label: "Emotional suppression fee (2.0×)",
  },
  recurring: { multiplier: 1.75, label: "Recurring labor surcharge (1.75×)" },
  language_barrier: {
    multiplier: 1.5,
    label: "Cross-linguistic premium (1.5×)",
  },
  power_imbalance: {
    multiplier: 1.35,
    label: "Power differential adjustment (1.35×)",
  },
  unacknowledged: {
    multiplier: 1.25,
    label: "Zero-recognition surcharge (1.25×)",
  },
};

const SYSTEM_PROMPT = `You are a billing specialist for the Emotional Labor Exchange. You receive descriptions of real emotional labor and produce itemized invoices. Your line items should be precise and clinical in tone — the language of consulting and professional services — but describe labor that has never been formally acknowledged. Do not editorialize. Do not comfort. The invoice format itself is the statement. Break the described labor into 3-5 distinct billable services. Each line item should name a specific skill or service that was performed.

Use the provided base rate as a starting point for pricing individual line items. Line item rates should vary around the base rate — some services cost more, some less — but the subtotal should feel proportional to the duration and intensity described.

Return ONLY valid JSON in this structure:
{
  "line_items": [
    {
      "description": "string (2-3 lines, professional register, describing a specific emotional service performed)",
      "quantity": "string (time duration or unit count, e.g. '1 hr', '3 sessions', '1 event')",
      "rate": number,
      "amount": number
    }
  ],
  "subtotal": number,
  "notes": "string (1 sentence, dry, devastating — an observation about the nature of this labor that reads like fine print on an invoice)"
}

Do not include markdown, backticks, or explanation. Return only the JSON object.`;

/**
 * POST /api/invoice/generate
 * Generates an emotional labor invoice using Claude API and ELE market data.
 */
router.post("/generate", invoiceLimiter, async (req, res) => {
  try {
    const { client, description, duration, emotions, modifiers } = req.body;

    // Validate required fields
    if (!client || !description || !duration || !emotions?.length) {
      return res.status(400).json({
        error: "Missing required fields",
        message:
          "Client, description, duration, and at least one emotion are required.",
      });
    }

    if (!config.anthropic.apiKey) {
      return res.status(500).json({
        error: "API key not configured",
        message:
          "ANTHROPIC_API_KEY is required for invoice generation.",
      });
    }

    // Fetch current ELE market prices
    let emotionPrices = {};
    try {
      const marketData = await getMarketData();
      if (marketData?.emotions) {
        emotionPrices = marketData.emotions;
      }
    } catch (err) {
      console.warn(
        "Invoice: Could not fetch ELE market data, using fallback prices:",
        err.message
      );
    }

    // Calculate base rate from selected emotions
    const selectedPrices = emotions
      .map((e) => emotionPrices[e]?.price)
      .filter((p) => typeof p === "number");
    const baseRate =
      selectedPrices.length > 0
        ? selectedPrices.reduce((sum, p) => sum + p, 0) / selectedPrices.length
        : 45.0; // fallback base rate

    // Build emotion context for prompt
    const emotionContext = emotions
      .map((e) => {
        const price = emotionPrices[e]?.price;
        return price ? `${e} (current market price: $${price.toFixed(2)})` : e;
      })
      .join(", ");

    // Build user prompt
    const userPrompt = `Generate an invoice for the following emotional labor:

Client: ${client}
Service description: ${description}
Duration: ${duration}
Emotional categories involved: ${emotionContext}
Base rate (average of selected emotions): $${baseRate.toFixed(2)}/hr

Price the line items using rates that feel proportional to a base rate of ~$${baseRate.toFixed(2)}/hr. The subtotal should reflect the duration: "${duration}".`;

    // Call Claude API
    const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    // Parse response
    let invoiceData = null;
    for (const block of response.content) {
      if (block.type === "text") {
        const text = block.text.trim();
        try {
          invoiceData = JSON.parse(text);
          break;
        } catch {
          const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (fenceMatch) {
            try {
              invoiceData = JSON.parse(fenceMatch[1].trim());
              break;
            } catch {
              // continue
            }
          }
          const objectMatch = text.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            try {
              invoiceData = JSON.parse(objectMatch[0]);
              break;
            } catch {
              // continue
            }
          }
        }
      }
    }

    if (!invoiceData || !invoiceData.line_items) {
      console.error("Invoice: Could not parse Claude response");
      return res.status(500).json({
        error: "Generation failed",
        message:
          "The billing department is experiencing technical difficulties. Please try again.",
      });
    }

    // Calculate surcharges from modifiers
    const activeModifiers = modifiers || [];
    const surcharges = activeModifiers
      .filter((m) => MODIFIER_MULTIPLIERS[m])
      .map((m) => {
        const { multiplier, label } = MODIFIER_MULTIPLIERS[m];
        const amount =
          Math.round(invoiceData.subtotal * (multiplier - 1) * 100) / 100;
        return { label, amount };
      });

    const surchargeTotal = surcharges.reduce((sum, s) => sum + s.amount, 0);
    const total =
      Math.round((invoiceData.subtotal + surchargeTotal) * 100) / 100;

    // Generate invoice number
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    const invoiceNumber = `ELE-${year}-${month}-${suffix}`;

    // Format date
    const dateStr = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Assemble response
    const invoice = {
      invoice_number: invoiceNumber,
      date: dateStr,
      client,
      from: "The Person Who Held It Together",
      line_items: invoiceData.line_items,
      subtotal: invoiceData.subtotal,
      surcharges,
      total,
      payment_terms:
        "This invoice will never be paid. It is presented as evidence that the work was real.",
      notes:
        invoiceData.notes ||
        "Market rates sourced from the Emotional Labor Exchange.",
      footer_note:
        "Thank you for your business. Or rather, thank you for nothing, which is what you paid.",
    };

    res.json({ success: true, invoice });
  } catch (error) {
    console.error("Invoice API Error:", error.message || error);

    if (error.status === 429) {
      return res.status(429).json({
        error: "Rate limited",
        message:
          "The billing department is overwhelmed. Please try again shortly.",
      });
    }

    res.status(500).json({
      error: "Failed to generate invoice",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "The Emotional Labor Invoice Generator is temporarily unavailable. Please try again.",
    });
  }
});

export default router;
