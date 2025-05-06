import React from "react";
import { FaGithub, FaExternalLinkAlt } from "react-icons/fa";

const Projects = () => {
  const projects = [
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

  // Separate featured project
  const featuredProject = projects.find((project) => project.featured);
  const regularProjects = projects.filter((project) => !project.featured);

  return (
    <div id="projects" className="section-container py-12 md:py-16">
      <div className="text-center mb-8">
        <h2 className="section-title mx-auto">My Projects</h2>
        <p className="section-subtitle">
          Showcasing some of my recent work and contributions
        </p>
      </div>

      {/* Featured Project */}
      {featuredProject && (
        <div className="mb-10 animate-fade-in">
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
                  <a
                    href="#"
                    className="flex items-center space-x-2 text-primary hover:text-accent transition-colors"
                  >
                    <FaExternalLinkAlt size={16} />
                    <span>Live Demo</span>
                  </a>
                </div>
              </div>

              <div className="order-1 md:order-2 h-56 md:h-auto overflow-hidden relative">
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
              </div>
            </div>
          </div>
        </div>
      )}

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
