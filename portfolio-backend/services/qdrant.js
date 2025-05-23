import { QdrantClient } from "@qdrant/js-client-rest";
import { config } from "../config/index.js";

class QdrantService {
  constructor() {
    this.client = new QdrantClient({
      url: config.qdrant.url,
      apiKey: config.qdrant.apiKey,
    });

    this.collectionName = config.qdrant.collection;
  }

  /**
   * Initialize the Qdrant collection if it doesn't exist
   */
  async initializeCollection() {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        (collection) => collection.name === this.collectionName
      );

      if (!collectionExists) {
        console.log(`Creating Qdrant collection: ${this.collectionName}`);

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
      console.error("Error initializing Qdrant collection:", error);
      throw new Error("Failed to initialize Qdrant collection");
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
   * @returns {Promise<Object>} - Collection information
   */
  async getCollectionInfo() {
    try {
      return await this.client.getCollection(this.collectionName);
    } catch (error) {
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
      await this.client.getCollections();
      return true;
    } catch (error) {
      console.error("Qdrant health check failed:", error);
      return false;
    }
  }
}

export default new QdrantService();
