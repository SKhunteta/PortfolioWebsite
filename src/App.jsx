import React, { lazy, Suspense, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import Navbar from "./components/navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Projects from "./components/Projects";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import ChatSection from "./components/ChatSection";
import EmotionalLaborExchange from "./components/EmotionalLaborExchange";
import ELETeaser from "./components/ELETeaser";
import JanetTeaser from "./components/JanetTeaser";
import AaronWestAtlasTeaser from "./components/AaronWestAtlasTeaser";
import PlotTwistTeaser from "./components/PlotTwistTeaser";
import InvoiceTeaser from "./components/InvoiceTeaser";
import LinkTrackerTeaser from "./components/LinkTrackerTeaser";
import CityQuizTeaser from "./components/CityQuizTeaser";
import ResumePage from "./pages/ResumePage";

const AaronWestAtlas = lazy(() => import("./components/AaronWestAtlas"));
const PlotTwist = lazy(() => import("./components/PlotTwist"));
const EmotionalLaborInvoice = lazy(() => import("./components/EmotionalLaborInvoice"));
const Janet = lazy(() => import("./components/Janet"));
const LinkTracker = lazy(() => import("./components/LinkTracker"));
const CityQuiz = lazy(() => import("./components/CityQuiz"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
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
          path="/janet"
          element={
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#0d0f11]">
                  <p className="text-[#4b5563] font-mono text-sm">
                    Initializing JANET...
                  </p>
                </div>
              }
            >
              <Janet />
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
          path="/link-tracker"
          element={
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#F0F4F8]">
                  <p className="text-[#8899AA] text-sm font-sans">
                    Loading transit map...
                  </p>
                </div>
              }
            >
              <LinkTracker />
            </Suspense>
          }
        />
        <Route
          path="/city-quiz"
          element={
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7]">
                  <p
                    className="text-[#9A9A9A] text-sm"
                    style={{ fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace' }}
                  >
                    Loading the city quiz...
                  </p>
                </div>
              }
            >
              <CityQuiz />
            </Suspense>
          }
        />
        <Route path="/resume" element={<ResumePage />} />
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
                {/* Resume CTA */}
                <div className="section-container py-12 md:py-16">
                  <div className="max-w-4xl mx-auto">
                    <div className="rounded-xl overflow-hidden shadow-custom-lg bg-gradient-to-br from-bg-gradient-start to-bg-gradient-end">
                      <div className="p-6 sm:p-8 md:p-10">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold mb-2">
                              Professional Background
                            </span>
                            <h3 className="text-2xl sm:text-3xl font-bold font-display">
                              <span className="gradient-text">Resume</span>
                            </h3>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                          {["C# / .NET", "React / Node.js", "Azure / AWS", "AI / ML"].map((skill) => (
                            <div key={skill} className="bg-white/80 rounded-lg p-3 text-center">
                              <p className="text-sm font-medium text-gray-700">{skill}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <p className="text-sm text-gray-600 max-w-md">
                            5+ years building backend systems, cloud infrastructure, and
                            AI-powered applications. View my full experience and technical skills.
                          </p>
                          <Link
                            to="/resume"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all btn btn-primary shrink-0"
                          >
                            View Full Resume
                            <span aria-hidden="true">&rarr;</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white py-8">
                  <Projects />
                </div>
                <div className="bg-gray-light py-8">
                  <ELETeaser />
                </div>
                <div className="bg-white py-8">
                  <InvoiceTeaser />
                </div>
                <div className="bg-gray-light py-8">
                  <JanetTeaser />
                </div>
                <div className="bg-white py-8">
                  <AaronWestAtlasTeaser />
                </div>
                <div className="bg-gray-light py-8">
                  <PlotTwistTeaser />
                </div>
                <div className="bg-white py-8">
                  <LinkTrackerTeaser />
                </div>
                <div className="bg-gray-light py-8">
                  <CityQuizTeaser />
                </div>
                <div className="bg-white py-8">
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
