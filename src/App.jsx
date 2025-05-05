import React from "react";
import Navbar from "./components/navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Experience from "./components/Experience";
import Skills from "./components/Skills";
import Projects from "./components/Projects";
import Contact from "./components/Contact";
import Footer from "./components/Footer";

function App() {
  return (
    <div className="bg-light text-secondary relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-pattern opacity-5 z-0"></div>
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <div className="bg-white py-8">
          <About />
        </div>
        <div className="bg-gray-light py-8">
          <Experience />
        </div>
        <div className="bg-white py-8">
          <Skills />
        </div>
        <div className="bg-gray-light py-8">
          <Projects />
        </div>
        <div className="bg-white py-8">
          <Contact />
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;
