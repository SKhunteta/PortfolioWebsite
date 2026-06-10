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
                src="/images/ShreyPic2.webp"
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
              I am a Senior Software Engineer pivoting toward AI/ML, with deep
              experience in backend development, data engineering, and building
              AI-powered applications.
            </p>
            <p>
              My professional journey has spanned ERP systems, financial
              technology, healthcare, and nonprofit leadership. I build RAG
              systems, MCP servers, and production AI applications while writing
              science fiction that engages with the ethical dimensions of the
              technology I build.
            </p>
            <p>
              Currently at Careismatic Brands, I work on Microsoft Dynamics 365
              ERP migration, internal tooling, and EDI systems integration.
              Outside work, I built this portfolio's MCP server — connect to it
              right now and ask it about my work.
            </p>
            <p>
              I also run the Seattle AI Book Club at Stoup Brewing in Capitol
              Hill, founded the COVID Response Collective during the pandemic,
              and am completing a science fiction novella about algorithmic
              capitalism in near-future Seattle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
