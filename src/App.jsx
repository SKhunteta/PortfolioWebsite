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
import PlotTwistTeaser from "./components/PlotTwistTeaser";

const AaronWestAtlas = lazy(() => import("./components/AaronWestAtlas"));
const PlotTwist = lazy(() => import("./components/PlotTwist"));
const EmotionalLaborInvoice = lazy(() => import("./components/EmotionalLaborInvoice"));

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/ele" element={<EmotionalLaborExchange />} />
        <Route
          path="/invoice"
          element={
            <Suspense
              fallback={
                <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAF7]">
                  <p
                    className="text-[#9A9A9A] text-sm"
                    style={{ fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace' }}
                  >
                    Preparing your invoice...
                  </p>
                </div>
              }
            >
              <EmotionalLaborInvoice />
            </Suspense>
          }
        />
        <Route
          path="/plot-twist"
          element={
            <Suspense
              fallback={
                <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F0F1A] relative overflow-hidden">
                  {/* Floating ambient orbs */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute w-64 h-64 rounded-full bg-[#8B5CF6]/[0.06] blur-3xl top-1/4 -left-20 animate-pulse" style={{ animationDuration: '4s' }} />
                    <div className="absolute w-48 h-48 rounded-full bg-[#06B6D4]/[0.05] blur-3xl bottom-1/3 right-0 animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
                    <div className="absolute w-56 h-56 rounded-full bg-[#EF4444]/[0.04] blur-3xl top-1/2 left-1/3 animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
                  </div>
                  {/* Content */}
                  <h1
                    className="text-4xl font-bold text-[#F0F0F0]/90 mb-2 animate-[fadeIn_0.6s_ease-out]"
                    style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
                  >
                    Plot Twist
                  </h1>
                  <p className="text-[#6B6B80] text-sm mb-6 animate-[fadeIn_0.8s_ease-out]" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                    Preparing your stories...
                  </p>
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse"
                        style={{ animationDelay: `${i * 200}ms`, animationDuration: '1.2s' }}
                      />
                    ))}
                  </div>
                </div>
              }
            >
              <PlotTwist />
            </Suspense>
          }
        />
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
                  <PlotTwistTeaser />
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
