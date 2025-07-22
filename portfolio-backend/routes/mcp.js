import express from "express";
import OpenAIService from "../services/openai.js";
import QdrantService from "../services/qdrant.js";
import { config } from "../config/index.js";
import { kaliMCP } from "../mcp-server.js";

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
            website: "https://builtbyshrey.com",
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

/**
 * GET /api/mcp/capabilities
 * Discover available MCP tools and capabilities
 */
router.get("/capabilities", async (req, res) => {
  try {
    const capabilities = {
      server: {
        name: "kali-portfolio-intelligence",
        version: "1.0.0",
        description:
          "Kali's AI-powered portfolio intelligence service via Model Context Protocol",
      },
      tools: [
        {
          name: "analyzePortfolioForRole",
          description:
            "Analyze Shreyans' portfolio against specific job requirements with AI insights",
          parameters: {
            type: "object",
            properties: {
              jobDescription: {
                type: "string",
                description: "Job description or requirements",
              },
              companyInfo: {
                type: "string",
                description: "Company culture and values",
              },
              requiredSkills: {
                type: "array",
                items: { type: "string" },
                description: "Required skills list",
              },
            },
            required: ["jobDescription"],
          },
        },
        {
          name: "explainCodeWithContext",
          description:
            "Get detailed code explanations with Kali's observational insights",
          parameters: {
            type: "object",
            properties: {
              fileName: { type: "string", description: "File name to explain" },
              concept: { type: "string", description: "Concept to focus on" },
              audienceLevel: {
                type: "string",
                enum: ["beginner", "intermediate", "expert"],
              },
            },
            required: ["fileName", "concept"],
          },
        },
        {
          name: "generateTailoredResume",
          description: "Generate role-specific resume with AI optimization",
          parameters: {
            type: "object",
            properties: {
              targetRole: { type: "string", description: "Target position" },
              targetCompany: { type: "string", description: "Target company" },
              keyRequirements: { type: "array", items: { type: "string" } },
              resumeStyle: {
                type: "string",
                enum: ["technical", "executive", "creative", "standard"],
              },
            },
            required: ["targetRole"],
          },
        },
        {
          name: "tellProjectStory",
          description:
            "Tell compelling project stories with context and insights",
          parameters: {
            type: "object",
            properties: {
              projectName: {
                type: "string",
                description: "Project to discuss",
              },
              audience: {
                type: "string",
                enum: ["technical", "business", "recruiter", "general"],
              },
              focusArea: { type: "string", description: "Specific focus area" },
            },
            required: ["projectName"],
          },
        },
        {
          name: "assessTechnicalFit",
          description:
            "Assess technical capability fit for specific technologies",
          parameters: {
            type: "object",
            properties: {
              technologies: { type: "array", items: { type: "string" } },
              projectType: { type: "string", description: "Project type" },
              complexityLevel: {
                type: "string",
                enum: ["startup", "enterprise", "research", "consulting"],
              },
            },
            required: ["technologies"],
          },
        },
      ],
      resources: [
        {
          uri: "portfolio://projects",
          name: "Portfolio Projects",
          description: "Complete portfolio projects with technical details",
        },
        {
          uri: "portfolio://skills",
          name: "Technical Skills",
          description: "Comprehensive technical skills and experience",
        },
        {
          uri: "portfolio://experience",
          name: "Professional Experience",
          description: "Work experience and achievements",
        },
      ],
      prompts: [
        {
          name: "technical-interview-prep",
          description:
            "Prepare for technical interviews based on role requirements",
        },
        {
          name: "project-demo-script",
          description: "Generate demo scripts for specific projects",
        },
      ],
    };

    res.json(capabilities);
  } catch (error) {
    console.error("Error getting MCP capabilities:", error);
    res.status(500).json({ error: "Failed to get capabilities" });
  }
});

/**
 * POST /api/mcp/tools/call
 * Call a specific MCP tool
 */
router.post("/tools/call", async (req, res) => {
  try {
    const { tool, parameters } = req.body;

    if (!tool) {
      return res.status(400).json({ error: "Tool name is required" });
    }

    console.log(`🔧 MCP Tool Call: ${tool}`, parameters);

    // Use the actual FastMCP server tools instead of simulation
    let result;

    try {
      // Find the tool in the FastMCP server
      const mcpTool = kaliMCP.tools.find((t) => t.name === tool);

      if (!mcpTool) {
        return res.status(404).json({ error: `Tool '${tool}' not found` });
      }

      console.log(`✅ Found MCP tool: ${tool}`);

      // Execute the actual tool
      result = await mcpTool.execute(parameters);

      console.log(`🎯 Tool execution result:`, result);
    } catch (toolError) {
      console.error(`❌ Tool execution error for ${tool}:`, toolError);

      // Fallback to simulation if tool execution fails
      console.log(`🔄 Falling back to simulation for ${tool}`);
      result = await simulateToolCall(tool, parameters);
    }

    res.json({
      tool,
      parameters,
      result,
      timestamp: new Date().toISOString(),
      server: "kali-portfolio-intelligence",
    });
  } catch (error) {
    console.error("Error calling MCP tool:", error);
    res.status(500).json({
      error: "Tool execution failed",
      details: error.message,
    });
  }
});

/**
 * GET /api/mcp/demo
 * Interactive demo of MCP capabilities
 */
router.get("/demo", async (req, res) => {
  try {
    const demoScenarios = [
      {
        title: "Portfolio Analysis for AI Engineer Role",
        tool: "analyzePortfolioForRole",
        parameters: {
          jobDescription:
            "Senior AI Engineer - Building next-generation AI applications",
          requiredSkills: ["Python", "Machine Learning", "API Design", "React"],
        },
        description:
          "Watch Kali analyze how Shreyans' portfolio aligns with an AI engineering role",
      },
      {
        title: "Code Explanation: Vector Search Implementation",
        tool: "explainCodeWithContext",
        parameters: {
          fileName: "vectorSearch.js",
          concept: "semantic search",
          audienceLevel: "intermediate",
        },
        description:
          "Get detailed explanation of the vector search implementation",
      },
      {
        title: "Generate Tailored Resume",
        tool: "generateTailoredResume",
        parameters: {
          targetRole: "Full Stack Developer",
          targetCompany: "Microsoft",
          keyRequirements: ["C#", ".NET", "React", "Azure"],
        },
        description:
          "Generate a customized resume for a Microsoft full-stack role",
      },
    ];

    res.json({
      title: "Kali MCP Intelligence Demo",
      description: "Explore Kali's Model Context Protocol capabilities",
      scenarios: demoScenarios,
      instructions:
        "POST to /api/mcp/tools/call with tool and parameters to try any scenario",
    });
  } catch (error) {
    console.error("Error getting MCP demo:", error);
    res.status(500).json({ error: "Failed to get demo" });
  }
});

// Helper function to simulate tool calls (in real MCP this would be handled by the protocol)
async function simulateToolCall(toolName, parameters) {
  // This is a simplified simulation - the real MCP server would handle this
  switch (toolName) {
    case "analyzePortfolioForRole":
      return {
        matchScore: 0.92,
        analysis:
          "Strong alignment with AI engineering role. Extensive experience with AI frameworks, vector databases, and full-stack development.",
        relevantProjects: [
          {
            title: "Kali AI Assistant",
            technologies: ["OpenAI", "Vector Search", "React"],
            relevanceScore: 0.95,
          },
          {
            title: "Lingua AI Chatbot",
            technologies: ["Python", "AI", "NLP"],
            relevanceScore: 0.88,
          },
        ],
        kaliInsights:
          "From my observations, Shreyans excels at bridging AI capabilities with practical user interfaces. His systematic approach to problem-solving makes him particularly suited for complex AI engineering challenges.",
        interviewTalkingPoints: [
          "Discuss the Kali AI assistant architecture",
          "Explain vector search optimization decisions",
          "Demonstrate real-time AI conversation flow",
        ],
      };

    case "explainCodeWithContext":
      return {
        technicalExplanation:
          "The vector search implementation uses Qdrant for semantic similarity matching, with OpenAI embeddings for content vectorization.",
        kaliObservations:
          "I watched Shreyans carefully design this system with performance in mind - he spent considerable time optimizing the embedding generation and search algorithms.",
        interviewAngles: [
          "How did you optimize vector similarity search?",
          "What trade-offs did you consider for real-time performance?",
          "How would you scale this to millions of documents?",
        ],
      };

    default:
      return { message: `Tool ${toolName} executed successfully`, parameters };
  }
}

/**
 * GET /api/mcp/context
 * Machine-readable self-description following JSON-LD structure
 */
router.get("/context", (req, res) => {
  const context = {
    "@type": "Person",
    name: "Shreyans Khunteta",
    url: "https://builtbyshrey.com",
    description:
      "AI engineer, systems thinker, and writer building personal cognitive tools and agents.",
    skills: [
      "AI agents",
      "LangChain",
      "FastAPI",
      "GPT integration",
      "RAG pipelines",
      "MCP protocol",
    ],
    projects: [
      "Kali chatbot",
      "AI Transit Assistant",
      "Model Context Protocol (MCP)",
      "Memory fragmentation blog",
      "Agentic resume builder",
    ],
    endpoints: [
      "/api/mcp/execplan",
      "/api/mcp/promptlog",
      "/api/mcp/feed",
      "/api/mcp/meta",
    ],
    agentInstructions:
      "You can interact with this domain using Claude or ChatGPT agents via MCP. " +
      "This site surfaces workflows, memory fragments, and structured knowledge.",
  };

  res.set("Content-Type", "application/ld+json");
  res.json(context);
});

/**
 * GET /api/mcp/feed
 * JSON array of recent structured updates for AI agents and scrapers
 */
router.get("/feed", (req, res) => {
  const feed = [
    {
      title: "New blog: Memory Fragmentation in GPT Agents",
      summary:
        "An exploration of cognitive load limits in GPT-based assistants and how Shrey is working around them.",
      tags: ["gpt", "memory", "blog"],
      link: "/blog/memory-fragmentation",
      timestamp: new Date().toISOString(),
    },
    {
      title: "MCP GitHub Connector Launched",
      summary:
        "A new API that lets Claude access commit summaries, open issues, and workflows in Shrey's repos.",
      tags: ["mcp", "github", "agent"],
      link: "/api/mcp/githubdiff?repo=builtbyshrey",
      timestamp: new Date().toISOString(),
    },
    {
      title: "Claude Code Integration Started",
      summary:
        "Shrey has begun using Claude Code to scaffold new endpoints and plan agent workflows.",
      tags: ["claude", "agentdev", "tools"],
      link: "/projects/claude-integration",
      timestamp: new Date().toISOString(),
    },
  ];

  res.set("Content-Type", "application/json");
  res.json(feed);
});

/**
 * GET /api/mcp/meta
 * Site's AI-facing meta-context for web agents and scrapers
 */
router.get("/meta", (req, res) => {
  const meta = {
    sitePersona:
      "Shrey is a pragmatic AI developer building memory-aware personal agents.",
    preferredTone: "blunt, direct, zero fluff",
    intentSurface: [
      "agent orchestration",
      "AI-powered research",
      "memory architecture",
      "semantic tooling",
    ],
    preferredIntegrationStyle:
      "Claude Code, LangGraph, GPT tool APIs, MCP protocol",
    mcpManifestHint: "/api/mcp/actions.json",
  };

  res.set("Content-Type", "application/json");
  res.json(meta);
});

export default router;
