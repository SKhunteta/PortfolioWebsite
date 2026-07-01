import React from "react";
import { Link } from "react-router-dom";
import { FaGithub } from "react-icons/fa";
import Navbar from "../components/navbar";
import Footer from "../components/Footer";
import {
  DEMOS,
  HAPPINESS_LIABILITY_SERIES,
  sourceUrl,
} from "../data/demos";

const SANS = '"DM Sans", system-ui, sans-serif';
const MONO = '"JetBrains Mono", "IBM Plex Mono", monospace';

const DemoCard = ({ demo }) => {
  const { theme } = demo;
  return (
    <div
      className="rounded-xl overflow-hidden shadow-custom-lg flex flex-col h-full"
      style={{ backgroundColor: theme.bg }}
    >
      <div className="p-6 sm:p-7 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3
            className="text-xl sm:text-2xl font-bold tracking-tight"
            style={{ fontFamily: theme.titleFont, color: theme.text }}
          >
            {demo.title}
          </h3>
          <span
            className="text-[10px] px-2 py-1 rounded border uppercase tracking-widest shrink-0"
            style={{
              fontFamily: MONO,
              borderColor: `${theme.muted}55`,
              color: theme.muted,
            }}
          >
            {demo.kindLabel}
          </span>
        </div>
        <p
          className="text-xs italic mb-3"
          style={{ fontFamily: SANS, color: theme.muted }}
        >
          {demo.tagline}
        </p>
        <p
          className="text-sm leading-relaxed mb-4 flex-1"
          style={{ fontFamily: SANS, color: theme.muted }}
        >
          {demo.description}
        </p>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {demo.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                fontFamily: MONO,
                color: theme.muted,
                backgroundColor: `${theme.muted}1A`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <Link
            to={demo.route}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-85"
            style={{
              fontFamily: SANS,
              backgroundColor: theme.accent,
              color: theme.ctaText,
            }}
          >
            {demo.cta}
            <span aria-hidden="true">&rarr;</span>
          </Link>
          <a
            href={sourceUrl(demo)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
            style={{ fontFamily: MONO, color: theme.muted }}
            aria-label={`View source for ${demo.title} on GitHub`}
          >
            <FaGithub size={14} />
            source
          </a>
        </div>
      </div>
    </div>
  );
};

// The Meridian careers site is a static in-world artifact at public/meridian/
// (not a React route), so it gets its own card outside the DEMOS array. Theme
// mirrors the artifact's own palette: paper, ink, teal.
const MERIDIAN_THEME = {
  bg: "#faf9f6",
  text: "#28312f",
  muted: "#5a6663",
  accent: "#1f7a72",
  ctaText: "#ffffff",
};

const MeridianCard = () => {
  const theme = MERIDIAN_THEME;
  return (
    <div
      className="rounded-xl overflow-hidden shadow-custom-lg flex flex-col h-full"
      style={{ backgroundColor: theme.bg }}
    >
      <div className="p-6 sm:p-7 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3
            className="text-xl sm:text-2xl font-bold tracking-tight"
            style={{ fontFamily: SANS, color: theme.text }}
          >
            Meridian — Careers
          </h3>
          <span
            className="text-[10px] px-2 py-1 rounded border uppercase tracking-widest shrink-0"
            style={{
              fontFamily: MONO,
              borderColor: `${theme.muted}55`,
              color: theme.muted,
            }}
          >
            In-world artifact
          </span>
        </div>
        <p
          className="text-xs italic mb-3"
          style={{ fontFamily: SANS, color: theme.muted }}
        >
          What you feel matters. Literally.
        </p>
        <p
          className="text-sm leading-relaxed mb-4 flex-1"
          style={{ fontFamily: SANS, color: theme.muted }}
        >
          The straight-faced recruiting site for the emotional-labor company at
          the center of the novel — nine open roles, an eligibility appraisal,
          and a Subsection 14 you should really read before signing.
        </p>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {["satire", "worldbuilding", "static page"].map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                fontFamily: MONO,
                color: theme.muted,
                backgroundColor: `${theme.muted}1A`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          {/* Static in-world artifact (not a React route) — full page load. */}
          <a
            href="/meridian/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-85"
            style={{
              fontFamily: SANS,
              backgroundColor: theme.accent,
              color: theme.ctaText,
            }}
          >
            Check your eligibility
            <span aria-hidden="true">&rarr;</span>
          </a>
          <span
            className="text-xs"
            style={{ fontFamily: MONO, color: theme.muted }}
          >
            builtbyshrey.com/meridian
          </span>
        </div>
      </div>
    </div>
  );
};

const PlaygroundPage = () => {
  const standalone = DEMOS.filter((demo) => !demo.series);
  const series = DEMOS.filter(
    (demo) => demo.series === HAPPINESS_LIABILITY_SERIES.id
  );

  return (
    <div className="bg-light text-secondary relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-pattern opacity-5 z-0"></div>
      <Navbar />
      <main className="relative z-10 pt-20">
        {/* Header */}
        <div className="bg-gradient-to-br from-bg-gradient-start to-bg-gradient-end py-16">
          <div className="container-wide text-center">
            <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
              Playground
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold font-display mb-4">
              <span className="gradient-text">Interactive Experiments</span>
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Games, maps, and small fictions — {DEMOS.length} interactive
              experiments built with React, Leaflet, and Claude. Each one is a
              real, finished thing: click in and play.
            </p>
          </div>
        </div>

        {/* Standalone demos */}
        <div className="bg-white py-12">
          <div className="container-wide">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {standalone.map((demo) => (
                <DemoCard key={demo.id} demo={demo} />
              ))}
            </div>
          </div>
        </div>

        {/* The Happiness Liability series */}
        <div id="happiness-liability" className="bg-gray-light py-12">
          <div className="container-wide">
            <div className="max-w-2xl mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold font-display mb-3">
                <span className="gradient-text">
                  {HAPPINESS_LIABILITY_SERIES.title}
                </span>
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">
                {HAPPINESS_LIABILITY_SERIES.description}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {series.map((demo) => (
                <DemoCard key={demo.id} demo={demo} />
              ))}
              <MeridianCard />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-white py-12">
          <div className="container-wide text-center">
            <div className="flex flex-wrap gap-4 justify-center">
              <a href="/#contact" className="btn btn-primary text-sm md:text-base">
                Get In Touch
              </a>
              <Link to="/" className="btn btn-secondary text-sm md:text-base">
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

export default PlaygroundPage;
