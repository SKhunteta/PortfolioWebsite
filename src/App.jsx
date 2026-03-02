import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Experience from "./components/Experience";
import Skills from "./components/Skills";
import Projects from "./components/Projects";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import ChatSection from "./components/ChatSection";
import EmotionalLaborExchange from "./components/EmotionalLaborExchange";
import ELETeaser from "./components/ELETeaser";
import AaronWestAtlasTeaser from "./components/AaronWestAtlasTeaser";

const AaronWestAtlas = lazy(() => import("./components/AaronWestAtlas"));

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/ele" element={<EmotionalLaborExchange />} />
        <Route
          path="/aaron-west-atlas"
          element={
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0]">
                  <p className="text-[#9A9189] italic" style={{ fontFamily: '"Libre Baskerville", Georgia, serif' }}>
                    Loading the atlas...
                  </p>
                </div>
              }
            >
              <AaronWestAtlas />
            </Suspense>
          }
        />
        <Route
          path="/"
          element={
            <div className="bg-light text-secondary relative overflow-hidden">
              <div className="absolute inset-0 bg-hero-pattern opacity-5 z-0"></div>
              <Navbar />
              <main className="relative z-10">
                <Hero />
                <div className="bg-white py-8">
                  <About />
                </div>
                <div className="bg-gray-light py-8">
                  <ChatSection />
                </div>
                <div className="bg-gray-light py-8">
                  <Experience />
                </div>
                <div className="bg-gray-light py-8">
                  <Skills />
                </div>
                <div className="bg-white py-8">
                  <Projects />
                </div>
                <div className="bg-gray-light py-8">
                  <ELETeaser />
                </div>
                <div className="bg-white py-8">
                  <AaronWestAtlasTeaser />
                </div>
                <div className="bg-gray-light py-8">
                  <Contact />
                </div>
              </main>
              <Footer />
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
