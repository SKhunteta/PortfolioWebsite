import express from "express";
import OpenAIService from "../services/openai.js";
import AnthropicService from "../services/anthropic.js";
import QdrantService from "../services/qdrant.js";
import IndexerService from "../services/indexer.js";

const router = express.Router();

/**
 * GET /api/portfolio
 * Overview of available endpoints — useful for discovery by ChatGPT and other REST clients.
 */
router.get("/", (req, res) => {
  res.json({
    name: "Shreyans Khunteta Portfolio API",
    version: "1.0.0",
    description:
      "REST API for querying Shreyans Khunteta's portfolio — projects, skills, experience, and AI-powered search.",
    endpoints: {
      "GET /api/portfolio": "This overview",
      "GET /api/portfolio/about": "Personal info and bio",
      "GET /api/portfolio/projects": "List all projects (optional ?featured=true)",
      "GET /api/portfolio/projects/:id": "Get a specific project by ID",
      "GET /api/portfolio/skills": "List all skill categories",
      "GET /api/portfolio/experience": "List work experience",
      "GET /api/portfolio/search?q=...": "Semantic search across portfolio content",
      "POST /api/portfolio/ask": "Ask a question (body: { question })",
      "POST /api/portfolio/assess-fit":
        "Assess fit for a job (body: { jobDescription, requiredSkills? })",
      "GET /api/portfolio/openapi.json": "OpenAPI 3.1 specification",
    },
  });
});

// ──────────────────────────────────────────────
// Static data endpoints (no AI calls required)
// ──────────────────────────────────────────────

/**
 * GET /api/portfolio/about
 */
router.get("/about", async (req, res) => {
  try {
    const data = await IndexerService.loadPortfolioData();
    res.json({
      personal: data.personal,
      interests: data.interests,
    });
  } catch (error) {
    console.error("Error loading about data:", error);
    res.status(500).json({ error: "Failed to load portfolio data" });
  }
});

/**
 * GET /api/portfolio/projects
 * Optional query: ?featured=true
 */
router.get("/projects", async (req, res) => {
  try {
    const data = await IndexerService.loadPortfolioData();
    let projects = data.projects;

    if (req.query.featured === "true") {
      projects = projects.filter((p) => p.featured);
    }

    res.json({
      count: projects.length,
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        technologies: p.technologies,
        type: p.type,
        status: p.status,
        featured: p.featured,
        github: p.github,
        live_demo: p.live_demo || null,
      })),
    });
  } catch (error) {
    console.error("Error loading projects:", error);
    res.status(500).json({ error: "Failed to load projects" });
  }
});

/**
 * GET /api/portfolio/projects/:id
 */
router.get("/projects/:id", async (req, res) => {
  try {
    const data = await IndexerService.loadPortfolioData();
    const project = data.projects.find((p) => p.id === req.params.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(project);
  } catch (error) {
    console.error("Error loading project:", error);
    res.status(500).json({ error: "Failed to load project" });
  }
});

/**
 * GET /api/portfolio/skills
 */
router.get("/skills", async (req, res) => {
  try {
    const data = await IndexerService.loadPortfolioData();
    res.json({
      count: data.skills.length,
      categories: data.skills,
    });
  } catch (error) {
    console.error("Error loading skills:", error);
    res.status(500).json({ error: "Failed to load skills" });
  }
});

/**
 * GET /api/portfolio/experience
 */
router.get("/experience", async (req, res) => {
  try {
    const data = await IndexerService.loadPortfolioData();
    res.json({
      experience: data.experience,
      linkedin: data.linkedin_profile || null,
    });
  } catch (error) {
    console.error("Error loading experience:", error);
    res.status(500).json({ error: "Failed to load experience" });
  }
});

// ──────────────────────────────────────────────
// AI-powered endpoints (vector search + LLM)
// ──────────────────────────────────────────────

/**
 * GET /api/portfolio/search?q=<query>&types=project,skill
 * Semantic search across portfolio content.
 */
router.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  try {
    const queryEmbedding = await OpenAIService.generateEmbedding(query);

    const typeParam = req.query.types;
    let searchResults;
    if (typeParam) {
      const contentTypes = typeParam.split(",").map((t) => t.trim());
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

    res.json({
      query,
      answer: aiResponse.answer,
      sources: aiResponse.sources,
      timestamp: aiResponse.timestamp,
    });
  } catch (error) {
    console.error("Error in portfolio search:", error);
    res.status(500).json({ error: "Search failed. Please try again." });
  }
});

/**
 * POST /api/portfolio/ask
 * Body: { "question": "What AI projects has Shreyans built?" }
 */
router.post("/ask", async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: "Field 'question' is required" });
  }

  try {
    const queryEmbedding = await OpenAIService.generateEmbedding(question);
    const searchResults = await QdrantService.search(queryEmbedding, 8);

    const systemPrompt = `You are responding on behalf of Shreyans Khunteta, drawing from his actual portfolio, projects, writing, and documented perspectives.

Guidelines:
- Ground every response in the provided context
- Reference specific projects, blog posts, experiences, and views
- Do not fabricate opinions or experiences not supported by the context
- If the context doesn't contain enough information, say so honestly
- Respond in first person as Shreyans would — professionally but with personality`;

    const contextText = AnthropicService.buildContextText(searchResults);
    const userPrompt = `Based on the following information about Shreyans Khunteta's portfolio and work:\n\n${contextText}\n\nPlease answer this question as Shreyans would: ${question}`;

    const answer = await AnthropicService.generateMCPResponse({
      systemPrompt,
      userQuery: userPrompt,
    });

    res.json({
      question,
      answer,
      sources: AnthropicService.extractSources(searchResults),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in portfolio ask:", error);
    res.status(500).json({ error: "Failed to generate answer. Please try again." });
  }
});

/**
 * POST /api/portfolio/assess-fit
 * Body: { "jobDescription": "...", "requiredSkills": ["Python", "AWS"] }
 */
router.post("/assess-fit", async (req, res) => {
  const { jobDescription, requiredSkills } = req.body;
  if (!jobDescription) {
    return res
      .status(400)
      .json({ error: "Field 'jobDescription' is required" });
  }

  try {
    const skills = requiredSkills || [];
    const fitQuery = `Skills and experience relevant to: ${jobDescription} ${skills.join(", ")}`;

    const queryEmbedding = await OpenAIService.generateEmbedding(fitQuery);
    const searchResults = await QdrantService.searchMultipleTypes(
      queryEmbedding,
      ["experience", "skill", "project"],
      10
    );

    const systemPrompt = `You are assessing Shreyans Khunteta as a candidate. Provide a structured fit assessment based on his actual portfolio data.

Your response MUST include these sections:
1. **Overall Fit Summary** - A brief 2-3 sentence assessment
2. **Matching Experience** - Specific roles and responsibilities that align
3. **Relevant Projects** - Portfolio projects that demonstrate qualification
4. **Skill Alignment** - Skills that match the requirements
5. **Potential Gaps** - Honest assessment of areas where growth would be needed
6. **Interview Talking Points** - Key strengths to highlight

Be specific and reference actual projects, roles, and skills. Do not fabricate experience.`;

    const userPrompt = `Job Description:\n${jobDescription}\n\nRequired Skills: ${skills.join(", ")}\n\nShreyans' Relevant Background:\n${JSON.stringify(searchResults, null, 2)}`;

    const assessment = await AnthropicService.generateMCPResponse({
      systemPrompt,
      userQuery: userPrompt,
    });

    res.json({
      jobDescription,
      requiredSkills: skills,
      assessment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in assess-fit:", error);
    res.status(500).json({ error: "Failed to assess fit. Please try again." });
  }
});

// ──────────────────────────────────────────────
// OpenAPI specification
// ──────────────────────────────────────────────

/**
 * GET /api/portfolio/openapi.json
 */
router.get("/openapi.json", (req, res) => {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://backend.builtbyshrey.com"
      : `http://localhost:${process.env.PORT || 3001}`;

  res.json({
    openapi: "3.1.0",
    info: {
      title: "Shreyans Khunteta Portfolio API",
      version: "1.0.0",
      description:
        "REST API for querying Shreyans Khunteta's software engineering portfolio — projects, skills, experience, and AI-powered semantic search. Use this API to learn about Shreyans' background, explore his projects, or assess his fit for a role.",
    },
    servers: [{ url: baseUrl }],
    paths: {
      "/api/portfolio/about": {
        get: {
          operationId: "getAbout",
          summary: "Get personal info and bio",
          responses: {
            200: {
              description: "Personal information",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
      "/api/portfolio/projects": {
        get: {
          operationId: "listProjects",
          summary: "List all portfolio projects",
          parameters: [
            {
              name: "featured",
              in: "query",
              schema: { type: "string", enum: ["true"] },
              description: "Filter to featured projects only",
            },
          ],
          responses: {
            200: {
              description: "List of projects",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
      "/api/portfolio/projects/{id}": {
        get: {
          operationId: "getProject",
          summary: "Get details for a specific project",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Project ID (e.g. ai-powered-portfolio, lingua-ai-chatbot)",
            },
          ],
          responses: {
            200: {
              description: "Project details",
              content: { "application/json": { schema: { type: "object" } } },
            },
            404: { description: "Project not found" },
          },
        },
      },
      "/api/portfolio/skills": {
        get: {
          operationId: "listSkills",
          summary: "List all skill categories and individual skills",
          responses: {
            200: {
              description: "Skill categories",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
      "/api/portfolio/experience": {
        get: {
          operationId: "getExperience",
          summary: "Get work experience and LinkedIn profile info",
          responses: {
            200: {
              description: "Experience data",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
      "/api/portfolio/search": {
        get: {
          operationId: "searchPortfolio",
          summary:
            "Semantic search across all portfolio content with AI-generated answer",
          parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: "Search query (e.g. 'What AI projects has Shreyans built?')",
            },
            {
              name: "types",
              in: "query",
              schema: { type: "string" },
              description:
                "Comma-separated content types to filter (project, skill, experience, personal)",
            },
          ],
          responses: {
            200: {
              description: "Search results with AI-generated answer",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
      "/api/portfolio/ask": {
        post: {
          operationId: "askShreyans",
          summary:
            "Ask Shreyans a question — responds in first person grounded in portfolio data",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["question"],
                  properties: {
                    question: {
                      type: "string",
                      description: "The question to ask",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Answer from Shreyans",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
      "/api/portfolio/assess-fit": {
        post: {
          operationId: "assessFit",
          summary:
            "Assess how well Shreyans fits a specific job description",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["jobDescription"],
                  properties: {
                    jobDescription: {
                      type: "string",
                      description: "Full job description text",
                    },
                    requiredSkills: {
                      type: "array",
                      items: { type: "string" },
                      description: "List of required skills from the posting",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Structured fit assessment",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
    },
  });
});

export default router;
