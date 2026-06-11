import dotenv from "dotenv";

dotenv.config({ override: true });

export const config = {
  // API Keys
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o-mini",
    embeddingModel: "text-embedding-3-small",
    maxTokens: 1000,
    temperature: 0.7,
  },

  // Anthropic Configuration (used by MCP tools)
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: "claude-haiku-4-5-20251001",
    maxTokens: 1000,
  },

  // Qdrant Configuration
  qdrant: {
    url: process.env.QDRANT_URL || "http://localhost:6333",
    apiKey: process.env.QDRANT_API_KEY,
    collection: "portfolio_content",
    vectorSize: 1536,
    distance: "Cosine",
  },

  // Ghost.io Configuration
  ghost: {
    url: process.env.GHOST_URL || "https://prompt-injection.ghost.io",
    apiKey: process.env.GHOST_API_KEY,
    version: "v3",
  },

  // OneBusAway Puget Sound (Link light rail arrivals)
  // Request a free key from oba_api_key@soundtransit.org
  oneBusAway: {
    apiKey: process.env.OBA_API_KEY,
  },

  // Server Configuration
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || "development",
  },

  // Portfolio Data Structure
  portfolio: {
    owner: {
      name: "Shreyans Khunteta",
      title: "Software Engineer",
      email: "shreyans.khunteta@gmail.com",
      website: "https://builtbyshrey.com",
      linkedin: "https://www.linkedin.com/in/shreyans-khunteta-3167247a/",
      github: "https://github.com/SKhunteta",
      blog: "https://prompt-injection.ghost.io",
    },
  },
};
