import React from "react";
import { FaGithub, FaExternalLinkAlt } from "react-icons/fa";

const Projects = () => {
  const projects = [
    {
      id: 0,
      title: "AI-Powered Portfolio with NLWeb Protocol",
      description:
        "An innovative portfolio website featuring conversational AI capabilities built with Microsoft's newly announced NLWeb protocol. Users can ask natural language questions like 'What AI projects has Shreyans built?' and receive intelligent, contextual responses powered by vector embeddings and semantic search. Built through intensive collaboration with AI-assisted development - you're looking at it! 🚀",
      technologies: [
        "React",
        "Express.js",
        "OpenAI GPT-4",
        "Qdrant Vector DB",
        "Tailwind CSS",
        "Railway",
        "GitHub Pages",
        "Node.js",
        "Vite",
        "Framer Motion",
        "GitHub Actions",
      ],
      github: "https://github.com/SKhunteta/PortfolioWebsite",
      featured: true,
      highlights: [
        "Semantic search using Qdrant vector database with OpenAI embeddings",
        "Dynamic CORS configuration supporting multiple development environments",
        "Auto-scrolling chat interface with intelligent user position detection",
        "Environment-aware API configuration for seamless dev/prod switching",
        "AI-assisted development methodologies and collaborative problem-solving",
      ],
    },
    {
      id: 1,
      title: "Lingua AI Chatbot",
      description:
        "A conversational language learning chatbot using Python and the OpenAI GPT-3 API. The application helps users practice language skills with intelligent feedback and correction.",
      technologies: ["Python", "OpenAI API", "Docker", "Discord Bot"],
      github: "https://github.com/SKhunteta/lingua-ai",
      featured: true,
      video: "/images/LinguaVideo.MOV",
    },
    {
      id: 2,
      title: "Loan Origination System",
      description:
        "Led the development of a comprehensive system for loan applications and processing using Blazor and MS SQL Server. Implemented secure data handling and credit score API integration.",
      technologies: ["Blazor", "C#", ".NET", "MS SQL Server", "Equifax API"],
      github: null,
    },
    {
      id: 3,
      title: "Healthcare Data Pipeline",
      description:
        "Multi-cloud data processing system for healthcare information, converting data between formats and creating standardized outputs for medical records.",
      technologies: ["AWS", "Google Cloud", "Docker", "FHIR API", "Camunda"],
      github: null,
    },
    {
      id: 4,
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
                  {/* Only show live demo for projects other than the portfolio itself */}
                  {featuredProject.id !== 0 && (
                    <a
                      href="#"
                      className="flex items-center space-x-2 text-primary hover:text-accent transition-colors"
                    >
                      <FaExternalLinkAlt size={16} />
                      <span>Live Demo</span>
                    </a>
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
                      <div className="text-4xl mb-4">🚀</div>
                      <h4 className="font-bold text-secondary mb-2">
                        You're Here!
                      </h4>
                      <p className="text-gray-600 text-sm">
                        This is the live demo
                      </p>
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
