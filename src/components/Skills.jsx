import React from "react";

const Skills = () => {
  const skillCategories = [
    {
      category: "Languages & Frameworks",
      skills: ["C#", ".NET Core", "Python", "JavaScript", "HTML/CSS", "Blazor"],
    },
    {
      category: "Cloud & DevOps",
      skills: ["AWS", "Google Cloud", "Docker", "Microservices", "Terraform"],
    },
    {
      category: "Databases & Data",
      skills: [
        "MS SQL Server",
        "Data Engineering",
        "ETL",
        "Informatica PowerCenter",
        "MDM",
      ],
    },
    {
      category: "Tools & Methodologies",
      skills: [
        "Test-Driven Development",
        "Git",
        "CI/CD",
        "Agile",
        "SDLC",
        "API Development",
      ],
    },
    {
      category: "Artificial Intelligence",
      skills: ["Generative AI", "OpenAI GPT", "AI Chatbots", "ML Integration"],
    },
  ];

  return (
    <div id="skills" className="section-container py-12 md:py-16">
      <div className="text-center mb-8">
        <h2 className="section-title mx-auto">Skills & Expertise</h2>
        <p className="section-subtitle">
          My technical toolkit and professional competencies
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2">
          <div className="grid md:grid-cols-2 gap-6">
            {skillCategories.map((category, idx) => (
              <div
                key={idx}
                className="card group hover:-translate-y-1 transition-all animate-fade-in"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <h3 className="text-lg font-bold text-secondary mb-4 font-display">
                  {category.category}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {category.skills.map((skill, skillIdx) => (
                    <div key={skillIdx} className="flex items-center">
                      <div className="w-2 h-2 bg-accent rounded-full mr-2"></div>
                      <p className="text-gray-600">{skill}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="animate-reveal-right">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
            <div className="relative rounded-lg overflow-hidden shadow-custom-lg">
              <img
                src="/images/ShreyPic3.PNG"
                alt="Working with modern technologies"
                className="w-full h-full object-cover object-center rounded"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex flex-col justify-end p-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <h3 className="text-xl font-bold mb-2">Hands-on Experience</h3>
                <p>
                  Building innovative solutions with modern technologies to
                  solve real-world problems
                </p>
              </div>
            </div>
            <div className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-custom-lg z-10">
              <div className="bg-primary/10 text-primary rounded-full p-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Skills;
