import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import AnthropicService from "../services/anthropic.js";
import OpenAIService from "../services/openai.js";
import QdrantService from "../services/qdrant.js";
import {
  getCanon,
  buildWorldContext,
  SPOILER_GUARDRAIL,
} from "../services/canon.js";

const router = express.Router();

// Session management: Map<sessionId, transport>
const sessions = new Map();

// CORS middleware for MCP connector requests
router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept, Cache-Control, X-Requested-With, Mcp-Session-Id"
  );
  res.header("Access-Control-Expose-Headers", "Mcp-Session-Id");
  res.header("Access-Control-Allow-Credentials", "false");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

/**
 * Create and configure a new McpServer instance with all tools registered.
 * Each session gets its own server instance.
 */
export function createMcpServer() {
  const server = new McpServer(
    {
      name: "shreyans-portfolio-mcp",
      version: "2.1.0",
    },
    {
      capabilities: {
        tools: { listChanged: false },
        logging: { level: "info" },
      },
    }
  );

  // ---- Tool 1: portfolio_search ----
  server.tool(
    "portfolio_search",
    "Search Shreyans' portfolio for specific information about projects, skills, experience, or the world of his science-fiction novel The Happiness Liability",
    {
      query: z.string().describe("Search query about Shreyans' portfolio"),
      contentTypes: z
        .array(
          z.enum([
            "project",
            "skill",
            "experience",
            "personal",
            "creative_work",
            "happiness_liability",
          ])
        )
        .optional()
        .describe("Types of content to search in"),
    },
    async ({ query, contentTypes }) => {
      try {
        const queryEmbedding = await OpenAIService.generateEmbedding(query);

        let searchResults;
        if (contentTypes && contentTypes.length > 0) {
          searchResults = await QdrantService.searchMultipleTypes(
            queryEmbedding,
            contentTypes,
            5
          );
        } else {
          searchResults = await QdrantService.search(queryEmbedding, 5);
        }

        const aiResponse = await AnthropicService.generateResponse(
          query,
          searchResults
        );

        return {
          content: [{ type: "text", text: aiResponse.answer }],
        };
      } catch (error) {
        console.error("Error in portfolio_search:", error);
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
  );

  // ---- Tool 2: analyze_portfolio ----
  server.tool(
    "analyze_portfolio",
    "Analyze how well Shreyans' portfolio matches specific job requirements",
    {
      jobDescription: z
        .string()
        .describe("Job description or requirements to analyze against"),
      requiredSkills: z
        .array(z.string())
        .optional()
        .describe("List of required skills"),
      focusArea: z
        .string()
        .optional()
        .describe("Specific area to focus the analysis on"),
    },
    async ({ jobDescription, requiredSkills, focusArea }) => {
      try {
        const skills = requiredSkills || [];
        const focus = focusArea || "";

        const analysisQuery = `Analyze portfolio for: ${jobDescription}. Required skills: ${skills.join(
          ", "
        )}. Focus: ${focus}`;

        const queryEmbedding =
          await OpenAIService.generateEmbedding(analysisQuery);
        const searchResults = await QdrantService.search(queryEmbedding, 8);

        const systemPrompt = `You are Kali, Shreyans' AI assistant with deep knowledge of his portfolio.
    Analyze how well his background aligns with the job requirements. Provide:
    1. Overall match score (0-100%)
    2. Detailed analysis of strengths
    3. Areas where he excels
    4. Relevant projects and experience
    5. Specific talking points for interviews

    Be honest but highlight the strongest alignments.`;

        const userPrompt = `Job: ${jobDescription}
    Required Skills: ${skills.join(", ")}
    Focus Area: ${focus}

    Portfolio Context: ${JSON.stringify(searchResults.slice(0, 5), null, 2)}`;

        const analysis = await AnthropicService.generateMCPResponse({
          systemPrompt,
          userQuery: userPrompt,
        });

        return {
          content: [{ type: "text", text: analysis }],
        };
      } catch (error) {
        console.error("Error in analyze_portfolio:", error);
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
  );

  // ---- Tool 3: get_project_details ----
  server.tool(
    "get_project_details",
    "Get detailed information about a specific project in Shreyans' portfolio",
    {
      projectName: z
        .string()
        .describe("Name of the project to get details for"),
      detailLevel: z
        .enum(["summary", "technical", "business"])
        .optional()
        .describe("Level of detail to provide"),
    },
    async ({ projectName, detailLevel }) => {
      try {
        const level = detailLevel || "summary";
        const projectQuery = `${projectName} project details implementation architecture`;
        const queryEmbedding =
          await OpenAIService.generateEmbedding(projectQuery);
        const searchResults = await QdrantService.search(queryEmbedding, 3);

        const systemPrompt = `You are Kali, providing detailed information about Shreyans' ${projectName} project.
    Detail level: ${level}

    For summary: Overview, key features, technologies used
    For technical: Architecture, implementation details, challenges solved
    For business: Impact, value proposition, results achieved`;

        const userPrompt = `Provide ${level} details about the ${projectName} project.

    Available context: ${JSON.stringify(searchResults, null, 2)}`;

        const projectDetails = await AnthropicService.generateMCPResponse({
          systemPrompt,
          userQuery: userPrompt,
        });

        return {
          content: [{ type: "text", text: projectDetails }],
        };
      } catch (error) {
        console.error("Error in get_project_details:", error);
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
  );

  // ---- Tool 4: assess_fit (NEW) ----
  server.tool(
    "assess_fit",
    "Assess how well Shreyans fits a specific job based on his portfolio, experience, and skills. Designed for recruiters evaluating Shrey as a candidate.",
    {
      jobDescription: z.string().describe("Full job description text"),
      requiredSkills: z
        .array(z.string())
        .optional()
        .describe("List of required skills from the job posting"),
    },
    async ({ jobDescription, requiredSkills }) => {
      try {
        const skills = requiredSkills || [];
        const fitQuery = `Skills and experience relevant to: ${jobDescription} ${skills.join(
          ", "
        )}`;

        const queryEmbedding = await OpenAIService.generateEmbedding(fitQuery);

        // Search broadly across experience, skills, and projects
        const searchResults = await QdrantService.searchMultipleTypes(
          queryEmbedding,
          ["experience", "skill", "project"],
          10
        );

        const systemPrompt = `You are Kali, Shreyans Khunteta's intelligent assistant. A recruiter is evaluating Shreyans as a candidate. Provide a structured fit assessment based on his actual portfolio data.

Your response MUST include these sections:
1. **Overall Fit Summary** - A brief 2-3 sentence assessment
2. **Matching Experience** - Specific roles and responsibilities that align, with evidence from his work history
3. **Relevant Projects** - Portfolio projects that demonstrate qualification, with specific technical details
4. **Skill Alignment** - Skills that match the requirements, noting proficiency levels
5. **Potential Gaps** - Honest assessment of areas where growth or upskilling would be needed
6. **Interview Talking Points** - Key strengths to highlight in conversation

Be specific and reference actual projects, roles, and skills from the context. Do not fabricate experience.`;

        const userPrompt = `Job Description:\n${jobDescription}\n\nRequired Skills: ${skills.join(
          ", "
        )}\n\nShreyans' Relevant Background:\n${JSON.stringify(
          searchResults,
          null,
          2
        )}`;

        const assessment = await AnthropicService.generateMCPResponse({
          systemPrompt,
          userQuery: userPrompt,
        });

        return {
          content: [{ type: "text", text: assessment }],
        };
      } catch (error) {
        console.error("Error in assess_fit:", error);
        return {
          content: [
            {
              type: "text",
              text: "I encountered an error while assessing fit. Please try again.",
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---- Tool 5: ask_shrey (NEW) ----
  server.tool(
    "ask_shrey",
    "Ask Shreyans a question -- searches across all portfolio content (projects, writing, experience, interests) and responds as if Shrey were answering, grounded in his actual work and perspectives.",
    {
      question: z.string().describe("The question to ask Shreyans"),
    },
    async ({ question }) => {
      try {
        // Broad vector search across ALL content types
        const queryEmbedding =
          await OpenAIService.generateEmbedding(question);
        const searchResults = await QdrantService.search(queryEmbedding, 10);

        const systemPrompt = `You are responding on behalf of Shreyans Khunteta, drawing from his actual portfolio, projects, writing, and documented perspectives.

Guidelines:
- Ground every response in the provided context -- reference specific projects, blog posts, experiences, and views that appear in the data
- If Shreyans has written about or worked on something relevant, cite it specifically
- Do not fabricate opinions or experiences that aren't supported by the context
- If the context doesn't contain enough information to answer fully, say so honestly and suggest where more information might be found (his blog, GitHub, LinkedIn)
- Respond in first person as Shreyans would -- professionally but with personality
- Draw from his philosophical perspectives, creative work, and interests when relevant to give well-rounded answers
- If the question touches his novel The Happiness Liability, answer from the world-bible context provided. ${SPOILER_GUARDRAIL}`;

        const contextText = AnthropicService.buildContextText(searchResults);
        const userPrompt = `Based on the following information about Shreyans Khunteta's portfolio and work:\n\n${contextText}\n\nPlease answer this question as Shreyans would: ${question}`;

        const answer = await AnthropicService.generateMCPResponse({
          systemPrompt,
          userQuery: userPrompt,
        });

        return {
          content: [{ type: "text", text: answer }],
        };
      } catch (error) {
        console.error("Error in ask_shrey:", error);
        return {
          content: [
            {
              type: "text",
              text: "I encountered an error while processing your question. Please try again.",
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---- Tool 6: explore_happiness_liability ----
  server.tool(
    "explore_happiness_liability",
    "Explore the world of The Happiness Liability, Shreyans Khunteta's science-fiction novel: the alternate-history timeline from 2026 to 2047, the Great Copyright Purge, the EMOTE Act, Meridian Emotional Partners, the Emotional Labor Exchange futures market, neural interfaces and the empathy grid, the main characters, and the interactive experiments on builtbyshrey.com built from this world. Spoiler-safe: covers worldbuilding and the novel's opening setup only.",
    {
      query: z
        .string()
        .describe("Question about the world, its history, or its logic"),
      aspect: z
        .enum([
          "overview",
          "timeline",
          "institutions",
          "market",
          "technology",
          "characters",
          "experiments",
        ])
        .optional()
        .describe("Narrow the search to one aspect of the world"),
    },
    async ({ query, aspect }) => {
      try {
        const queryEmbedding = await OpenAIService.generateEmbedding(query);

        const buildFilter = (withAspect) => ({
          must: [
            { key: "content_type", match: { value: "happiness_liability" } },
            ...(withAspect && aspect
              ? [{ key: "aspect", match: { value: aspect } }]
              : []),
          ],
        });

        let searchResults = await QdrantService.search(
          queryEmbedding,
          6,
          buildFilter(true)
        );
        if (aspect && searchResults.length === 0) {
          // Aspect filter found nothing -- retry across the whole world bible
          searchResults = await QdrantService.search(
            queryEmbedding,
            6,
            buildFilter(false)
          );
        }

        const canon = getCanon();
        const systemPrompt = `You are the keeper of the world bible for "${canon.meta.title}", a ${canon.meta.form} by ${canon.meta.author}. ${canon.voice_notes.lorekeeper}

Guidelines:
- Ground every answer in the provided world-bible context. If something isn't covered there, say the world bible doesn't cover it -- do not invent canon.
- ${SPOILER_GUARDRAIL}
- When relevant, point to the live experiments from this world at builtbyshrey.com (the Emotional Labor Exchange, the Emotional Labor Invoice, JANET, the Monetized Reader, the You Are Here timeline, and the Meridian microsite).`;

        const worldContext = buildWorldContext({ compact: true });
        const retrievedContext = AnthropicService.buildContextText(searchResults);
        const userQuery = `World-bible summary:\n${worldContext}\n\nRetrieved detail:\n${retrievedContext}\n\nQuestion: ${query}`;

        const answer = await AnthropicService.generateMCPResponse({
          systemPrompt,
          userQuery,
        });

        return {
          content: [{ type: "text", text: answer }],
        };
      } catch (error) {
        console.error("Error in explore_happiness_liability:", error);
        return {
          content: [
            {
              type: "text",
              text: "I encountered an error while consulting the world bible. Please try again with a different query.",
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}

// ---- Express Route Handlers ----

/**
 * POST /api/mcp-connector
 * Main MCP endpoint -- handles JSON-RPC requests via Streamable HTTP transport.
 * Creates a new session on first request (no Mcp-Session-Id header),
 * routes to existing session otherwise.
 */
router.post("/", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];

  if (sessionId && sessions.has(sessionId)) {
    // Existing session: route to its transport
    const transport = sessions.get(sessionId);
    await transport.handleRequest(req, res, req.body);
  } else if (!sessionId) {
    // New session: create transport + server, connect them
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        console.log(`MCP session initialized: ${id}`);
        sessions.set(id, transport);
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        console.log(`MCP session closed: ${transport.sessionId}`);
        sessions.delete(transport.sessionId);
      }
    };

    const server = createMcpServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } else {
    // Session ID provided but not found
    res.status(404).json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message:
          "Session not found. Start a new session without Mcp-Session-Id header.",
      },
      id: null,
    });
  }
});

/**
 * GET /api/mcp-connector
 * If the request includes a valid Mcp-Session-Id, open an SSE stream.
 * Otherwise, return server capabilities so discovery clients (ChatGPT, curl, browsers)
 * get a useful response instead of a 400.
 */
router.get("/", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];

  if (sessionId && sessions.has(sessionId)) {
    // Existing session — open SSE stream
    const transport = sessions.get(sessionId);
    await transport.handleRequest(req, res);
    return;
  }

  // No session — return discovery / capabilities info
  res.json({
    name: "shreyans-portfolio-mcp",
    version: "2.1.0",
    description:
      "Shreyans Khunteta's AI-powered portfolio intelligence server",
    protocolVersion: "2025-03-26",
    transport: "streamable-http",
    capabilities: { tools: true },
    tools: [
      { name: "portfolio_search", description: "Search portfolio content" },
      {
        name: "analyze_portfolio",
        description: "Analyze portfolio against job requirements",
      },
      {
        name: "get_project_details",
        description: "Get detailed project information",
      },
      {
        name: "assess_fit",
        description: "Assess candidate fit for a job description",
      },
      {
        name: "ask_shrey",
        description:
          "Ask Shreyans a question grounded in his portfolio data",
      },
      {
        name: "explore_happiness_liability",
        description:
          "Explore the world of The Happiness Liability, Shreyans' science-fiction novel (spoiler-safe worldbuilding)",
      },
    ],
    usage: {
      mcp: "POST to this endpoint with a JSON-RPC initialize request to start a session.",
      rest: "For simple REST access, use /api/portfolio instead. See /api/portfolio/openapi.json for the OpenAPI spec.",
    },
    activeSessions: sessions.size,
  });
});

/**
 * DELETE /api/mcp-connector
 * Session cleanup endpoint. Terminates the session and frees resources.
 */
router.delete("/", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];

  if (!sessionId || !sessions.has(sessionId)) {
    res.status(404).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Session not found" },
      id: null,
    });
    return;
  }

  const transport = sessions.get(sessionId);
  await transport.handleRequest(req, res);
  sessions.delete(sessionId);
  console.log(`MCP session deleted: ${sessionId}`);
});

/**
 * GET /api/mcp-connector/info
 * Human-readable server information endpoint.
 */
router.get("/info", (req, res) => {
  res.json({
    name: "shreyans-portfolio-mcp",
    version: "2.1.0",
    description:
      "Shreyans Khunteta's AI-powered portfolio intelligence server",
    protocolVersion: "2025-03-26",
    capabilities: { tools: true },
    tools: [
      { name: "portfolio_search", description: "Search portfolio content" },
      {
        name: "analyze_portfolio",
        description: "Analyze portfolio against job requirements",
      },
      {
        name: "get_project_details",
        description: "Get detailed project information",
      },
      {
        name: "assess_fit",
        description: "Assess candidate fit for a job description",
      },
      {
        name: "ask_shrey",
        description:
          "Ask Shreyans a question grounded in his portfolio data",
      },
      {
        name: "explore_happiness_liability",
        description:
          "Explore the world of The Happiness Liability, Shreyans' science-fiction novel (spoiler-safe worldbuilding)",
      },
    ],
    connectionInfo: {
      endpoint: "/api/mcp-connector",
      transport: "streamable-http",
      usage: {
        claudeExample: {
          mcp_servers: [
            {
              type: "url",
              url: "https://backend.builtbyshrey.com/api/mcp-connector",
              name: "shreyans-portfolio",
              tool_configuration: {
                enabled: true,
                allowed_tools: [
                  "portfolio_search",
                  "analyze_portfolio",
                  "get_project_details",
                  "assess_fit",
                  "ask_shrey",
                  "explore_happiness_liability",
                ],
              },
            },
          ],
        },
      },
    },
    activeSessions: sessions.size,
  });
});

export default router;
