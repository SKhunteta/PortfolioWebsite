#!/usr/bin/env node

import dotenv from "dotenv";
import IndexerService from "./services/indexer.js";
import QdrantService from "./services/qdrant.js";
import OpenAIService from "./services/openai.js";
import AnthropicService from "./services/anthropic.js";

// Load environment variables
dotenv.config();

console.log("🚀 Setting up Portfolio AI Backend...\n");

async function setup() {
  try {
    // Check environment variables
    console.log("1. Checking environment variables...");
    checkEnvironment();

    // Test Qdrant connection
    console.log("\n2. Testing Qdrant connection...");
    await testQdrantConnection();

    // Test OpenAI connection
    console.log("\n3. Testing OpenAI connection...");
    await testOpenAIConnection();

    // Test Anthropic connection
    console.log("\n3b. Testing Anthropic connection...");
    await testAnthropicConnection();

    // Initialize indexer
    console.log("\n4. Initializing indexer service...");
    await IndexerService.initialize();

    // Index all content
    console.log("\n5. Indexing portfolio content...");
    const indexResult = await IndexerService.indexAllContent();

    console.log("\n🎉 Setup completed successfully!");
    console.log(`📊 Indexed ${indexResult.documentsIndexed} documents`);
    console.log("\n🔥 Your AI-powered portfolio backend is ready!");
    console.log("\n📝 Next steps:");
    console.log('   1. Run "npm run dev" to start the development server');
    console.log("   2. Test the API at http://localhost:3001/health");
    console.log("   3. Try asking questions at http://localhost:3001/api/ask");
  } catch (error) {
    console.error("\n❌ Setup failed:", error.message);
    console.log("\n🔧 Troubleshooting:");
    console.log(
      "   1. Make sure Qdrant is running (docker run -p 6333:6333 qdrant/qdrant)"
    );
    console.log("   2. Check your OpenAI API key in .env file");
    console.log("   3. Check your Anthropic API key in .env file");
    console.log("   4. Verify network connectivity");
    process.exit(1);
  }
}

function checkEnvironment() {
  const requiredVars = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY"];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }

  console.log("   ✅ Environment variables configured");

  // Check optional variables
  const optionalVars = {
    QDRANT_URL: process.env.QDRANT_URL || "http://localhost:6333",
    PORT: process.env.PORT || "3001",
    NODE_ENV: process.env.NODE_ENV || "development",
  };

  console.log("   📋 Configuration:");
  Object.entries(optionalVars).forEach(([key, value]) => {
    console.log(`      ${key}: ${value}`);
  });
}

async function testQdrantConnection() {
  try {
    console.log("   🔗 Connecting to Qdrant...");
    const isHealthy = await QdrantService.healthCheck();
    if (!isHealthy) {
      throw new Error("Unable to connect to Qdrant - check URL and API key");
    }
    console.log("   ✅ Qdrant connection successful");
    console.log("   ℹ️  Ready to create collections and index content");
  } catch (error) {
    console.error("   ❌ Qdrant connection failed");
    throw new Error(`Qdrant connection failed: ${error.message}`);
  }
}

async function testOpenAIConnection() {
  try {
    // Test with a simple embedding
    const testEmbedding = await OpenAIService.generateEmbedding("test");
    if (!testEmbedding || testEmbedding.length === 0) {
      throw new Error("OpenAI embedding test failed");
    }
    console.log("   ✅ OpenAI connection successful");
  } catch (error) {
    throw new Error(`OpenAI connection failed: ${error.message}`);
  }
}

async function testAnthropicConnection() {
  try {
    await AnthropicService.testConnection();
    console.log("   ✅ Anthropic connection successful");
  } catch (error) {
    throw new Error(`Anthropic connection failed: ${error.message}`);
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setup();
}

export default setup;
