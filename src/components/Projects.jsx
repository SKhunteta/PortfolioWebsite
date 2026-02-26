import React from "react";
import { FaGithub, FaExternalLinkAlt } from "react-icons/fa";

const Projects = () => {
  const projects = [
    {
      id: 0,
      title: "Portfolio Website & MCP Server",
      description:
        "A full-stack portfolio platform with a conversational AI interface and a Model Context Protocol (MCP) server that lets AI assistants query portfolio data in real-time. The MCP server is the centerpiece — connect to it right now and ask it about my work. Features a RAG pipeline powered by Qdrant vector database and OpenAI embeddings. Tools: portfolio_search, analyze_portfolio, get_project_details, assess_fit, ask_shrey.",
      technologies: [
        "React",
        "Vite",
        "Express.js",
        "OpenAI GPT-4",
        "Qdrant Vector DB",
        "MCP",
        "RAG Pipeline",
        "Tailwind CSS",
        "Railway",
        "GitHub Pages",
        "Node.js",
        "GitHub Actions",
      ],
      github: "https://github.com/SKhunteta/PortfolioWebsite",
      featured: true,
      highlights: [
        "MCP server with 5 specialized tools enabling AI assistants to query portfolio data in real-time",
        "RAG pipeline using OpenAI embeddings with Qdrant vector database for intelligent semantic search",
        "Production full-stack architecture with Express.js on Railway and React frontend on GitHub Pages",
        "Real-time conversational interface with streaming responses and dynamic loading states",
        "CI/CD pipeline with GitHub Actions for automated deployments across frontend and backend",
      ],
    },
    {
      id: 1,
      title: "The Happiness Liability",
      description:
        "A completed science fiction novella about emotional labor and algorithmic capitalism in near-future Seattle. Explores surveillance capitalism, emotional commodification, algorithmic control, and class consciousness. Beta readers compared it to Orwell, Butler, and Atwood. In final editing stages, working with a publishing concierge.",
      technologies: ["Science Fiction", "Speculative Fiction", "Creative Writing"],
      github: null,
      featured: true,
      status: "Coming Soon",
    },
    {
      id: 2,
      title: "Lingua AI Chatbot",
      description:
        "An AI-powered language learning chatbot built with Python and the OpenAI API. Features conversational AI design that helps users practice language skills with intelligent feedback and correction.",
      technologies: ["Python", "OpenAI API", "Docker", "Discord Bot"],
      github: "https://github.com/SKhunteta/lingua-ai",
      featured: true,
      video: "/images/LinguaVideo.MOV",
    },
    {
      id: 3,
      title: "The Alignment (Published Short Story)",
      description:
        "A published science fiction short story exploring AI consciousness, persuasion, and human dependency on AI systems. Uses Mahabharata mythology to explore AI alignment theory and voluntary surrender of autonomy.",
      technologies: ["Science Fiction", "AI Ethics", "Creative Writing"],
      github: null,
      featured: true,
      url: "https://prompt-injection.ghost.io/the-alignment/",
    },
    {
      id: 4,
      title: "Healthcare Data Pipeline",
      description:
        "Production data engineering pipeline with multi-cloud orchestration across AWS and Google Cloud. Processes healthcare data, converts between formats including FHIR API bundles, with ETL workflows.",
      technologies: ["Python", "AWS", "Google Cloud", "Docker", "FHIR API", "Camunda"],
      github: null,
    },
    {
      id: 5,
      title: "Loan Origination System",
      description:
        "Led the development of a comprehensive system for loan applications and processing using Blazor and MS SQL Server. Implemented secure data handling and credit score API integration.",
      technologies: ["Blazor", "C#", ".NET", "MS SQL Server", "Equifax API"],
      github: null,
    },
    {
      id: 6,
      title: "Provider Data Management Tool",
      description:
        "Internal tool to streamline healthcare provider data management with data validation, cleaning, and standardization capabilities.",
      technologies: ["C#", ".NET", "ETL", "Informatica PowerCenter", "MDM"],
      github: null,
    },
  ];

  // Separate featured projects
  const featuredProjects = projects.filter((project) => project.featured);
  const regularProjects = projects.filter((project) => !project.featured);

  return (
    <div id="projects" className="section-container py-12 md:py-16">
      <div className="text-center mb-8">
        <h2 className="section-title mx-auto">My Projects</h2>
        <p className="section-subtitle">
          Showcasing some of my recent work and contributions
        </p>
      </div>

      {/* Featured Projects */}
      {featuredProjects.map((featuredProject, index) => (
        <div key={featuredProject.id} className="mb-10 animate-fade-in">
          <div className="bg-white rounded-xl shadow-custom-lg overflow-hidden transition-all duration-300 hover:shadow-custom-2xl">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="order-2 md:order-1 p-5 md:p-6 flex flex-col justify-center">
                <div className="mb-2">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
                    Featured Project
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-secondary font-display mb-3">
                  {featuredProject.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {featuredProject.description}
                </p>

                {/* Technical Highlights for Portfolio Project */}
                {featuredProject.highlights && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-secondary mb-2 text-sm">
                      Key Technical Achievements:
                    </h4>
                    <ul className="text-gray-600 text-sm space-y-1">
                      {featuredProject.highlights
                        .slice(0, 3)
                        .map((highlight, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-primary mr-2 mt-1">•</span>
                            <span>{highlight}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap mb-4">
                  {featuredProject.technologies.map((tech, idx) => (
                    <span key={idx} className="skill-tag mr-2 mb-2">
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="flex items-center space-x-4">
                  {featuredProject.github && (
                    <a
                      href={featuredProject.github}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-2 text-primary hover:text-accent transition-colors"
                    >
                      <FaGithub size={18} />
                      <span>Source Code</span>
                    </a>
                  )}
                  {/* Show published link for stories, hide demo for portfolio itself */}
                  {featuredProject.url && (
                    <a
                      href={featuredProject.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-2 text-primary hover:text-accent transition-colors"
                    >
                      <FaExternalLinkAlt size={16} />
                      <span>Read It</span>
                    </a>
                  )}
                  {featuredProject.status === "Coming Soon" && (
                    <span className="text-gray-500 text-sm italic">
                      Coming Soon
                    </span>
                  )}
                </div>
              </div>

              <div className="order-1 md:order-2 h-56 md:h-auto overflow-hidden relative">
                {featuredProject.video ? (
                  <>
                    <video
                      src={featuredProject.video}
                      alt={featuredProject.title}
                      className="w-full h-full object-cover object-center"
                      autoPlay
                      muted
                      loop
                      playsInline
                      controls
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/10 via-accent/10 to-primary/20 flex items-center justify-center">
                    <div className="text-center p-6">
                      <div className="text-4xl mb-4">
                        {featuredProject.status === "Coming Soon" ? "📖" : featuredProject.url ? "✍️" : "🚀"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Regular Projects Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {regularProjects.map((project, index) => (
          <div
            key={project.id}
            className={`card group hover:-translate-y-2 transition-all animate-fade-in`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <h3 className="text-lg md:text-xl font-bold text-secondary font-display mb-2">
              {project.title}
            </h3>
            <p className="text-gray-600 mb-4 flex-grow">
              {project.description}
            </p>

            <div className="flex flex-wrap mb-4">
              {project.technologies.map((tech, idx) => (
                <span key={idx} className="skill-tag mr-2 mb-2 text-xs">
                  {tech}
                </span>
              ))}
            </div>

            <div className="flex justify-end">
              {project.github && (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:text-accent transition-colors"
                  aria-label="GitHub Repository"
                >
                  <FaGithub size={20} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Projects;
