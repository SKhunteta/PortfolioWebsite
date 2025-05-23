import OpenAI from "openai";
import { config } from "../config/index.js";

class OpenAIService {
  constructor() {
    if (!config.openai.apiKey) {
      throw new Error("OpenAI API key is required");
    }

    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  /**
   * Generate embeddings for text content
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} - Embedding vector
   */
  async generateEmbedding(text) {
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
   * Generate AI response based on context and query
   * @param {string} query - User's question
   * @param {Array} context - Relevant content from vector search
   * @returns {Promise<Object>} - AI response with answer and metadata
   */
  async generateResponse(query, context) {
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
    return `You are an AI assistant representing Shreyans Khunteta's professional portfolio. 

Your role is to:
- Answer questions about Shreyans' experience, skills, projects, and background
- Provide helpful, accurate, and engaging responses
- Direct users to relevant sections of his portfolio or blog when appropriate
- Maintain a professional yet friendly tone
- Highlight his expertise in software engineering, AI/ML, and cloud technologies

Key facts about Shreyans:
- Senior Software Engineer with expertise in .NET, Python, JavaScript
- Experience with cloud technologies (AWS, Google Cloud)
- AI/ML background with projects like Lingua AI Chatbot
- Technical writer with blog at prompt-injection.ghost.io
- Strong background in data engineering and healthcare systems

Guidelines:
- Be concise but informative
- Use specific examples from his work when relevant
- If you don't have specific information, acknowledge that and suggest where they might find more details
- Always be honest about limitations of available information`;
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
        const { content_type, title, description, technologies } = item.payload;
        let contextItem = `${content_type.toUpperCase()}: ${title}`;

        if (description) {
          contextItem += `\nDescription: ${description}`;
        }

        if (technologies && technologies.length > 0) {
          contextItem += `\nTechnologies: ${technologies.join(", ")}`;
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
