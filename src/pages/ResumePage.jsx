import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/navbar";
import Experience from "../components/Experience";
import Skills from "../components/Skills";
import Footer from "../components/Footer";

const ResumePage = () => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Resume | Shreyans Khunteta";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="bg-light text-secondary relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-pattern opacity-5 z-0"></div>
      <Navbar />
      <main className="relative z-10 pt-20">
        {/* Resume Header */}
        <div className="bg-gradient-to-br from-bg-gradient-start to-bg-gradient-end py-16">
          <div className="container-wide text-center">
            <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
              Resume
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold font-display mb-4">
              <span className="gradient-text">Professional Experience</span>
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Senior Software Engineer with 5+ years building backend systems,
              cloud infrastructure, and AI-powered applications.
            </p>
          </div>
        </div>

        <div className="bg-gray-light py-8">
          <Experience />
        </div>
        <div className="bg-gray-light py-8">
          <Skills />
        </div>

        {/* CTA */}
        <div className="bg-white py-12">
          <div className="container-wide text-center">
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/#contact"
                className="btn btn-primary text-sm md:text-base"
              >
                Get In Touch
              </a>
              <Link
                to="/"
                className="btn btn-secondary text-sm md:text-base"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ResumePage;
