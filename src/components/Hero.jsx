import React from "react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { HiOutlineMail } from "react-icons/hi";

const Hero = () => {
  return (
    <div
      id="home"
      className="relative overflow-hidden bg-gradient-to-br from-bg-gradient-start to-bg-gradient-end"
    >
      {/* Decorative background elements */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-accent rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
      <div className="absolute top-40 left-10 w-72 h-72 bg-primary rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-10 right-1/3 w-80 h-80 bg-accent-light rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>

      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-5 bg-hero-pattern"></div>

      <div className="container-wide py-20 md:py-24">
        <div className="grid md:grid-cols-5 gap-8 items-center">
          <div className="md:col-span-3 space-y-4 text-center md:text-left animate-fade-in">
            <div>
              <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
                ✨ Senior Software Engineer
              </span>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-display">
                Hey, I'm{" "}
                <span className="gradient-text">Shreyans Khunteta</span>
              </h1>
              <h2 className="text-xl md:text-2xl text-gray-600 mt-3 md:mt-4 max-w-lg mx-auto md:mx-0">
                Building innovative solutions that drive business value through
                clean, scalable code
              </h2>
            </div>

            <div className="text-content md:text-left md:mx-0 pt-2">
              <p className="text-gray-600">
                Experienced full-stack developer specializing in .NET, cloud
                technologies, and data engineering.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 justify-center md:justify-start mt-6">
              <a
                href="#contact"
                className="btn btn-primary text-sm md:text-base"
              >
                Get In Touch
              </a>
              <a
                href="#projects"
                className="btn btn-secondary text-sm md:text-base"
              >
                View Projects
              </a>
            </div>

            <div className="flex items-center gap-5 pt-4 justify-center md:justify-start">
              <a
                href="https://www.linkedin.com/in/shreyans-khunteta-3167247a/"
                target="_blank"
                rel="noreferrer"
                className="bg-white rounded-full shadow-custom p-3 cursor-pointer hover:scale-110 ease-in duration-300 hover:shadow-custom-lg"
                aria-label="LinkedIn"
              >
                <FaLinkedin size={20} className="text-primary" />
              </a>
              <a
                href="https://github.com/SKhunteta"
                target="_blank"
                rel="noreferrer"
                className="bg-white rounded-full shadow-custom p-3 cursor-pointer hover:scale-110 ease-in duration-300 hover:shadow-custom-lg"
                aria-label="GitHub"
              >
                <FaGithub size={20} className="text-primary" />
              </a>
              <a
                href="mailto:shreyans.khunteta@gmail.com"
                className="bg-white rounded-full shadow-custom p-3 cursor-pointer hover:scale-110 ease-in duration-300 hover:shadow-custom-lg"
                aria-label="Email"
              >
                <HiOutlineMail size={20} className="text-primary" />
              </a>
            </div>
          </div>

          <div className="md:col-span-2 order-first md:order-last mb-4 md:mb-0 animate-reveal-left">
            <div className="relative mx-auto w-60 h-60 md:w-72 md:h-72 lg:w-80 lg:h-80">
              {/* Profile image wrapper with decorative elements */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-70"></div>
              <div className="relative rounded-full overflow-hidden border-4 border-white shadow-custom-2xl">
                {/* Profile image */}
                <img
                  src="/images/ShreyPic1.jpg"
                  alt="Shreyans Khunteta"
                  className="w-full h-full object-cover object-center"
                />
              </div>

              {/* Decorative badge */}
              <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-3 shadow-custom-lg">
                <div className="bg-accent/10 rounded-full p-2">
                  <svg
                    className="w-6 h-6 text-accent"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional content to fill whitespace */}
        <div className="flex justify-center mt-6 md:mt-12 pb-10">
          <div className="animate-bounce">
            <a
              href="#about"
              className="flex flex-col items-center text-gray-500 hover:text-primary transition-colors"
              onClick={(e) => {
                e.preventDefault();
                const aboutSection = document.getElementById("about");
                if (aboutSection) {
                  const yOffset = -80; // Adjust based on navbar height
                  const y =
                    aboutSection.getBoundingClientRect().top +
                    window.pageYOffset +
                    yOffset;
                  window.scrollTo({ top: y, behavior: "smooth" });
                }
              }}
            >
              <span className="text-sm font-medium mb-1">Scroll Down</span>
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
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
