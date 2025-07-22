import express from "express";
import OpenAIService from "../services/openai.js";
import QdrantService from "../services/qdrant.js";
import { config } from "../config/index.js";

const router = express.Router();

/**
 * MCP Server Implementation for Claude MCP Connector
 * Follows the MCP specification: https://modelcontextprotocol.io/specification/
 *
 * This server can be connected to Claude using:
 * {
 *   "mcp_servers": [
 *     {
 *       "type": "url",
 *       "url": "https://backend.builtbyshrey.com/api/mcp-connector/sse",
 *       "name": "shreyans-portfolio",
 *       "tool_configuration": {
 *         "enabled": true,
 *         "allowed_tools": ["portfolio_search", "analyze_portfolio", "get_project_details"]
 *       }
 *     }
 *   ]
 * }
 */

// MCP Protocol Messages
const MCP_VERSION = "2025-03-26";

// Available MCP Tools
const MCP_TOOLS = [
  {
    name: "portfolio_search",
    description:
      "Search Shreyans' portfolio for specific information about projects, skills, or experience",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query about Shreyans' portfolio",
        },
        contentTypes: {
          type: "array",
          items: {
            type: "string",
            enum: ["project", "skill", "experience", "personal"],
          },
          description: "Types of content to search in",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "analyze_portfolio",
    description:
      "Analyze how well Shreyans' portfolio matches specific job requirements",
    inputSchema: {
      type: "object",
      properties: {
        jobDescription: {
          type: "string",
          description: "Job description or requirements to analyze against",
        },
        requiredSkills: {
          type: "array",
          items: { type: "string" },
          description: "List of required skills",
        },
        focusArea: {
          type: "string",
          description: "Specific area to focus the analysis on",
        },
      },
      required: ["jobDescription"],
    },
  },
  {
    name: "get_project_details",
    description:
      "Get detailed information about a specific project in Shreyans' portfolio",
    inputSchema: {
      type: "object",
      properties: {
        projectName: {
          type: "string",
          description: "Name of the project to get details for",
        },
        detailLevel: {
          type: "string",
          enum: ["summary", "technical", "business"],
          description: "Level of detail to provide",
        },
      },
      required: ["projectName"],
    },
  },
];

/**
 * SSE (Server-Sent Events) endpoint for MCP
 * This is the main endpoint Claude will connect to
 */
router.get("/sse", (req, res) => {
  console.log("🔗 MCP SSE connection initiated");

  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  });

  // Send initial connection event
  sendSSEMessage(res, "connected", {
    message: "MCP server connected",
    version: MCP_VERSION,
    server: "shreyans-portfolio-mcp",
  });

  // Handle client disconnect
  req.on("close", () => {
    console.log("🔌 MCP SSE connection closed");
  });

  // Keep connection alive
  const keepAlive = setInterval(() => {
    sendSSEMessage(res, "ping", { timestamp: new Date().toISOString() });
  }, 30000);

  req.on("close", () => {
    clearInterval(keepAlive);
  });
});

/**
 * POST endpoint for MCP tool calls
 * Claude will send tool execution requests here
 */
router.post("/sse", async (req, res) => {
  try {
    const { method, params, id } = req.body;

    console.log(`🔧 MCP Method: ${method}`, params);

    let result;

    switch (method) {
      case "initialize":
        result = await handleInitialize(params);
        break;
      case "tools/list":
        result = await handleToolsList();
        break;
      case "tools/call":
        result = await handleToolCall(params);
        break;
      default:
        throw new Error(`Unknown method: ${method}`);
    }

    // Send MCP-compliant response
    res.json({
      jsonrpc: "2.0",
      id: id,
      result: result,
    });
  } catch (error) {
    console.error("❌ MCP Error:", error);

    res.status(500).json({
      jsonrpc: "2.0",
      id: req.body.id || null,
      error: {
        code: -32603,
        message: "Internal error",
        data: error.message,
      },
    });
  }
});

/**
 * Handle MCP initialize request
 */
async function handleInitialize(params) {
  return {
    protocolVersion: MCP_VERSION,
    serverInfo: {
      name: "shreyans-portfolio-mcp",
      version: "1.0.0",
      description:
        "Shreyans Khunteta's AI-powered portfolio intelligence server",
    },
    capabilities: {
      tools: {},
      logging: {},
    },
  };
}

/**
 * Handle tools list request
 */
async function handleToolsList() {
  return {
    tools: MCP_TOOLS,
  };
}

/**
 * Handle tool execution
 */
async function handleToolCall(params) {
  const { name, arguments: args } = params;

  console.log(`🛠️ Executing tool: ${name}`, args);

  switch (name) {
    case "portfolio_search":
      return await executePortfolioSearch(args);
    case "analyze_portfolio":
      return await executePortfolioAnalysis(args);
    case "get_project_details":
      return await executeGetProjectDetails(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Execute portfolio search tool
 */
async function executePortfolioSearch({ query, contentTypes = [] }) {
  try {
    // Generate embedding for the query
    const queryEmbedding = await OpenAIService.generateEmbedding(query);

    // Search using vector database
    let searchResults;
    if (contentTypes.length > 0) {
      searchResults = await QdrantService.searchMultipleTypes(
        queryEmbedding,
        contentTypes,
        5
      );
    } else {
      searchResults = await QdrantService.search(queryEmbedding, 5);
    }

    // Generate AI response
    const aiResponse = await OpenAIService.generateResponse(
      query,
      searchResults
    );

    return {
      content: [
        {
          type: "text",
          text: aiResponse.answer,
        },
      ],
      metadata: {
        query: query,
        contentTypes: contentTypes,
        resultsFound: searchResults.length,
        sources: aiResponse.sources,
      },
    };
  } catch (error) {
    console.error("Error in portfolio search:", error);
    return {
      content: [
        {
          type: "text",
          text: "I encountered an error while searching the portfolio. Please try again with a different query.",
        },
      ],
      isError: true,
    };
  }
}

/**
 * Execute portfolio analysis tool
 */
async function executePortfolioAnalysis({
  jobDescription,
  requiredSkills = [],
  focusArea = "",
}) {
  try {
    // Create analysis query
    const analysisQuery = `Analyze portfolio for: ${jobDescription}. Required skills: ${requiredSkills.join(
      ", "
    )}. Focus: ${focusArea}`;

    // Search for relevant content
    const queryEmbedding = await OpenAIService.generateEmbedding(analysisQuery);
    const searchResults = await QdrantService.search(queryEmbedding, 8);

    // Generate comprehensive analysis
    const systemPrompt = `You are Kali, Shreyans' AI assistant with deep knowledge of his portfolio. 
    Analyze how well his background aligns with the job requirements. Provide:
    1. Overall match score (0-100%)
    2. Detailed analysis of strengths
    3. Areas where he excels
    4. Relevant projects and experience
    5. Specific talking points for interviews
    
    Be honest but highlight the strongest alignments.`;

    const userPrompt = `Job: ${jobDescription}
    Required Skills: ${requiredSkills.join(", ")}
    Focus Area: ${focusArea}
    
    Portfolio Context: ${JSON.stringify(searchResults.slice(0, 5), null, 2)}`;

    const analysis = await OpenAIService.generateMCPResponse({
      systemPrompt,
      userQuery: userPrompt,
    });

    return {
      content: [
        {
          type: "text",
          text: analysis,
        },
      ],
      metadata: {
        jobDescription,
        requiredSkills,
        focusArea,
        portfolioItemsAnalyzed: searchResults.length,
      },
    };
  } catch (error) {
    console.error("Error in portfolio analysis:", error);
    return {
      content: [
        {
          type: "text",
          text: "I encountered an error while analyzing the portfolio. Please try again.",
        },
      ],
      isError: true,
    };
  }
}

/**
 * Execute get project details tool
 */
async function executeGetProjectDetails({
  projectName,
  detailLevel = "summary",
}) {
  try {
    // Search for the specific project
    const projectQuery = `${projectName} project details implementation architecture`;
    const queryEmbedding = await OpenAIService.generateEmbedding(projectQuery);
    const searchResults = await QdrantService.search(queryEmbedding, 3);

    // Generate detailed project information
    const systemPrompt = `You are Kali, providing detailed information about Shreyans' ${projectName} project.
    Detail level: ${detailLevel}
    
    For summary: Overview, key features, technologies used
    For technical: Architecture, implementation details, challenges solved
    For business: Impact, value proposition, results achieved`;

    const userPrompt = `Provide ${detailLevel} details about the ${projectName} project.
    
    Available context: ${JSON.stringify(searchResults, null, 2)}`;

    const projectDetails = await OpenAIService.generateMCPResponse({
      systemPrompt,
      userQuery: userPrompt,
    });

    return {
      content: [
        {
          type: "text",
          text: projectDetails,
        },
      ],
      metadata: {
        projectName,
        detailLevel,
        contextItemsUsed: searchResults.length,
      },
    };
  } catch (error) {
    console.error("Error getting project details:", error);
    return {
      content: [
        {
          type: "text",
          text: `I encountered an error while retrieving details for ${projectName}. Please try again.`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Utility function to send SSE messages
 */
function sendSSEMessage(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * GET /info - Server information endpoint
 */
router.get("/info", (req, res) => {
  res.json({
    name: "shreyans-portfolio-mcp",
    version: "1.0.0",
    description: "Shreyans Khunteta's AI-powered portfolio intelligence server",
    protocolVersion: MCP_VERSION,
    capabilities: {
      tools: true,
      logging: false,
      prompts: false,
      resources: false,
    },
    tools: MCP_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
    })),
    connectionInfo: {
      sseEndpoint: "/api/mcp-connector/sse",
      supportedTransports: ["sse", "http"],
    },
    usage: {
      claudeExample: {
        mcp_servers: [
          {
            type: "url",
            url: "https://backend.builtbyshrey.com/api/mcp-connector/sse",
            name: "shreyans-portfolio",
            tool_configuration: {
              enabled: true,
              allowed_tools: [
                "portfolio_search",
                "analyze_portfolio",
                "get_project_details",
              ],
            },
          },
        ],
      },
    },
  });
});

export default router;
