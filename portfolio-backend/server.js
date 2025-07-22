import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

// Route imports
import askRoute from "./routes/ask.js";
import schemaRoute from "./routes/schema.js";
import mcpConnectorRoute from "./routes/mcp-connector.js";

// Service imports
import QdrantService from "./services/qdrant.js";
import IndexerService from "./services/indexer.js";
import setup from "./setup.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Auto-setup function
async function checkAndRunSetup() {
  try {
    console.log("🔍 Checking if Qdrant collection exists...");

    // Try to get collection info
    const collectionInfo = await QdrantService.getCollectionInfo();

    if (collectionInfo) {
      console.log("✅ Qdrant collection exists");

      // If in production, always reindex to ensure latest content
      if (process.env.NODE_ENV === "production") {
        console.log(
          "🔄 Production environment detected - reindexing content..."
        );
        try {
          await QdrantService.clearCollection();
          const result = await IndexerService.indexAllContent();
          console.log(
            `✅ Production reindex completed - ${result.documentsIndexed} documents indexed`
          );
        } catch (reindexError) {
          console.error("❌ Production reindex failed:", reindexError.message);
          console.log("⚠️  Server will continue, but content may be outdated");
        }
      }
    } else {
      console.log("⚠️  Qdrant collection not found, running setup...");
      try {
        await setup();
        console.log("✅ Auto-setup completed successfully");
      } catch (setupError) {
        console.error("❌ Auto-setup failed:", setupError.message);
        console.log(
          "🔄 Server will start anyway, but AI features may not work until setup is run manually"
        );
      }
    }
  } catch (error) {
    console.log("⚠️  Could not check Qdrant collection status:", error.message);
    console.log("🔄 Server will start anyway");
  }
}

// Middleware
app.use(helmet());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    console.log(
      "CORS Origin check:",
      origin,
      "NODE_ENV:",
      process.env.NODE_ENV
    );

    // Allow requests with no origin (like mobile apps, curl, or Claude MCP connector)
    if (!origin) return callback(null, true);

    // In development, allow any localhost port
    if (
      process.env.NODE_ENV !== "production" &&
      origin.startsWith("http://localhost:")
    ) {
      console.log("Allowing localhost origin:", origin);
      return callback(null, true);
    }

    // Allow Claude/Anthropic servers for MCP connector
    if (origin.includes("anthropic.com") || origin.includes("claude.ai")) {
      console.log("Allowing Claude/Anthropic origin for MCP:", origin);
      return callback(null, true);
    }

    // Production and specific allowed origins
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:5174", // Add support for alternate port
      process.env.PRODUCTION_URL || "https://builtbyshrey.com",
      "https://builtbyshrey.com", // Explicitly include production URL
      "http://localhost:3000",
    ];

    console.log(
      "Checking origin:",
      origin,
      "against allowed origins:",
      allowedOrigins
    );

    if (allowedOrigins.includes(origin)) {
      console.log("Origin allowed:", origin);
      return callback(null, true);
    }

    console.log("Origin not allowed:", origin);
    // Instead of throwing an error, just return false
    return callback(null, false);
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "portfolio-backend",
  });
});

// API routes
app.use("/api/ask", askRoute);
app.use("/api/schema", schemaRoute);
app.use("/api/mcp-connector", mcpConnectorRoute);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    message: "The requested endpoint does not exist",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Oops! It looks like too many users made too many requests this month. My human Shreyans doesn't have the budget for that! If you'd like him to have the update, you can send him some money at his Venmo @Shreyans-Khunteta or his PayPal paypal.me/SKhunteta",
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Portfolio Backend running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🧠 Ask endpoint: http://localhost:${PORT}/api/ask`);

  // Run auto-setup check
  await checkAndRunSetup();
});
