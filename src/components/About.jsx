import React from "react";

const About = () => {
  return (
    <div id="about" className="section-container py-12 md:py-16 pt-14 md:pt-18">
      <div className="text-center mb-8">
        <h2 className="section-title mx-auto">About Me</h2>
        <p className="section-subtitle">
          Get to know more about my background and expertise
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div className="relative group animate-reveal-right">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
          <div className="relative">
            <div className="overflow-hidden rounded-lg shadow-custom-lg">
              <img
                src="/images/ShreyPic2.jpg"
                alt="Shreyans Khunteta"
                className="w-full h-full object-cover rounded-lg shadow-lg"
              />
            </div>
            <div className="absolute -bottom-3 -right-3 bg-white p-2 rounded-md shadow-custom-lg">
              <div className="bg-primary/10 text-primary px-4 py-1 rounded-md text-sm font-medium">
                "A handsome young man" - my grandmother
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 animate-fade-in">
          <h3 className="text-2xl font-bold text-secondary font-display">
            I'm passionate about building{" "}
            <span className="gradient-text">innovative solutions</span>
          </h3>

          <div className="space-y-3 text-secondary">
            <p>
              I am a Senior Software Engineer with a deep interest in AI,
              backend development, and data engineering.
            </p>
            <p>
              I thrive on solving complex problems, creating value, and driving
              impactful solutions. My professional journey has spanned diverse
              domains, including financial technology, healthcare, and nonprofit
              leadership, where I've consistently delivered innovative,
              reliable, and scalable systems.
            </p>
            <p>
              Currently, I work on the development of a Loan Origination System
              at Southeast Bank, building dynamic Blazor-based applications
              integrated with MS SQL Server. I've implemented custom encryption
              services to ensure data security and compliance while automating
              credit review workflows through API integrations.
            </p>
            <p>
              Beyond my technical expertise, I am passionate about using
              technology to drive societal impact. As the founder of the COVID
              Response Collective, I led a nonprofit mutual aid network that
              supported communities through innovative logistics and
              technology-driven collaboration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
