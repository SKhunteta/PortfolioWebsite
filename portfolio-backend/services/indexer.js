import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import OpenAIService from "./openai.js";
import QdrantService from "./qdrant.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class IndexerService {
  constructor() {
    this.portfolioDataPath = path.join(__dirname, "../data/portfolio.json");
  }

  /**
   * Initialize the indexing system
   */
  async initialize() {
    try {
      console.log("🚀 Initializing indexer service...");

      // Initialize Qdrant collection
      await QdrantService.initializeCollection();

      console.log("✅ Indexer service initialized");
    } catch (error) {
      console.error("Error initializing indexer:", error);
      throw error;
    }
  }

  /**
   * Index all portfolio content
   */
  async indexAllContent() {
    try {
      console.log("📚 Starting content indexing...");

      const portfolioData = await this.loadPortfolioData();
      const documents = [];

      // Index projects
      console.log("Indexing projects...");
      for (const project of portfolioData.projects) {
        const projectDoc = await this.processProject(project);
        documents.push(projectDoc);
      }

      // Index skills
      console.log("Indexing skills...");
      for (const skillCategory of portfolioData.skills) {
        const skillDoc = await this.processSkillCategory(skillCategory);
        documents.push(skillDoc);
      }

      // Index experience
      console.log("Indexing experience...");
      for (const experience of portfolioData.experience) {
        const expDoc = await this.processExperience(experience);
        documents.push(expDoc);
      }

      // Index personal information
      console.log("Indexing personal information...");
      const personalDoc = await this.processPersonalInfo(
        portfolioData.personal
      );
      documents.push(personalDoc);

      // Add all documents to Qdrant
      console.log(`Adding ${documents.length} documents to vector database...`);
      await QdrantService.addDocuments(documents);

      console.log("✅ Content indexing completed successfully");
      return { success: true, documentsIndexed: documents.length };
    } catch (error) {
      console.error("Error indexing content:", error);
      throw error;
    }
  }

  /**
   * Load portfolio data from JSON file
   */
  async loadPortfolioData() {
    try {
      const data = await fs.readFile(this.portfolioDataPath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Error loading portfolio data:", error);
      throw new Error("Failed to load portfolio data");
    }
  }

  /**
   * Process a project and create a document for indexing
   */
  async processProject(project) {
    const content = this.buildProjectContent(project);
    const embedding = await OpenAIService.generateEmbedding(content);

    return {
      id: uuidv4(),
      vector: embedding,
      payload: {
        original_id: `project_${project.id}`,
        content_type: "project",
        title: project.title,
        description: project.description,
        technologies: project.technologies,
        github: project.github,
        featured: project.featured,
        type: project.type,
        status: project.status,
        url: project.github,
        searchable_content: content,
      },
    };
  }

  /**
   * Process a skill category and create a document for indexing
   */
  async processSkillCategory(skillCategory) {
    const content = this.buildSkillContent(skillCategory);
    const embedding = await OpenAIService.generateEmbedding(content);

    return {
      id: uuidv4(),
      vector: embedding,
      payload: {
        original_id: `skill_${skillCategory.category
          .toLowerCase()
          .replace(/\s+/g, "_")}`,
        content_type: "skill",
        title: skillCategory.category,
        description: `Skills in ${
          skillCategory.category
        }: ${skillCategory.skills.join(", ")}`,
        technologies: skillCategory.skills,
        experience_level: skillCategory.experience_level,
        category: skillCategory.category,
        url: null,
        searchable_content: content,
      },
    };
  }

  /**
   * Process experience and create a document for indexing
   */
  async processExperience(experience) {
    const content = this.buildExperienceContent(experience);
    const embedding = await OpenAIService.generateEmbedding(content);

    return {
      id: uuidv4(),
      vector: embedding,
      payload: {
        original_id: `experience_${experience.role
          .toLowerCase()
          .replace(/\s+/g, "_")}`,
        content_type: "experience",
        title: `${experience.role} at ${experience.company}`,
        description: experience.description,
        technologies: experience.technologies || [],
        role: experience.role,
        company: experience.company,
        duration: experience.duration,
        key_achievements: experience.key_achievements || [],
        url: null,
        searchable_content: content,
      },
    };
  }

  /**
   * Process personal information and create a document for indexing
   */
  async processPersonalInfo(personal) {
    const content = this.buildPersonalContent(personal);
    const embedding = await OpenAIService.generateEmbedding(content);

    return {
      id: uuidv4(),
      vector: embedding,
      payload: {
        original_id: "personal_info",
        content_type: "personal",
        title: `About ${personal.name}`,
        description: personal.bio,
        technologies: [],
        name: personal.name,
        title_role: personal.title,
        location: personal.location,
        email: personal.email,
        website: personal.website,
        linkedin: personal.linkedin,
        github: personal.github,
        blog: personal.blog,
        url: personal.website,
        searchable_content: content,
      },
    };
  }

  /**
   * Build searchable content for a project
   */
  buildProjectContent(project) {
    return `Project: ${project.title}
Description: ${project.description}
Technologies: ${project.technologies.join(", ")}
Type: ${project.type}
Status: ${project.status}
${project.featured ? "Featured project" : ""}
${project.github ? `GitHub: ${project.github}` : ""}`;
  }

  /**
   * Build searchable content for skills
   */
  buildSkillContent(skillCategory) {
    return `Skill Category: ${skillCategory.category}
Experience Level: ${skillCategory.experience_level}
Skills: ${skillCategory.skills.join(", ")}
Technologies: ${skillCategory.skills.join(", ")}`;
  }

  /**
   * Build searchable content for experience
   */
  buildExperienceContent(experience) {
    const achievements = experience.key_achievements
      ? experience.key_achievements.join(". ")
      : "";

    return `Role: ${experience.role}
Company: ${experience.company}
Duration: ${experience.duration}
Description: ${experience.description}
Technologies: ${
      experience.technologies ? experience.technologies.join(", ") : ""
    }
Key Achievements: ${achievements}`;
  }

  /**
   * Build searchable content for personal information
   */
  buildPersonalContent(personal) {
    return `Name: ${personal.name}
Title: ${personal.title}
Bio: ${personal.bio}
Location: ${personal.location}
Website: ${personal.website}
Professional profile and contact information for software engineer`;
  }

  /**
   * Re-index specific content type
   */
  async reindexContentType(contentType) {
    try {
      console.log(`Re-indexing ${contentType} content...`);

      // Delete existing documents of this type
      await QdrantService.deleteDocuments({
        must: [
          {
            key: "content_type",
            match: { value: contentType },
          },
        ],
      });

      const portfolioData = await this.loadPortfolioData();
      const documents = [];

      switch (contentType) {
        case "project":
          for (const project of portfolioData.projects) {
            documents.push(await this.processProject(project));
          }
          break;
        case "skill":
          for (const skillCategory of portfolioData.skills) {
            documents.push(await this.processSkillCategory(skillCategory));
          }
          break;
        case "experience":
          for (const experience of portfolioData.experience) {
            documents.push(await this.processExperience(experience));
          }
          break;
        case "personal":
          documents.push(
            await this.processPersonalInfo(portfolioData.personal)
          );
          break;
        default:
          console.warn(`Unknown content type for re-indexing: ${contentType}`);
          return {
            success: false,
            message: `Unknown content type: ${contentType}`,
          };
      }

      if (documents.length > 0) {
        await QdrantService.addDocuments(documents);
        console.log(
          `✅ Re-indexed ${documents.length} ${contentType} documents`
        );
        return { success: true, documentsReindexed: documents.length };
      }
      console.log(`ℹ️ No documents found to re-index for type: ${contentType}`);
      return { success: true, documentsReindexed: 0 };
    } catch (error) {
      console.error(`Error re-indexing ${contentType}:`, error);
      throw error;
    }
  }

  /**
   * Get indexing status
   */
  async getIndexingStatus() {
    try {
      const collectionInfo = await QdrantService.getCollectionInfo();

      return {
        collection: collectionInfo.result.collection_name,
        totalPoints: collectionInfo.result.points_count,
        vectorSize: collectionInfo.result.config.params.vectors.size,
        status: "healthy",
      };
    } catch (error) {
      console.error("Error getting indexing status:", error);
      return {
        status: "error",
        error: error.message,
      };
    }
  }
}

export default new IndexerService();
