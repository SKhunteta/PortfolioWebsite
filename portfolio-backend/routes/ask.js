import express from "express";
import OpenAIService from "../services/openai.js";
import QdrantService from "../services/qdrant.js";
import IndexerService from "../services/indexer.js";
import { config } from "../config/index.js";
import { v4 as uuidv4 } from "uuid";
import setup from "../setup.js";

const router = express.Router();

// Middleware to track request timing
router.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

/**
 * POST /api/ask
 * Handle natural language questions about the portfolio
 */
router.post("/", async (req, res) => {
  try {
    const { question, context } = req.body;

    if (!question) {
      return res.status(400).json({
        error: "Question is required",
        message: "Please provide a question to ask about the portfolio",
      });
    }

    console.log(`🤖 Question received: "${question}"`);

    // Generate embedding for the question
    const questionEmbedding = await OpenAIService.generateEmbedding(question);

    // Search for relevant content
    const searchResults = await QdrantService.search(questionEmbedding, 5);

    // Generate AI response
    const aiResponse = await OpenAIService.generateResponse(
      question,
      searchResults
    );

    // Calculate response time
    const responseTime = Date.now() - req.startTime;

    res.json({
      answer: aiResponse.answer,
      sources: aiResponse.sources,
      timestamp: aiResponse.timestamp,
      responseTime: `${responseTime}ms`,
      relevantContent: searchResults.length,
    });
  } catch (error) {
    console.error("Error processing question:", error);
    res.status(500).json({
      error: "Failed to process question",
      message:
        "An error occurred while processing your question. Please try again.",
    });
  }
});

/**
 * GET /api/ask/suggestions
 * Get suggested questions based on content types
 */
router.get("/suggestions", (req, res) => {
  const suggestions = {
    general: [
      "Tell me about Shreyans",
      "What technologies does he work with?",
      "Show me his featured projects",
      "What's his experience in AI?",
    ],
    projects: [
      "Show me React projects",
      "What AI projects has he built?",
      "Tell me about the Lingua AI Chatbot",
      "What healthcare projects has he worked on?",
    ],
    skills: [
      "What programming languages does he know?",
      "Experience with cloud technologies?",
      "What's his background in data engineering?",
      "AI and machine learning skills?",
    ],
    experience: [
      "What's his current role?",
      "Leadership experience?",
      "Healthcare technology background?",
      "Career achievements?",
    ],
    personal: [
      "How can I contact him?",
      "Where is he located?",
      "What are his interests?",
      "Check out his blog",
    ],
  };

  res.json(suggestions);
});

/*
// All other routes commented out for troubleshooting
router.post("/search", async (req, res) => { ... });
router.get("/status", async (req, res) => { ... });
router.post("/reindex", async (req, res) => { ... });
*/

/**
 * Format search results for API response
 */
function formatSearchResults(searchResults) {
  return searchResults.map((result) => ({
    id: result.id,
    score: result.score,
    type: result.payload.content_type,
    title: result.payload.title,
    description: result.payload.description,
    technologies: result.payload.technologies || [],
    url: result.payload.url,
    metadata: {
      featured: result.payload.featured,
      experienceLevel: result.payload.experience_level,
      category: result.payload.category,
      role: result.payload.role,
      company: result.payload.company,
    },
  }));
}

// Manual setup endpoint for debugging
router.post("/setup", async (req, res) => {
  try {
    console.log("📋 Manual setup triggered via API");
    await setup();
    res.json({
      success: true,
      message: "Setup completed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Manual setup failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Collection info endpoint for debugging
router.get("/collection-info", async (req, res) => {
  try {
    const info = await QdrantService.getCollectionInfo();
    res.json({
      success: true,
      collection: info,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Qdrant health check endpoint
router.get("/qdrant-health", async (req, res) => {
  try {
    const isHealthy = await QdrantService.healthCheck();
    const collections = isHealthy
      ? await QdrantService.client.getCollections()
      : null;

    res.json({
      success: true,
      healthy: isHealthy,
      collections: collections?.collections?.map((c) => c.name) || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Initialize Qdrant collection endpoint
router.post("/init-collection", async (req, res) => {
  try {
    console.log("📋 Manual collection initialization triggered via API");
    await QdrantService.initializeCollection();
    res.json({
      success: true,
      message: "Collection initialized successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Manual collection initialization failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
