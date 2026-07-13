import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import OpenAIService from "./openai.js";
import QdrantService from "./qdrant.js";
import { buildCanonDocuments } from "./canon.js";

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
      console.log("Initializing indexer service...");

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

      // Index technical expertise
      if (portfolioData.technical_expertise) {
        console.log("Indexing technical expertise...");
        const technicalDoc = await this.processTechnicalExpertise(
          portfolioData.technical_expertise
        );
        documents.push(technicalDoc);
      }

      // Index creative work
      if (portfolioData.creative_work) {
        console.log("Indexing creative work...");
        const creativeDoc = await this.processCreativeWork(
          portfolioData.creative_work
        );
        documents.push(creativeDoc);
      }

      // Index interests
      if (portfolioData.interests) {
        console.log("Indexing interests...");
        const interestsDoc = await this.processInterests(
          portfolioData.interests
        );
        documents.push(interestsDoc);
      }

      // Index learning journey
      if (portfolioData.learning_journey) {
        console.log("Indexing learning journey...");
        const learningDoc = await this.processLearningJourney(
          portfolioData.learning_journey
        );
        documents.push(learningDoc);
      }

      // Index philosophical perspectives
      if (portfolioData.philosophical_perspectives) {
        console.log("Indexing philosophical perspectives...");
        const philosophicalDoc = await this.processPhilosophicalPerspectives(
          portfolioData.philosophical_perspectives
        );
        documents.push(philosophicalDoc);
      }

      // Index Kali (the cat)
      if (portfolioData.Kali) {
        console.log("Indexing Kali information...");
        const kaliDoc = await this.processKali(portfolioData.Kali);
        documents.push(kaliDoc);
      }

      // Index LinkedIn profile
      if (portfolioData.linkedin_profile) {
        console.log("Indexing LinkedIn profile...");
        const linkedinDoc = await this.processLinkedInProfile(
          portfolioData.linkedin_profile
        );
        documents.push(linkedinDoc);
      }

      // Index The Happiness Liability world canon
      try {
        console.log("Indexing Happiness Liability world canon...");
        const canonDocs = await this.processCanonContent();
        documents.push(...canonDocs);
      } catch (error) {
        console.warn(
          "⚠️ Skipping Happiness Liability canon (indexing continues):",
          error.message
        );
      }

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
    let content = `Project: ${project.title}
Description: ${project.description}
Technologies: ${project.technologies.join(", ")}
Type: ${project.type}
Status: ${project.status}
${project.featured ? "Featured project" : ""}
${project.github ? `GitHub: ${project.github}` : ""}`;

    // Add technical project specific fields
    if (project.technical_achievements) {
      content += `\nTechnical Achievements: ${project.technical_achievements.join(
        ". "
      )}`;
    }
    if (project.learning_highlights) {
      content += `\nLearning Highlights: ${project.learning_highlights.join(
        ". "
      )}`;
    }

    // Add creative writing project specific fields
    if (project.plot_summary) {
      const plot = project.plot_summary;
      content += `\nPlot Summary:`;
      if (plot.setting) content += ` Setting: ${plot.setting}.`;
      if (plot.protagonist) content += ` Protagonist: ${plot.protagonist}.`;
      if (plot.central_conflict)
        content += ` Central Conflict: ${plot.central_conflict}.`;
      if (plot.narrative_structure)
        content += ` Narrative Structure: ${plot.narrative_structure}.`;
      if (plot.climax) content += ` Climax: ${plot.climax}.`;
      if (plot.themes) content += ` Themes: ${plot.themes}.`;
    }

    if (project.key_characters) {
      content += `\nKey Characters:`;
      Object.entries(project.key_characters).forEach(([name, char]) => {
        content += ` ${name}: ${char.role || ""} ${char.background || ""} ${
          char.character_arc || ""
        } ${char.significance || ""}`;
      });
    }

    if (project.mythological_framework) {
      const myth = project.mythological_framework;
      content += `\nMythological Framework: Source: ${myth.source || ""}`;
      if (myth.significance) content += ` Significance: ${myth.significance}`;
      // Add individual mythological elements
      Object.entries(myth).forEach(([key, value]) => {
        if (
          key !== "source" &&
          key !== "significance" &&
          typeof value === "string"
        ) {
          content += ` ${key}: ${value}`;
        }
      });
    }

    if (project.technical_concepts_explored) {
      content += `\nTechnical Concepts Explored: ${project.technical_concepts_explored.join(
        ". "
      )}`;
    }

    if (project.literary_achievements) {
      content += `\nLiterary Achievements: ${project.literary_achievements.join(
        ". "
      )}`;
    }

    if (project.cultural_depth) {
      content += `\nCultural Depth: ${project.cultural_depth.join(". ")}`;
    }

    if (project.writing_style) {
      content += `\nWriting Style: ${project.writing_style.join(". ")}`;
    }

    // Add community/activism project specific fields
    if (project.activities) {
      content += `\nActivities: ${project.activities.join(", ")}`;
    }
    if (project.ideology) {
      content += `\nIdeology: ${project.ideology}`;
    }
    if (project.location) {
      content += `\nLocation: ${project.location}`;
    }
    if (project.founded_year) {
      content += `\nFounded: ${project.founded_year}`;
    }
    if (project.impact && project.impact.notable_successes) {
      content += `\nImpact: ${project.impact.notable_successes.join(", ")}`;
    }

    // Add additional URLs if available
    if (project.live_demo) {
      content += `\nLive Demo: ${project.live_demo}`;
    }
    if (project.backend_api) {
      content += `\nBackend API: ${project.backend_api}`;
    }
    if (project.url) {
      content += `\nURL: ${project.url}`;
    }
    if (project.published) {
      content += `\nPublished: ${project.published}`;
    }

    return content;
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

    const recentLearning = experience.recent_learning_focus
      ? experience.recent_learning_focus.join(". ")
      : "";

    return `Role: ${experience.role}
Company: ${experience.company}
Duration: ${experience.duration}
Description: ${experience.description}
Technologies: ${
      experience.technologies ? experience.technologies.join(", ") : ""
    }
Key Achievements: ${achievements}${
      recentLearning ? `\nRecent Learning Focus: ${recentLearning}` : ""
    }`;
  }

  /**
   * Build searchable content for personal information
   */
  buildPersonalContent(personal) {
    const educationInfo = personal.education
      ? `Education: ${personal.education.degree} from ${
          personal.education.school
        }, graduated ${personal.education.graduation_year}. Minors: ${
          personal.education.minors?.join(", ") || "None"
        }.`
      : "";

    return `Name: ${personal.name}
Title: ${personal.title}
Bio: ${personal.bio}
Location: ${personal.location}
Birth Date: ${personal.birth_date}
Email: ${personal.email}
Website: ${personal.website}
LinkedIn: ${personal.linkedin}
GitHub: ${personal.github}
Blog: ${personal.blog}
Favorite Color: ${personal.favorite_color}
${educationInfo}
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
        case "technical_expertise":
          if (portfolioData.technical_expertise) {
            documents.push(
              await this.processTechnicalExpertise(
                portfolioData.technical_expertise
              )
            );
          }
          break;
        case "creative_work":
          if (portfolioData.creative_work) {
            documents.push(
              await this.processCreativeWork(portfolioData.creative_work)
            );
          }
          break;
        case "interests":
          if (portfolioData.interests) {
            documents.push(
              await this.processInterests(portfolioData.interests)
            );
          }
          break;
        case "learning_journey":
          if (portfolioData.learning_journey) {
            documents.push(
              await this.processLearningJourney(portfolioData.learning_journey)
            );
          }
          break;
        case "philosophical_perspectives":
          if (portfolioData.philosophical_perspectives) {
            documents.push(
              await this.processPhilosophicalPerspectives(
                portfolioData.philosophical_perspectives
              )
            );
          }
          break;
        case "personal_pet":
        case "kali":
          if (portfolioData.Kali) {
            documents.push(await this.processKali(portfolioData.Kali));
          }
          break;
        case "linkedin_profile":
          if (portfolioData.linkedin_profile) {
            documents.push(
              await this.processLinkedInProfile(portfolioData.linkedin_profile)
            );
          }
          break;
        case "happiness_liability":
          documents.push(...(await this.processCanonContent()));
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
   * Process The Happiness Liability world canon into indexable documents.
   * Doc shaping lives in services/canon.js next to the data; this only
   * embeds and wraps each document as a Qdrant point.
   */
  async processCanonContent() {
    const documents = [];
    for (const doc of buildCanonDocuments()) {
      const embedding = await OpenAIService.generateEmbedding(
        doc.searchable_content
      );
      documents.push({
        id: uuidv4(),
        vector: embedding,
        payload: {
          original_id: doc.original_id,
          content_type: "happiness_liability",
          aspect: doc.aspect,
          title: doc.title,
          description: doc.description,
          technologies: [],
          url: doc.url,
          searchable_content: doc.searchable_content,
        },
      });
    }
    return documents;
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

  /**
   * Process technical expertise and create a document for indexing
   */
  async processTechnicalExpertise(technicalExpertise) {
    const content = this.buildTechnicalExpertiseContent(technicalExpertise);
    const embedding = await OpenAIService.generateEmbedding(content);

    return {
      id: uuidv4(),
      vector: embedding,
      payload: {
        original_id: "technical_expertise",
        content_type: "technical_expertise",
        title: "Technical Expertise and Skills",
        description:
          "Comprehensive technical expertise including debugging skills, development methodologies, and architecture patterns",
        technologies: [],
        url: null,
        searchable_content: content,
      },
    };
  }

  /**
   * Process creative work and create a document for indexing
   */
  async processCreativeWork(creativeWork) {
    const content = this.buildCreativeWorkContent(creativeWork);
    const embedding = await OpenAIService.generateEmbedding(content);

    return {
      id: uuidv4(),
      vector: embedding,
      payload: {
        original_id: "creative_work",
        content_type: "creative_work",
        title: "Creative Writing and Literary Work",
        description:
          "Creative writing themes, narrative techniques, and character development approaches",
        technologies: [],
        url: null,
        searchable_content: content,
      },
    };
  }

  /**
   * Process interests and create a document for indexing
   */
  async processInterests(interests) {
    const content = this.buildInterestsContent(interests);
    const embedding = await OpenAIService.generateEmbedding(content);

    return {
      id: uuidv4(),
      vector: embedding,
      payload: {
        original_id: "interests",
        content_type: "interests",
        title: "Professional and Personal Interests",
        description:
          "Areas of interest including technology, creative writing, and philosophical studies",
        technologies: [],
        url: null,
        searchable_content: content,
      },
    };
  }

  /**
   * Process learning journey and create a document for indexing
   */
  async processLearningJourney(learningJourney) {
    const content = this.buildLearningJourneyContent(learningJourney);
    const embedding = await OpenAIService.generateEmbedding(content);

    return {
      id: uuidv4(),
      vector: embedding,
      payload: {
        original_id: "learning_journey",
        content_type: "learning_journey",
        title: "Learning Journey and Growth",
        description:
          "Recent achievements and technical growth areas in software development and creative writing",
        technologies: [],
        url: null,
        searchable_content: content,
      },
    };
  }

  /**
   * Process philosophical perspectives and create a document for indexing
   */
  async processPhilosophicalPerspectives(philosophicalPerspectives) {
    const content = this.buildPhilosophicalPerspectivesContent(
      philosophicalPerspectives
    );
    const embedding = await OpenAIService.generateEmbedding(content);

    return {
      id: uuidv4(),
      vector: embedding,
      payload: {
        original_id: "philosophical_perspectives",
        content_type: "philosophical_perspectives",
        title: "Philosophical Perspectives on Technology",
        description:
          "Views on technology ethics, cultural integration, and consciousness studies",
        technologies: [],
        url: null,
        searchable_content: content,
      },
    };
  }

  /**
   * Process Kali (the cat) and create a document for indexing
   */
  async processKali(kali) {
    const content = this.buildKaliContent(kali);
    const embedding = await OpenAIService.generateEmbedding(content);

    return {
      id: uuidv4(),
      vector: embedding,
      payload: {
        original_id: "kali_the_cat",
        content_type: "personal_pet",
        title: "Kali - The Mythic Familiar",
        description:
          "Information about Kali, the intelligent and demanding cat companion",
        technologies: [],
        url: null,
        searchable_content: content,
      },
    };
  }

  /**
   * Process LinkedIn profile and create a document for indexing
   */
  async processLinkedInProfile(linkedinProfile) {
    const content = this.buildLinkedInContent(linkedinProfile);
    const embedding = await OpenAIService.generateEmbedding(content);

    return {
      id: uuidv4(),
      vector: embedding,
      payload: {
        original_id: "linkedin_profile",
        content_type: "linkedin_profile",
        title: `${linkedinProfile.name} - LinkedIn Profile`,
        description: linkedinProfile.about,
        technologies: linkedinProfile.skills || [],
        name: linkedinProfile.name,
        headline: linkedinProfile.headline,
        location: linkedinProfile.location,
        industry: linkedinProfile.industry,
        current_role: linkedinProfile.current_role,
        education: linkedinProfile.education,
        url: linkedinProfile.linkedin_url,
        searchable_content: content,
      },
    };
  }

  /**
   * Build searchable content for technical expertise
   */
  buildTechnicalExpertiseContent(technicalExpertise) {
    const debuggingSkills =
      technicalExpertise.debugging_skills?.join(", ") || "";
    const methodologies =
      technicalExpertise.development_methodologies?.join(", ") || "";
    const architecturePatterns =
      technicalExpertise.architecture_patterns?.join(", ") || "";

    return `Technical Expertise:
Debugging Skills: ${debuggingSkills}
Development Methodologies: ${methodologies}
Architecture Patterns: ${architecturePatterns}`;
  }

  /**
   * Build searchable content for creative work
   */
  buildCreativeWorkContent(creativeWork) {
    const themes = creativeWork.writing_themes?.join(", ") || "";
    const techniques = creativeWork.narrative_techniques?.join(", ") || "";
    const characterDev =
      creativeWork.character_development_techniques?.join(", ") || "";

    return `Creative Writing Work:
Writing Themes: ${themes}
Narrative Techniques: ${techniques}
Character Development Techniques: ${characterDev}`;
  }

  /**
   * Build searchable content for interests
   */
  buildInterestsContent(interests) {
    return `Professional and Personal Interests: ${interests.join(", ")}`;
  }

  /**
   * Build searchable content for learning journey
   */
  buildLearningJourneyContent(learningJourney) {
    const achievements = learningJourney.recent_achievements?.join(", ") || "";
    const growthAreas =
      learningJourney.technical_growth_areas?.join(", ") || "";

    return `Learning Journey:
Recent Achievements: ${achievements}
Technical Growth Areas: ${growthAreas}`;
  }

  /**
   * Build searchable content for philosophical perspectives
   */
  buildPhilosophicalPerspectivesContent(philosophicalPerspectives) {
    const ethics =
      philosophicalPerspectives.technology_ethics?.join(", ") || "";
    const cultural =
      philosophicalPerspectives.cultural_integration?.join(", ") || "";
    const consciousness =
      philosophicalPerspectives.consciousness_studies?.join(", ") || "";

    return `Philosophical Perspectives:
Technology Ethics: ${ethics}
Cultural Integration: ${cultural}
Consciousness Studies: ${consciousness}`;
  }

  /**
   * Build searchable content for Kali
   */
  buildKaliContent(kali) {
    const personality = kali.personality?.join(", ") || "";
    const activities = kali.favorite_activities?.join(", ") || "";
    const traits = kali.notable_traits?.join(", ") || "";
    const nicknames = kali.nicknames?.join(", ") || "";

    const adoptionInfo = kali.adoption_info
      ? `Adopted: ${kali.adoption_info.adopted_date} from ${kali.adoption_info.adopted_from} by ${kali.adoption_info.adopted_by}`
      : "";

    return `Kali the Cat:
Name: ${kali.name}
Species: ${kali.species}
Breed: ${kali.breed}
Color: ${kali.color}
Age: ${kali.age}
${adoptionInfo}
Personality: ${personality}
Favorite Activities: ${activities}
Notable Traits: ${traits}
Nicknames: ${nicknames}
Mythic Lore: ${kali.mythic_lore}`;
  }

  /**
   * Build searchable content for LinkedIn profile
   */
  buildLinkedInContent(linkedinProfile) {
    const pastRoles =
      linkedinProfile.past_roles
        ?.map(
          (role) =>
            `${role.title} at ${role.company} (${role.duration}) - ${role.description}`
        )
        .join("; ") || "";

    const featuredProjects =
      linkedinProfile.projects_featured
        ?.map((project) => `${project.title}: ${project.description}`)
        .join("; ") || "";

    const skills = linkedinProfile.skills?.join(", ") || "";
    const interests = linkedinProfile.interests?.join(", ") || "";

    const linkedinContent =
      linkedinProfile.linkedin_usage?.content?.join(", ") || "";

    return `LinkedIn Profile - ${linkedinProfile.name}
Headline: ${linkedinProfile.headline}
Location: ${linkedinProfile.location}
Industry: ${linkedinProfile.industry}
LinkedIn URL: ${linkedinProfile.linkedin_url}
About: ${linkedinProfile.about}

Current Role: ${linkedinProfile.current_role.title} at ${
      linkedinProfile.current_role.company
    } (${linkedinProfile.current_role.duration})
Current Role Description: ${linkedinProfile.current_role.description}

Past Roles: ${pastRoles}

Education: ${linkedinProfile.education.degree} in ${
      linkedinProfile.education.school
    }
Minors: ${linkedinProfile.education.minors?.join(", ") || ""}
Graduation Year: ${linkedinProfile.education.graduation_year}

Featured Projects: ${featuredProjects}

Skills: ${skills}
Interests: ${interests}

LinkedIn Usage Purpose: ${linkedinProfile.linkedin_usage?.purpose || ""}
LinkedIn Content: ${linkedinContent}
LinkedIn Tone: ${linkedinProfile.linkedin_usage?.tone || ""}`;
  }
}

export default new IndexerService();
