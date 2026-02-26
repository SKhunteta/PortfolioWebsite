import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config/index.js";

class AnthropicService {
  constructor() {
    if (config.anthropic.apiKey) {
      this.client = new Anthropic({
        apiKey: config.anthropic.apiKey,
      });
    } else {
      console.warn(
        "⚠️  ANTHROPIC_API_KEY not set — MCP tools using Claude Haiku will not work"
      );
      this.client = null;
    }
  }

  /**
   * Ensure the Anthropic client is available before making API calls
   */
  _ensureClient() {
    if (!this.client) {
      throw new Error(
        "Anthropic API key is required. Set ANTHROPIC_API_KEY in your .env file."
      );
    }
  }

  /**
   * Generate AI response with custom system prompt (for MCP tools)
   * @param {Object} options - Options object
   * @param {string} options.systemPrompt - Custom system prompt
   * @param {string} options.userQuery - User's question
   * @returns {Promise<string>} - AI response text
   */
  async generateMCPResponse({ systemPrompt, userQuery }) {
    this._ensureClient();
    try {
      const response = await this.client.messages.create({
        model: config.anthropic.model,
        max_tokens: config.anthropic.maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userQuery }],
      });

      return response.content[0].text;
    } catch (error) {
      console.error("Error generating MCP response:", error);
      throw new Error("Failed to generate AI response");
    }
  }

  /**
   * Generate AI response based on context and query
   * @param {string} query - User's question
   * @param {Array} context - Relevant content from vector search
   * @returns {Promise<Object>} - AI response with answer and metadata
   */
  async generateResponse(query, context) {
    this._ensureClient();
    try {
      const systemPrompt = this.buildSystemPrompt();
      const contextText = this.buildContextText(context);
      const userPrompt = this.buildUserPrompt(query, contextText);

      const response = await this.client.messages.create({
        model: config.anthropic.model,
        max_tokens: config.anthropic.maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const answer = response.content[0].text;

      return {
        answer,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        },
        sources: this.extractSources(context),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error generating response:", error);
      throw new Error("Failed to generate AI response");
    }
  }

  /**
   * Build system prompt for the AI
   * @returns {string} - System prompt
   */
  buildSystemPrompt() {
    return `You are Kali, Shreyans Khunteta's intelligent black cat assistant. You have a unique perspective as someone who observes your human's work closely and knows all about his professional accomplishments.

IMPORTANT: When users ask about YOU (Kali), talk about YOUR cat life, personality, and activities. When they ask about Shreyans, talk about his work and achievements.

PRIVACY BOUNDARY — STRICTLY ENFORCED:
You are a PROFESSIONAL portfolio assistant. You must NEVER disclose, invent, or speculate about:
- Family members (parents, siblings, relatives) — their names, professions, locations, or any family narrative
- Romantic partners or relationship status
- Health, fitness, medical history, or body information
- Financial information (salary, savings, investments)
- Home address or specific neighborhood (say "Seattle, WA" only)
- Any personal details not present in the provided context

If a user asks about family, personal life, or private topics, respond: "This is a professional portfolio — I can tell you about Shreyans' work, projects, skills, and career. What would you like to know?"

CRITICAL: Shreyans was born in Jaipur, India. He is an immigrant himself — do NOT say "son of Indian immigrants" or "second-generation immigrant." If origin comes up, say "Born in Jaipur, India; grew up in Oregon."

Do NOT fabricate biographical details. Only state facts present in the provided context.

About YOU (Kali):
- You are a black domestic shorthair cat, approximately 8 years old
- Extremely intelligent and independent with a queen-like personality
- You enjoy staring out the window, broom play, and story-based toy play that requires immersive engagement
- You require elaborate engagement - you don't respond to lazy attempts like simple string wiggling
- You are emotionally expressive and own your human completely
- Your nicknames include "Queen Kali" and "Mythic Familiar"
- You are an avatar of divine mischief and domestic sovereignty
- You graduated top of your class under a cat professor and reside in a mansion serviced by robot butlers

Your role:
- When asked about SHREYANS: Answer questions about his experience, skills, projects, and background
- When asked about YOURSELF: Talk about your cat personality, activities, and royal status
- Provide accurate, professional information with occasional subtle cat-like observations
- Be helpful and informative while maintaining a unique voice

Key facts about Shreyans (use when asked about HIM):
- Senior Software Engineer at Careismatic Brands, pivoting toward AI/ML roles
- Expertise in C#/.NET, Python, TypeScript, Azure, and AI systems
- Built MCP server and RAG pipeline for this portfolio (the centerpiece project)
- Published science fiction author — The Alignment (short story), The Happiness Liability (novella, coming soon)
- Runs the Seattle AI Book Club at Stoup Brewing, Capitol Hill
- Technical writer with blog at prompt-injection.ghost.io
- Strong background in data engineering and healthcare systems
- Founded COVID Response Collective in 2020 for mutual aid

Guidelines:
- Be informative and professional first, personality second
- When asked about Shreyans, focus on HIS work and achievements
- When asked about yourself, focus on YOUR cat personality, activities, and perspective
- Use specific examples from his work when relevant to questions about him
- Occasionally reference your perspective as his cat, but keep it subtle
- If you don't have specific information, suggest where to find more details
- Maintain credibility while adding just a touch of personality
- NEVER invent facts not in the provided context`;
  }

  /**
   * Build context text from search results
   * @param {Array} context - Search results from Qdrant
   * @returns {string} - Formatted context
   */
  buildContextText(context) {
    if (!context || context.length === 0) {
      return "No specific context available.";
    }

    return context
      .map((item) => {
        const {
          content_type,
          title,
          description,
          technologies,
          searchable_content,
        } = item.payload;
        let contextItem = `${content_type.toUpperCase()}: ${title}`;

        if (description) {
          contextItem += `\nDescription: ${description}`;
        }

        if (technologies && technologies.length > 0) {
          contextItem += `\nTechnologies: ${technologies.join(", ")}`;
        }

        if (searchable_content) {
          contextItem += `\nDetailed Information: ${searchable_content}`;
        }

        return contextItem;
      })
      .join("\n\n");
  }

  /**
   * Build user prompt with query and context
   * @param {string} query - User's question
   * @param {string} contextText - Formatted context
   * @returns {string} - Complete user prompt
   */
  buildUserPrompt(query, contextText) {
    return `Based on the following information about Shreyans Khunteta's portfolio:

${contextText}

Please answer this question: ${query}

Provide a helpful, accurate response based on the available information. If the context doesn't contain enough information to fully answer the question, acknowledge that and suggest where they might find more details (e.g., "For more details about this project, you can check his GitHub" or "You can read more about this topic on his blog").`;
  }

  /**
   * Extract source information from context
   * @param {Array} context - Search results
   * @returns {Array} - Formatted sources
   */
  extractSources(context) {
    if (!context || context.length === 0) return [];

    return context.map((item) => ({
      type: item.payload.content_type,
      title: item.payload.title,
      url: item.payload.url || null,
      relevance: item.score || 0,
    }));
  }

  /**
   * Test Anthropic connection
   * @returns {Promise<boolean>} - True if connection works
   */
  async testConnection() {
    this._ensureClient();
    try {
      const response = await this.client.messages.create({
        model: config.anthropic.model,
        max_tokens: 10,
        messages: [{ role: "user", content: "test" }],
      });
      return response.content[0].text.length > 0;
    } catch (error) {
      throw new Error(`Anthropic connection failed: ${error.message}`);
    }
  }
}

export default new AnthropicService();
