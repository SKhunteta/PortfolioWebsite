import { QdrantClient } from "@qdrant/js-client-rest";
import { config } from "../config/index.js";

class QdrantService {
  constructor() {
    this.client = new QdrantClient({
      url: config.qdrant.url,
      apiKey: config.qdrant.apiKey,
      checkCompatibility: false,
    });

    this.collectionName = config.qdrant.collection;
  }

  /**
   * Initialize the Qdrant collection if it doesn't exist
   */
  async initializeCollection() {
    try {
      console.log(
        `🔍 Checking if collection '${this.collectionName}' exists...`
      );

      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        (collection) => collection.name === this.collectionName
      );

      if (!collectionExists) {
        console.log(`📦 Creating Qdrant collection: ${this.collectionName}`);
        console.log(`   Vector size: ${config.qdrant.vectorSize}`);
        console.log(`   Distance metric: ${config.qdrant.distance}`);

        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: config.qdrant.vectorSize,
            distance: config.qdrant.distance,
          },
        });

        console.log("✅ Qdrant collection created successfully");
      } else {
        console.log("✅ Qdrant collection already exists");
      }
    } catch (error) {
      console.error("❌ Error initializing Qdrant collection:", error.message);
      throw new Error(
        `Failed to initialize Qdrant collection: ${error.message}`
      );
    }
  }

  /**
   * Add a single document to the collection
   * @param {string} id - Unique identifier for the document
   * @param {number[]} vector - Embedding vector
   * @param {Object} payload - Metadata associated with the document
   */
  async addDocument(id, vector, payload) {
    try {
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: id,
            vector: vector,
            payload: payload,
          },
        ],
      });
    } catch (error) {
      console.error("Error adding document to Qdrant:", error);
      throw new Error("Failed to add document to vector database");
    }
  }

  /**
   * Add multiple documents to the collection
   * @param {Array} documents - Array of {id, vector, payload} objects
   */
  async addDocuments(documents) {
    try {
      const points = documents.map((doc) => ({
        id: doc.id,
        vector: doc.vector,
        payload: doc.payload,
      }));

      await this.client.upsert(this.collectionName, {
        wait: true,
        points: points,
      });

      console.log(`✅ Added ${documents.length} documents to Qdrant`);
    } catch (error) {
      console.error("Error adding documents to Qdrant:", error);
      throw new Error("Failed to add documents to vector database");
    }
  }

  /**
   * Search for similar vectors
   * @param {number[]} queryVector - Query embedding vector
   * @param {number} limit - Maximum number of results to return
   * @param {Object} filter - Optional filter conditions
   * @returns {Promise<Array>} - Array of search results
   */
  async search(queryVector, limit = 5, filter = null) {
    try {
      const searchRequest = {
        vector: queryVector,
        limit: limit,
        with_payload: true,
        with_vector: false,
      };

      if (filter) {
        searchRequest.filter = filter;
      }

      const searchResult = await this.client.search(
        this.collectionName,
        searchRequest
      );
      return searchResult;
    } catch (error) {
      console.error("Error searching Qdrant:", error);
      throw new Error("Failed to search vector database");
    }
  }

  /**
   * Search by content type
   * @param {number[]} queryVector - Query embedding vector
   * @param {string} contentType - Filter by content type (project, skill, experience, blog)
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} - Filtered search results
   */
  async searchByType(queryVector, contentType, limit = 5) {
    const filter = {
      must: [
        {
          key: "content_type",
          match: { value: contentType },
        },
      ],
    };

    return await this.search(queryVector, limit, filter);
  }

  /**
   * Search across multiple content types
   * @param {number[]} queryVector - Query embedding vector
   * @param {string[]} contentTypes - Array of content types to search
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} - Search results
   */
  async searchMultipleTypes(queryVector, contentTypes, limit = 5) {
    const filter = {
      should: contentTypes.map((type) => ({
        key: "content_type",
        match: { value: type },
      })),
    };

    return await this.search(queryVector, limit, filter);
  }

  /**
   * Get collection info
   * @returns {Promise<Object|null>} - Collection information or null if not found
   */
  async getCollectionInfo() {
    try {
      return await this.client.getCollection(this.collectionName);
    } catch (error) {
      // If collection doesn't exist (404), return null instead of throwing
      if (error.status === 404) {
        return null;
      }
      console.error("Error getting collection info:", error);
      throw new Error("Failed to get collection information");
    }
  }

  /**
   * Delete documents by filter
   * @param {Object} filter - Filter conditions for deletion
   */
  async deleteDocuments(filter) {
    try {
      await this.client.delete(this.collectionName, {
        filter: filter,
        wait: true,
      });
    } catch (error) {
      console.error("Error deleting documents:", error);
      throw new Error("Failed to delete documents");
    }
  }

  /**
   * Clear all documents from the collection
   */
  async clearCollection() {
    try {
      await this.client.delete(this.collectionName, {
        filter: {},
        wait: true,
      });
      console.log("✅ Collection cleared successfully");
    } catch (error) {
      console.error("Error clearing collection:", error);
      throw new Error("Failed to clear collection");
    }
  }

  /**
   * Health check for Qdrant connection
   * @returns {Promise<boolean>} - True if healthy, false otherwise
   */
  async healthCheck() {
    try {
      console.log("🔍 Testing Qdrant connection...");
      console.log(`   URL: ${config.qdrant.url}`);
      console.log(
        `   API Key: ${config.qdrant.apiKey ? "***set***" : "NOT SET"}`
      );

      const collections = await this.client.getCollections();
      console.log(`✅ Connected to Qdrant successfully`);
      console.log(`   Found ${collections.collections.length} collections`);
      return true;
    } catch (error) {
      console.error("❌ Qdrant health check failed:");
      console.error(`   Status: ${error.status || "Unknown"}`);
      console.error(`   Message: ${error.message || "Unknown error"}`);
      console.error(`   URL: ${error.url || "Unknown URL"}`);

      // Provide specific guidance based on error type
      if (error.status === 404) {
        console.error("🔧 Troubleshooting tips:");
        console.error(
          "   1. Check if your Qdrant Cloud cluster URL is correct"
        );
        console.error("   2. Verify the cluster is running and accessible");
        console.error(
          "   3. Ensure the API key is valid and has proper permissions"
        );
        console.error("   4. Try accessing the cluster directly in a browser");
        console.error(
          "   5. Try URL without port: remove ':6333' from QDRANT_URL"
        );
      } else if (error.status === 401) {
        console.error("🔧 Authentication failed - check your QDRANT_API_KEY");
      } else if (error.status === 403) {
        console.error(
          "🔧 Permission denied - API key may lack necessary permissions"
        );
      }

      return false;
    }
  }
}

export default new QdrantService();
