import express from "express";
import IndexerService from "../services/indexer.js";
import { config } from "../config/index.js";

const router = express.Router();

/**
 * GET /api/schema
 * Return portfolio data in Schema.org format
 */
router.get("/", async (req, res) => {
  try {
    const portfolioData = await IndexerService.loadPortfolioData();
    const schemaData = buildSchemaOrgStructure(portfolioData);

    res.json(schemaData);
  } catch (error) {
    console.error("Error generating schema:", error);
    res.status(500).json({
      error: "Failed to generate schema",
      message: error.message,
    });
  }
});

/**
 * GET /api/schema/person
 * Return person schema specifically
 */
router.get("/person", async (req, res) => {
  try {
    const portfolioData = await IndexerService.loadPortfolioData();
    const personSchema = buildPersonSchema(portfolioData);

    res.json(personSchema);
  } catch (error) {
    console.error("Error generating person schema:", error);
    res.status(500).json({
      error: "Failed to generate person schema",
      message: error.message,
    });
  }
});

/**
 * Build complete Schema.org structure
 */
function buildSchemaOrgStructure(portfolioData) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildPersonSchema(portfolioData),
      ...buildProjectSchemas(portfolioData.projects),
      buildWebsiteSchema(portfolioData.personal),
    ],
  };
}

/**
 * Build Person schema
 */
function buildPersonSchema(portfolioData) {
  const { personal, skills, experience } = portfolioData;

  const allSkills = skills.flatMap((category) => category.skills);

  return {
    "@type": "Person",
    "@id": personal.website,
    name: personal.name,
    jobTitle: personal.title,
    description: personal.bio,
    url: personal.website,
    email: personal.email,
    location: {
      "@type": "Place",
      name: personal.location,
    },
    sameAs: [personal.linkedin, personal.github, personal.blog],
    knowsAbout: allSkills,
    hasOccupation: {
      "@type": "Occupation",
      name: personal.title,
      occupationLocation: {
        "@type": "Place",
        name: personal.location,
      },
      skills: allSkills.join(", "),
    },
    worksFor: experience.map((exp) => ({
      "@type": "Organization",
      name: exp.company,
    })),
    alumniOf: {
      "@type": "EducationalOrganization",
      name: "Software Engineering",
    },
  };
}

/**
 * Build project schemas
 */
function buildProjectSchemas(projects) {
  return projects.map((project) => ({
    "@type": "SoftwareApplication",
    "@id":
      project.github ||
      `${config.portfolio.owner.website}/projects/${project.id}`,
    name: project.title,
    description: project.description,
    programmingLanguage: project.technologies,
    creator: {
      "@type": "Person",
      name: config.portfolio.owner.name,
      url: config.portfolio.owner.website,
    },
    codeRepository: project.github,
    applicationCategory: project.type,
    operatingSystem: "Cross-platform",
    downloadUrl: project.github,
    featured: project.featured,
  }));
}

/**
 * Build website schema
 */
function buildWebsiteSchema(personal) {
  return {
    "@type": "WebSite",
    "@id": personal.website,
    name: `${personal.name} - Portfolio`,
    description: `Portfolio website of ${personal.name}, ${personal.title}`,
    url: personal.website,
    author: {
      "@type": "Person",
      name: personal.name,
      url: personal.website,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${personal.website}/api/ask?question={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export default router;
