import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Experience from "./components/Experience";
import Skills from "./components/Skills";
import Projects from "./components/Projects";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import Blog from "./pages/Blog";
import Stories from "./pages/Stories";

function App() {
  return (
    <Router>
      <div className="bg-light text-secondary relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern opacity-5 z-0"></div>
        <Navbar />
        <main className="relative z-10">
          <Routes>
            <Route
              path="/"
              element={
                <>
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
                </>
              }
            />
            <Route path="/blog" element={<Blog />} />
            <Route path="/stories" element={<Stories />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
