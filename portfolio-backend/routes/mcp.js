import express from "express";
import OpenAIService from "../services/openai.js";
import QdrantService from "../services/qdrant.js";
import { config } from "../config/index.js";

const router = express.Router();

/**
 * GET /api/mcp
 * MCP server capabilities and metadata
 */
router.get("/", (req, res) => {
  const mcpServer = {
    name: "shreyans-portfolio",
    version: "1.0.0",
    description:
      "AI-powered portfolio assistant for Shreyans Khunteta - Senior Software Engineer specializing in C#/.NET, AI technologies, and Microsoft NLWeb framework",
    capabilities: {
      tools: [
        {
          name: "ask",
          description:
            "Ask questions about Shreyans' portfolio, skills, projects, and experience",
          parameters: {
            type: "object",
            properties: {
              question: {
                type: "string",
                description: "Natural language question about the portfolio",
              },
              context: {
                type: "string",
                description: "Optional context for the question",
              },
            },
            required: ["question"],
          },
          examples: [
            "What programming languages does Shreyans specialize in?",
            "Tell me about his experience with AI technologies",
            "What projects has he built using NLWeb?",
            "What's his educational background?",
            "How can I contact him for collaboration?",
          ],
        },
        {
          name: "search",
          description: "Search specific content types in the portfolio",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query",
              },
              contentTypes: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["project", "skill", "experience", "personal"],
                },
                description: "Content types to search",
              },
            },
            required: ["query"],
          },
          examples: [
            { query: "machine learning", contentTypes: ["project", "skill"] },
            { query: "C# development", contentTypes: ["experience", "skill"] },
            { query: "IoT projects", contentTypes: ["project"] },
          ],
        },
      ],
      resources: [
        {
          uri: "portfolio://projects",
          name: "Projects",
          description: "Information about Shreyans' software projects",
          summary:
            "Includes AI-powered applications using NLWeb, full-stack web applications, IoT solutions, enterprise C#/.NET applications, and machine learning implementations",
          sample_projects: [
            "AI Portfolio Assistant (NLWeb-powered conversational interface)",
            "Real-time data processing systems",
            "IoT hardware-software integration projects",
            "Enterprise web applications with C#/.NET",
          ],
        },
        {
          uri: "portfolio://skills",
          name: "Skills",
          description: "Technical skills and expertise",
          summary:
            "Primary expertise in C#/.NET stack with strong focus on AI technologies, full-stack development, and emerging frameworks",
          core_skills: [
            "C# and .NET Framework/Core",
            "JavaScript, React, Node.js",
            "Microsoft NLWeb Framework",
            "Artificial Intelligence and Machine Learning",
            "Full-Stack Web Development",
            "IoT Development",
            "Database Design and Management",
            "Cloud Technologies (Azure, AWS)",
          ],
        },
        {
          uri: "portfolio://experience",
          name: "Experience",
          description: "Professional work experience",
          summary:
            "Senior Software Engineer with extensive experience in enterprise application development, AI-powered solutions, and team leadership",
          experience_areas: [
            "Enterprise application development using C#/.NET",
            "AI-powered application development with NLWeb",
            "Full-stack web application architecture",
            "IoT solutions and embedded systems",
            "Cloud infrastructure and deployment",
            "Team leadership and mentoring",
          ],
        },
        {
          uri: "portfolio://personal",
          name: "Personal",
          description: "Personal information and contact details",
          summary:
            "Based in Seattle, WA. Open to collaboration, consultation, and new opportunities in software development and AI technologies",
          contact_info: {
            location: "Seattle, WA, USA",
            github: "https://github.com/skhunteta",
            website: "https://shreyanskhunteta.com",
            availability: "Open for collaboration and consultation",
          },
        },
      ],
    },
    context: {
      professional_focus:
        "Intersection of traditional software development with cutting-edge AI technologies",
      current_specialization:
        "Microsoft NLWeb framework implementation and AI-powered conversational interfaces",
      portfolio_features: {
        interactive_ai_assistant: {
          name: "Kali",
          framework: "Microsoft NLWeb",
          capabilities:
            "Answers questions about Shreyans' work, projects, and expertise in real-time",
        },
        ai_discoverable:
          "Site is optimized for AI crawler discovery with structured data and static content fallbacks",
      },
      notable_achievements: [
        "Practical implementation of Microsoft NLWeb in production portfolio",
        "AI-first approach to web development and user interaction",
        "Comprehensive portfolio showcasing full-stack and AI capabilities",
      ],
    },
    interaction_guidelines: {
      best_questions: [
        "Technical expertise and skill assessment",
        "Project details and implementation approaches",
        "Experience with specific technologies or frameworks",
        "Collaboration opportunities and availability",
        "AI and NLWeb implementation insights",
      ],
      response_style:
        "Knowledgeable and detailed responses about technical topics, with practical examples where applicable",
    },
    metadata: {
      author: config.portfolio.owner.name,
      website: config.portfolio.owner.website,
      github: "https://github.com/skhunteta",
      lastUpdated: new Date().toISOString(),
      ai_friendly: true,
      mcp_version: "enhanced",
      content_richness: "high",
    },
  };

  res.json(mcpServer);
});

/**
 * POST /api/mcp/ask
 * MCP-compatible ask endpoint
 */
router.post("/ask", async (req, res) => {
  try {
    const { question, context } = req.body;

    if (!question) {
      return res.status(400).json({
        error: "BadRequest",
        message: "Question parameter is required",
      });
    }

    console.log(`🤖 MCP Ask: "${question}"`);

    // Generate embedding and search
    const questionEmbedding = await OpenAIService.generateEmbedding(question);
    const searchResults = await QdrantService.search(questionEmbedding, 5);
    const aiResponse = await OpenAIService.generateResponse(
      question,
      searchResults
    );

    // MCP-compatible response format
    const mcpResponse = {
      content: [
        {
          type: "text",
          text: aiResponse.answer,
        },
      ],
      isError: false,
      metadata: {
        sources: aiResponse.sources,
        timestamp: aiResponse.timestamp,
        relevantContent: searchResults.length,
      },
    };

    res.json(mcpResponse);
  } catch (error) {
    console.error("MCP Ask error:", error);

    res.status(500).json({
      content: [
        {
          type: "text",
          text: "I encountered an error while processing your question. Please try again.",
        },
      ],
      isError: true,
      error: {
        type: "InternalError",
        message: error.message,
      },
    });
  }
});

/**
 * POST /api/mcp/search
 * MCP-compatible search endpoint
 */
router.post("/search", async (req, res) => {
  try {
    const { query, contentTypes = [] } = req.body;

    if (!query) {
      return res.status(400).json({
        error: "BadRequest",
        message: "Query parameter is required",
      });
    }

    console.log(`🤖 MCP Search: "${query}" in [${contentTypes.join(", ")}]`);

    const questionEmbedding = await OpenAIService.generateEmbedding(query);

    let searchResults;
    if (contentTypes.length > 0) {
      searchResults = await QdrantService.searchMultipleTypes(
        questionEmbedding,
        contentTypes,
        10
      );
    } else {
      searchResults = await QdrantService.search(questionEmbedding, 10);
    }

    const mcpResponse = {
      content: [
        {
          type: "resource",
          resource: {
            uri: "portfolio://search-results",
            name: "Search Results",
            description: `Found ${searchResults.length} relevant items`,
          },
        },
        {
          type: "text",
          text: formatSearchResultsForMCP(searchResults, query),
        },
      ],
      isError: false,
      metadata: {
        query: query,
        contentTypes: contentTypes,
        resultsCount: searchResults.length,
        timestamp: new Date().toISOString(),
      },
    };

    res.json(mcpResponse);
  } catch (error) {
    console.error("MCP Search error:", error);

    res.status(500).json({
      content: [
        {
          type: "text",
          text: "Search failed. Please try again.",
        },
      ],
      isError: true,
      error: {
        type: "InternalError",
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/mcp/resources/:uri
 * MCP resource endpoint
 */
router.get("/resources/:uri", async (req, res) => {
  try {
    const { uri } = req.params;

    // Parse resource URI
    const resourceType = uri.replace("portfolio://", "");

    let content;
    switch (resourceType) {
      case "projects":
        content = await getProjectsResource();
        break;
      case "skills":
        content = await getSkillsResource();
        break;
      case "experience":
        content = await getExperienceResource();
        break;
      case "personal":
        content = await getPersonalResource();
        break;
      default:
        return res.status(404).json({
          error: "NotFound",
          message: `Resource ${uri} not found`,
        });
    }

    const mcpResponse = {
      contents: [
        {
          uri: `portfolio://${resourceType}`,
          mimeType: "application/json",
          text: JSON.stringify(content, null, 2),
        },
      ],
    };

    res.json(mcpResponse);
  } catch (error) {
    console.error("MCP Resource error:", error);
    res.status(500).json({
      error: "InternalError",
      message: error.message,
    });
  }
});

/**
 * Format search results for MCP response
 */
function formatSearchResultsForMCP(searchResults, query) {
  if (searchResults.length === 0) {
    return `No results found for "${query}".`;
  }

  const results = searchResults
    .map((result, index) => {
      const { payload } = result;
      return `${index + 1}. ${payload.title} (${payload.content_type})
   Score: ${(result.score * 100).toFixed(1)}%
   Description: ${payload.description}
   ${
     payload.technologies?.length > 0
       ? `Technologies: ${payload.technologies.join(", ")}`
       : ""
   }
   ${payload.url ? `URL: ${payload.url}` : ""}`;
    })
    .join("\n\n");

  return `Search results for "${query}":\n\n${results}`;
}

/**
 * Resource getter functions
 */
async function getProjectsResource() {
  // Implementation would fetch from IndexerService
  return { message: "Projects resource - implementation needed" };
}

async function getSkillsResource() {
  return { message: "Skills resource - implementation needed" };
}

async function getExperienceResource() {
  return { message: "Experience resource - implementation needed" };
}

async function getPersonalResource() {
  return { message: "Personal resource - implementation needed" };
}

export default router;
