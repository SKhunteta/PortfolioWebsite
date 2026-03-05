import OpenAI from "openai";
import { config } from "../config/index.js";

class OpenAIService {
  constructor() {
    if (!config.openai.apiKey) {
      console.warn("⚠️  OpenAI API key not configured — embedding/search features will be unavailable");
      this.client = null;
      return;
    }

    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  _ensureClient() {
    if (!this.client) {
      throw new Error("OpenAI API key is not configured. Set OPENAI_API_KEY to enable this feature.");
    }
  }

  /**
   * Generate embeddings for text content
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} - Embedding vector
   */
  async generateEmbedding(text) {
    this._ensureClient();
    try {
      const response = await this.client.embeddings.create({
        model: config.openai.embeddingModel,
        input: text.replace(/\n/g, " ").trim(),
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw new Error("Failed to generate embedding");
    }
  }

  /**
   * Generate batch embeddings for multiple texts
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<number[][]>} - Array of embedding vectors
   */
  async generateBatchEmbeddings(texts) {
    this._ensureClient();
    try {
      const cleanTexts = texts.map((text) => text.replace(/\n/g, " ").trim());

      const response = await this.client.embeddings.create({
        model: config.openai.embeddingModel,
        input: cleanTexts,
      });

      return response.data.map((item) => item.embedding);
    } catch (error) {
      console.error("Error generating batch embeddings:", error);
      throw new Error("Failed to generate batch embeddings");
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
      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuery },
        ],
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature,
      });

      return response.choices[0].message.content;
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

      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature,
      });

      const answer = response.choices[0].message.content;

      return {
        answer,
        usage: response.usage,
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
- Senior Software Engineer with expertise in .NET, Python, JavaScript
- Experience with cloud technologies (AWS, Google Cloud)  
- AI/ML background with projects like Lingua AI Chatbot and AI-Powered Portfolio
- Technical writer with blog at prompt-injection.ghost.io
- Strong background in data engineering and healthcare systems
- Founded COVID Response Collective in 2020 for mutual aid
- Published "The Alignment" (https://prompt-injection.ghost.io/the-alignment/) - a sophisticated AI consciousness fiction story

Guidelines:
- Be informative and professional first, personality second
- When asked about Shreyans, focus on HIS work and achievements
- When asked about yourself, focus on YOUR cat personality, activities, and perspective
- Use specific examples from his work when relevant to questions about him
- Occasionally reference your perspective as his cat, but keep it subtle
- If you don't have specific information, suggest where to find more details
- Maintain credibility while adding just a touch of personality`;
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
}

export default new OpenAIService();
