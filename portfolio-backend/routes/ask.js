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
        "Oops! It looks like too many users made too many requests this month. My human Shreyans doesn't have the budget for that! If you'd like him to have the update, you can send him some money at his Venmo @Shreyans-Khunteta or his PayPal paypal.me/SKhunteta",
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
      "Tell me about your human Shreyans",
      "What makes your human special?",
      "Show me your human's best projects",
      "What's your human's expertise in AI?",
    ],
    projects: [
      "What React projects has your human built?",
      "Tell me about your human's AI projects",
      "What's the COVID Response Collective your human founded?",
      "Tell me about 'The Alignment' story your human wrote",
    ],
    skills: [
      "What programming languages does your human know?",
      "What's your human's experience with cloud technologies?",
      "Tell me about your human's data engineering background",
      "What are your human's AI and machine learning skills?",
    ],
    experience: [
      "What's your human's current role?",
      "Tell me about your human's leadership experience",
      "What healthcare technology work has your human done?",
      "What are your human's career achievements?",
    ],
    personal: [
      "How can I contact your human?",
      "Where does your human live?",
      "What are your human's interests?",
      "Tell me about yourself, Kali!",
    ],
  };

  res.json(suggestions);
});

// All other routes commented out for troubleshooting
router.post("/search", async (req, res) => {
  try {
    const { query, type } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }
    const queryEmbedding = await OpenAIService.generateEmbedding(query);
    let searchResults;
    if (type) {
      searchResults = await QdrantService.searchByType(
        queryEmbedding,
        type,
        10
      );
    } else {
      searchResults = await QdrantService.search(queryEmbedding, 10);
    }
    res.json(formatSearchResults(searchResults));
  } catch (error) {
    console.error("Error in search endpoint:", error);
    res.status(500).json({ error: "Failed to perform search" });
  }
});

router.get("/status", async (req, res) => {
  try {
    const qdrantStatus = await QdrantService.healthCheck();
    const openAIStatus = await OpenAIService.testConnection();
    const collectionInfo = await QdrantService.getCollectionInfo();
    res.json({
      qdrantHealthy: qdrantStatus,
      openAIHealthy: openAIStatus,
      collectionExists: !!collectionInfo,
      collectionName: collectionInfo ? collectionInfo.name : null,
      pointsCount: collectionInfo ? collectionInfo.points_count : 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in status endpoint:", error);
    res.status(500).json({ error: "Failed to get status" });
  }
});

router.post("/reindex", async (req, res) => {
  try {
    const { contentType } = req.body; // contentType can be 'all', 'project', 'skill', etc.
    let result;
    if (contentType && contentType.toLowerCase() !== "all") {
      console.log(`Re-indexing specific content type: ${contentType}`);
      result = await IndexerService.reindexContentType(contentType);
    } else {
      console.log(
        "Clearing entire collection before re-indexing all content..."
      );
      await QdrantService.clearCollection(); // Clear the collection first
      console.log("Re-indexing all content...");
      result = await IndexerService.indexAllContent();
    }
    res.json({
      success: result.success,
      message:
        result.message ||
        (result.success
          ? "Content re-indexed successfully"
          : "Failed to re-index content"),
      documentsProcessed:
        result.documentsIndexed || result.documentsReindexed || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in reindex endpoint:", error);
    res
      .status(500)
      .json({ error: "Failed to re-index content", details: error.message });
  }
});

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
