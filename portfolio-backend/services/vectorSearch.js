import OpenAIService from "./openai.js";
import QdrantService from "./qdrant.js";

export class VectorSearchService {
  constructor() {
    this.openaiService = OpenAIService;
    this.qdrantService = QdrantService;
  }

  async initialize() {
    try {
      console.log("🔍 Initializing VectorSearchService...");
      await this.qdrantService.initializeCollection();
      console.log("✅ VectorSearchService initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize VectorSearchService:", error);
      throw error;
    }
  }

  async searchSimilar(query, options = {}) {
    try {
      const { limit = 5, contentType = null } = options;

      // Generate embedding for the query
      const queryEmbedding = await this.openaiService.generateEmbedding(query);

      // Search in Qdrant
      let results;
      if (contentType) {
        results = await this.qdrantService.searchByType(
          queryEmbedding,
          contentType,
          limit
        );
      } else {
        results = await this.qdrantService.search(queryEmbedding, limit);
      }

      return results;
    } catch (error) {
      console.error("Error in searchSimilar:", error);
      throw new Error(`Vector search failed: ${error.message}`);
    }
  }

  async searchMultipleTypes(query, contentTypes, limit = 5) {
    try {
      const queryEmbedding = await this.openaiService.generateEmbedding(query);
      return await this.qdrantService.searchMultipleTypes(
        queryEmbedding,
        contentTypes,
        limit
      );
    } catch (error) {
      console.error("Error in searchMultipleTypes:", error);
      throw new Error(`Multi-type vector search failed: ${error.message}`);
    }
  }

  async getCollectionInfo() {
    return await this.qdrantService.getCollectionInfo();
  }

  async healthCheck() {
    try {
      // Test both services
      await this.qdrantService.healthCheck();
      // Test a simple embedding generation
      await this.openaiService.generateEmbedding("test");
      return { status: "healthy", timestamp: new Date().toISOString() };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Export both named class and default instance to match MCP server expectations
export default new VectorSearchService();
