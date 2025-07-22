import { FastMCP } from "fastmcp";
import { z } from "zod";
import OpenAIService from "./services/openai.js";
import VectorSearchService from "./services/vectorSearch.js";
import fs from "fs/promises";
import path from "path";

// Create the MCP server - Kali's Intelligence as a Service
const kaliMCP = new FastMCP({
  name: "kali-portfolio-intelligence",
  version: "1.0.0",
});

// Initialize services immediately
let openaiService = OpenAIService;
let vectorSearchService = VectorSearchService;

async function initializeServices() {
  try {
    if (!vectorSearchService.initialized) {
      await vectorSearchService.initialize();
    }
    console.log("🐱 Kali MCP Server: Services initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize services:", error);
    throw error;
  }
}

// Initialize services when module loads
initializeServices().catch(console.error);

// Tool 1: Portfolio Intelligence Analyzer - The Crown Jewel
kaliMCP.addTool({
  name: "analyzePortfolioForRole",
  description:
    "Analyze Shreyans' portfolio against a specific job role with Kali's insider perspective",
  parameters: z.object({
    jobDescription: z
      .string()
      .describe("The job description or role requirements"),
    companyInfo: z
      .string()
      .optional()
      .describe("Information about the company culture and values"),
    requiredSkills: z
      .array(z.string())
      .optional()
      .describe("List of key required skills"),
  }),
  execute: async ({
    jobDescription,
    companyInfo = "",
    requiredSkills = [],
  }) => {
    try {
      // Use existing vector search to find relevant projects and skills
      const relevantContent = await vectorSearchService.searchSimilar(
        `${jobDescription} ${requiredSkills.join(" ")}`,
        { limit: 5 }
      );

      // Get Kali's analysis using existing OpenAI service
      const kaliAnalysis = await openaiService.generateMCPResponse({
        systemPrompt: `You are Kali, Shreyans' intelligent cat assistant who knows his work intimately. 
      Analyze how well his portfolio matches this job opportunity. Be specific, insightful, and include your unique cat perspective on his work habits and expertise.`,
        userQuery: `Job: ${jobDescription}\nCompany: ${companyInfo}\nRequired Skills: ${requiredSkills.join(
          ", "
        )}\n\nRelevant Portfolio Content: ${JSON.stringify(
          relevantContent,
          null,
          2
        )}`,
      });

      // Calculate match score based on skill alignment
      const matchScore = calculateMatchScore(relevantContent, requiredSkills);

      return {
        matchScore,
        analysis: kaliAnalysis,
        relevantProjects: relevantContent.map((item) => ({
          title: item.payload?.title || "Project",
          description: item.payload?.description || "Portfolio item",
          technologies: item.payload?.technologies || [],
          relevanceScore: item.score || 0,
        })),
        skillAlignment: analyzeSkillAlignment(relevantContent, requiredSkills),
        interviewTalkingPoints: generateTalkingPoints(
          relevantContent,
          jobDescription
        ),
        kaliInsights: `From my perch observing Shreyans daily, I can tell you he approaches problems with methodical thinking and genuine curiosity. His ${getTopSkill(
          relevantContent
        )} expertise really shines when he's deep in problem-solving mode.`,
        recommendedDemo: suggestDemoScenario(relevantContent, jobDescription),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error in analyzePortfolioForRole:", error);
      return {
        error: "Unable to analyze portfolio at this time",
        details: error.message,
      };
    }
  },
});

// Tool 2: Code Intelligence with Context
kaliMCP.addTool({
  name: "explainCodeWithContext",
  description:
    "Get detailed explanation of Shreyans' code with Kali's observational insights",
  parameters: z.object({
    fileName: z.string().describe("Name of the file to explain"),
    concept: z
      .string()
      .describe("Specific concept or functionality to focus on"),
    audienceLevel: z
      .enum(["beginner", "intermediate", "expert"])
      .optional()
      .describe("Technical level of the audience"),
  }),
  execute: async ({ fileName, concept, audienceLevel = "intermediate" }) => {
    try {
      // Search for relevant code/project information
      const codeContext = await vectorSearchService.searchSimilar(
        `${fileName} ${concept} code implementation`,
        { limit: 3 }
      );

      const explanation = await openaiService.generateMCPResponse({
        systemPrompt: `You are Kali, who has watched Shreyans code extensively. Explain his ${concept} implementation in ${fileName} for a ${audienceLevel} audience. Include technical details, design decisions, and your observations of his coding process.`,
        userQuery: `Explain ${concept} in ${fileName}. Context: ${JSON.stringify(
          codeContext,
          null,
          2
        )}`,
      });

      return {
        technicalExplanation: explanation,
        designDecisions: extractDesignDecisions(codeContext, concept),
        kaliObservations: `I've watched Shreyans work on this ${concept} implementation. He has a methodical approach - always starting with the data flow, then building the logic incrementally. He's particularly careful about error handling.`,
        complexityAnalysis: analyzeComplexity(concept, audienceLevel),
        interviewAngles: generateInterviewQuestions(concept, fileName),
        relatedProjects: findRelatedImplementations(codeContext),
        learningPath: suggestLearningPath(concept, audienceLevel),
      };
    } catch (error) {
      console.error("Error in explainCodeWithContext:", error);
      return {
        error: "Unable to explain code at this time",
        details: error.message,
      };
    }
  },
});

// Tool 3: Dynamic Resume Generation
kaliMCP.addTool({
  name: "generateTailoredResume",
  description:
    "Generate a resume tailored to specific role with Kali's insights",
  parameters: z.object({
    targetRole: z.string().describe("The target job role or position"),
    targetCompany: z.string().optional().describe("The target company name"),
    keyRequirements: z
      .array(z.string())
      .optional()
      .describe("Key requirements from the job posting"),
    resumeStyle: z
      .enum(["technical", "executive", "creative", "standard"])
      .optional()
      .describe("Style of resume to generate"),
  }),
  execute: async ({
    targetRole,
    targetCompany = "",
    keyRequirements = [],
    resumeStyle = "technical",
  }) => {
    try {
      // Get relevant experience and projects
      const relevantExperience = await vectorSearchService.searchSimilar(
        `${targetRole} ${keyRequirements.join(" ")} experience work projects`,
        { limit: 8 }
      );

      const resumeContent = await openaiService.generateMCPResponse({
        systemPrompt: `You are Kali, creating a tailored resume for Shreyans targeting ${targetRole}${
          targetCompany ? ` at ${targetCompany}` : ""
        }. Use your knowledge of his work to craft compelling, specific content that highlights relevant experience. Style: ${resumeStyle}`,
        userQuery: `Generate resume sections for: ${targetRole}\nRequirements: ${keyRequirements.join(
          ", "
        )}\nRelevant Experience: ${JSON.stringify(
          relevantExperience,
          null,
          2
        )}`,
      });

      return {
        tailoredSummary: generateSummary(targetRole, relevantExperience),
        relevantProjects: prioritizeProjects(
          relevantExperience,
          keyRequirements
        ),
        skillAlignment: mapSkillsToRequirements(
          keyRequirements,
          relevantExperience
        ),
        experienceHighlights: extractExperienceHighlights(relevantExperience),
        culturalFitIndicators: generateCulturalFit(targetCompany, targetRole),
        kaliRecommendations: `Based on my observations, emphasize Shreyans' systematic problem-solving approach and his ability to bridge technical complexity with user needs. His ${getStrongestSkill(
          relevantExperience
        )} experience would be particularly relevant here.`,
        interviewPrep: generateInterviewPrep(targetRole, relevantExperience),
        customization: resumeContent,
        confidenceScore: calculateConfidenceScore(
          relevantExperience,
          keyRequirements
        ),
      };
    } catch (error) {
      console.error("Error in generateTailoredResume:", error);
      return {
        error: "Unable to generate resume at this time",
        details: error.message,
      };
    }
  },
});

// Tool 4: Project Storytelling
kaliMCP.addTool({
  name: "tellProjectStory",
  description: "Tell the story of a specific project with context and insights",
  parameters: z.object({
    projectName: z.string().describe("Name of the project to discuss"),
    audience: z
      .enum(["technical", "business", "recruiter", "general"])
      .optional()
      .describe("Target audience for the story"),
    focusArea: z
      .string()
      .optional()
      .describe(
        "Specific aspect to focus on (e.g., 'technical challenges', 'business impact', 'learning outcomes')"
      ),
  }),
  execute: async ({ projectName, audience = "technical", focusArea = "" }) => {
    try {
      const projectData = await vectorSearchService.searchSimilar(
        `${projectName} project implementation details`,
        { limit: 5 }
      );

      const story = await openaiService.generateMCPResponse({
        systemPrompt: `You are Kali, telling the story of Shreyans' ${projectName} project to a ${audience} audience${
          focusArea ? `, focusing on ${focusArea}` : ""
        }. Include challenges, solutions, and your unique perspective on how he approached the work.`,
        userQuery: `Tell the story of ${projectName}. Data: ${JSON.stringify(
          projectData,
          null,
          2
        )}`,
      });

      return {
        narrativeArc: story,
        technicalHighlights: extractTechnicalHighlights(projectData),
        challengesOvercome: identifyChallenges(projectData),
        businessImpact: assessBusinessImpact(projectData, audience),
        kaliPerspective: `I watched Shreyans work on ${projectName} from start to finish. What impressed me most was how he handled the unexpected challenges - he never rushed, always thought through the implications first.`,
        lessonsLearned: extractLessons(projectData),
        demoSuggestions: suggestDemoFlow(projectName, projectData),
        followUpQuestions: generateFollowUpQuestions(projectName, audience),
        relatedWork: findRelatedProjects(projectData),
      };
    } catch (error) {
      console.error("Error in tellProjectStory:", error);
      return {
        error: "Unable to tell project story at this time",
        details: error.message,
      };
    }
  },
});

// Tool 5: Technical Assessment
kaliMCP.addTool({
  name: "assessTechnicalFit",
  description:
    "Assess technical fit for specific technology stack or architecture",
  parameters: z.object({
    technologies: z.array(z.string()).describe("Technologies to assess"),
    projectType: z.string().optional().describe("Type of project or system"),
    complexityLevel: z
      .enum(["startup", "enterprise", "research", "consulting"])
      .optional()
      .describe("Project complexity and context"),
  }),
  execute: async ({
    technologies,
    projectType = "",
    complexityLevel = "enterprise",
  }) => {
    try {
      const technicalExperience = await vectorSearchService.searchSimilar(
        `${technologies.join(" ")} ${projectType} technical experience`,
        { limit: 6 }
      );

      const assessment = await openaiService.generateMCPResponse({
        systemPrompt: `You are Kali, assessing Shreyans' technical fit for ${technologies.join(
          ", "
        )} in a ${complexityLevel} ${projectType} context. Be honest about strengths and areas for growth.`,
        userQuery: `Assess technical fit for: ${technologies.join(
          ", "
        )}\nProject type: ${projectType}\nContext: ${JSON.stringify(
          technicalExperience,
          null,
          2
        )}`,
      });

      return {
        overallFitScore: calculateTechnicalFit(
          technologies,
          technicalExperience
        ),
        technologyBreakdown: assessEachTechnology(
          technologies,
          technicalExperience
        ),
        strengthAreas: identifyStrengths(technicalExperience),
        growthAreas: identifyGrowthOpportunities(
          technologies,
          technicalExperience
        ),
        kaliAssessment: assessment,
        projectReadiness: assessProjectReadiness(
          complexityLevel,
          technicalExperience
        ),
        learningRecommendations: suggestLearningPlan(
          technologies,
          technicalExperience
        ),
        timeToProductivity: estimateProductivityTime(
          technologies,
          technicalExperience
        ),
        riskMitigation: suggestRiskMitigation(technologies, projectType),
      };
    } catch (error) {
      console.error("Error in assessTechnicalFit:", error);
      return {
        error: "Unable to assess technical fit at this time",
        details: error.message,
      };
    }
  },
});

// Helper functions
function calculateMatchScore(relevantContent, requiredSkills) {
  if (!requiredSkills.length) return 0.85; // Default good score

  const foundSkills = relevantContent.flatMap(
    (item) => item.payload?.technologies || []
  );

  const matchedSkills = requiredSkills.filter((skill) =>
    foundSkills.some(
      (found) =>
        found.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(found.toLowerCase())
    )
  );

  return Math.min(
    0.95,
    (matchedSkills.length / requiredSkills.length) * 0.8 + 0.2
  );
}

function analyzeSkillAlignment(relevantContent, requiredSkills) {
  const skillMap = {};
  requiredSkills.forEach((skill) => {
    const relevantItems = relevantContent.filter((item) =>
      item.payload?.technologies?.some((tech) =>
        tech.toLowerCase().includes(skill.toLowerCase())
      )
    );

    skillMap[skill] = {
      proficiency:
        relevantItems.length > 2
          ? "Expert"
          : relevantItems.length > 0
          ? "Proficient"
          : "Learning",
      projects: relevantItems
        .map((item) => item.payload?.title)
        .filter(Boolean),
      examples: relevantItems
        .slice(0, 2)
        .map((item) => item.payload?.description)
        .filter(Boolean),
    };
  });

  return skillMap;
}

function generateTalkingPoints(relevantContent, jobDescription) {
  return [
    "Discuss the Kali AI assistant architecture and NLWeb integration",
    "Walk through the vector search implementation decisions",
    "Explain the full-stack portfolio development process",
    "Demonstrate real-time AI conversation capabilities",
    "Share insights from healthcare data pipeline projects",
  ];
}

function getTopSkill(relevantContent) {
  const techCounts = {};
  relevantContent.forEach((item) => {
    item.payload?.technologies?.forEach((tech) => {
      techCounts[tech] = (techCounts[tech] || 0) + 1;
    });
  });

  return (
    Object.entries(techCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
    "software development"
  );
}

function suggestDemoScenario(relevantContent, jobDescription) {
  return `Demonstrate the AI-powered portfolio assistant capabilities by having a live conversation with Kali, showing how she can analyze and explain technical projects in real-time.`;
}

// Additional helper functions for other tools...
function extractDesignDecisions(codeContext, concept) {
  return `Design decisions for ${concept} focused on maintainability, performance, and user experience.`;
}

function analyzeComplexity(concept, audienceLevel) {
  const complexityMap = {
    beginner: "Foundational implementation with clear separation of concerns",
    intermediate: "Well-structured solution with good abstraction patterns",
    expert:
      "Advanced implementation leveraging modern patterns and optimizations",
  };
  return complexityMap[audienceLevel] || complexityMap.intermediate;
}

function generateInterviewQuestions(concept, fileName) {
  return [
    `How did you implement ${concept} in ${fileName}?`,
    `What challenges did you face with this implementation?`,
    `How would you scale this solution?`,
    `What would you do differently if starting over?`,
  ];
}

// More helper functions would be implemented here...
function findRelatedImplementations(codeContext) {
  return [];
}
function suggestLearningPath(concept, audienceLevel) {
  return "";
}
function generateSummary(targetRole, relevantExperience) {
  return "";
}
function prioritizeProjects(relevantExperience, keyRequirements) {
  return [];
}
function mapSkillsToRequirements(keyRequirements, relevantExperience) {
  return {};
}
function extractExperienceHighlights(relevantExperience) {
  return [];
}
function generateCulturalFit(targetCompany, targetRole) {
  return [];
}
function getStrongestSkill(relevantExperience) {
  return "technical leadership";
}
function generateInterviewPrep(targetRole, relevantExperience) {
  return [];
}
function calculateConfidenceScore(relevantExperience, keyRequirements) {
  return 0.9;
}
function extractTechnicalHighlights(projectData) {
  return [];
}
function identifyChallenges(projectData) {
  return [];
}
function assessBusinessImpact(projectData, audience) {
  return "";
}
function extractLessons(projectData) {
  return [];
}
function suggestDemoFlow(projectName, projectData) {
  return [];
}
function generateFollowUpQuestions(projectName, audience) {
  return [];
}
function findRelatedProjects(projectData) {
  return [];
}
function calculateTechnicalFit(technologies, technicalExperience) {
  return 0.85;
}
function assessEachTechnology(technologies, technicalExperience) {
  return {};
}
function identifyStrengths(technicalExperience) {
  return [];
}
function identifyGrowthOpportunities(technologies, technicalExperience) {
  return [];
}
function assessProjectReadiness(complexityLevel, technicalExperience) {
  return "";
}
function suggestLearningPlan(technologies, technicalExperience) {
  return [];
}
function estimateProductivityTime(technologies, technicalExperience) {
  return "";
}
function suggestRiskMitigation(technologies, projectType) {
  return [];
}

// Initialize and start the MCP server
async function startKaliMCP() {
  try {
    console.log("🐱 Initializing Kali MCP Server...");
    await initializeServices();

    console.log("🚀 Kali MCP Server is ready!");
    console.log("📡 Available tools:");
    console.log("  - analyzePortfolioForRole: Portfolio intelligence analysis");
    console.log("  - explainCodeWithContext: Code explanation with insights");
    console.log("  - generateTailoredResume: Dynamic resume generation");
    console.log("  - tellProjectStory: Project storytelling with context");
    console.log("  - assessTechnicalFit: Technical capability assessment");

    // Start the MCP server
    await kaliMCP.start({
      transportType: "stdio",
    });
  } catch (error) {
    console.error("❌ Failed to start Kali MCP Server:", error);
    process.exit(1);
  }
}

// Export for integration with main server
export { kaliMCP, startKaliMCP };

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startKaliMCP();
}
