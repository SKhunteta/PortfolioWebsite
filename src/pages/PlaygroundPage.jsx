import React, { useEffect } from "react";
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

// Statically-hosted experiments live outside the SPA (own full-page builds
// served from subpaths), so they get their own cards outside the DEMOS array.
// Ketu-9 is built from /ketu-9 in this repo and deployed to /ketu-9/ by the
// Pages workflow. Its theme mirrors the game's Dark palette.
const STATIC_STANDALONE = [
  {
    id: "ketu-9",
    title: "Ketu-9 — The Long Cold",
    kindLabel: "WebGL world",
    tagline: "A procedural planet with a year-long day.",
    description:
      "A living slice of an alien planet: a physically-modeled scattering sky, fjord archipelagos generated from seeded noise, and one world clock that spirals the sun from the months-long Bright down into the aurora-dark winter. Scrub the year and watch the same coast become two different worlds.",
    tags: ["three.js", "procedural", "shaders"],
    cta: "Land on Ketu-9",
    href: "/ketu-9/",
    urlLabel: "builtbyshrey.com/ketu-9",
    theme: {
      bg: "#0b1326",
      text: "#e8eef6",
      muted: "#8fa3c4",
      accent: "#3affb0",
      ctaText: "#05070f",
    },
  },
  {
    id: "meow-9",
    title: "Meow-9 — The Drift",
    kindLabel: "WebGL toy",
    tagline: "An orbital cat sanctuary with one gravity dial.",
    description:
      "Sixteen adorable black cats aboard a neon-lit station module, and one dial that runs the place: scrub gravity from full spin down to zero and watch loafs become slow-tumbling drifters past the nebula in the porthole. Arm the laser pointer if you want a riot; press Observe to sit back and let the tour run.",
    tags: ["three.js", "r3f", "simulation"],
    cta: "Board the sanctuary",
    href: "/meow-9/",
    urlLabel: "builtbyshrey.com/meow-9",
    theme: {
      bg: "#0d0a1a",
      text: "#f2ecfa",
      muted: "#9a8fc4",
      accent: "#ff5ecf",
      ctaText: "#0d0a1a",
    },
  },
  {
    id: "link-map",
    title: "The Living Link",
    kindLabel: "WebGL visualization",
    tagline: "Seattle's light rail as a living circuit.",
    description:
      "Real Link trains as glowing particles on the actual line geometry: live positions when the feed breathes, honest simulation from the timetable when it sleeps. Tunnels dim beneath the ground plane, stations pulse as trains dwell, and the light follows the real sun over Seattle. Leave it open like an aquarium; double-tap a train to ride along.",
    tags: ["three.js", "realtime", "generative"],
    cta: "Watch the city move",
    href: "/link-map/",
    urlLabel: "builtbyshrey.com/link-map",
    theme: {
      bg: "#05070d",
      text: "#e6ecf7",
      muted: "#7f8db0",
      accent: "#57d7ff",
      ctaText: "#05070d",
    },
  },
];

// Static in-world artifacts live under public/ (not React routes), so they
// get their own cards outside the DEMOS array. Each theme mirrors the
// artifact's own palette.
const STATIC_ARTIFACTS = [
  {
    id: "meridian",
    title: "Meridian — Careers",
    tagline: "What you feel matters. Literally.",
    description:
      "The straight-faced recruiting site for the emotional-labor company at the center of the novel — nine open roles, an eligibility appraisal, and a Subsection 14 you should really read before signing.",
    tags: ["satire", "worldbuilding", "static page"],
    cta: "Check your eligibility",
    href: "/meridian/",
    urlLabel: "builtbyshrey.com/meridian",
    theme: {
      bg: "#faf9f6",
      text: "#28312f",
      muted: "#5a6663",
      accent: "#1f7a72",
      ctaText: "#ffffff",
    },
  },
  {
    id: "you-are-here",
    title: "You Are Here",
    tagline: "A history of the next twenty-one years.",
    description:
      "The swipe-through timeline of the novel — from 2026, the last year anyone trusted a video, to the threshold where Chapter 1 begins in 2047. Built to run on an iPad in a dark room at the book's Tezcon debut.",
    tags: ["timeline", "worldbuilding", "static page"],
    cta: "Start in 2026",
    href: "/you-are-here/",
    urlLabel: "builtbyshrey.com/you-are-here",
    theme: {
      bg: "#101312",
      text: "#e8e6e0",
      muted: "#9a978f",
      accent: "#5fa39a",
      ctaText: "#101312",
    },
  },
];

const StaticArtifactCard = ({ artifact }) => {
  const { theme } = artifact;
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
            {artifact.title}
          </h3>
          <span
            className="text-[10px] px-2 py-1 rounded border uppercase tracking-widest shrink-0"
            style={{
              fontFamily: MONO,
              borderColor: `${theme.muted}55`,
              color: theme.muted,
            }}
          >
            {artifact.kindLabel || "In-world artifact"}
          </span>
        </div>
        <p
          className="text-xs italic mb-3"
          style={{ fontFamily: SANS, color: theme.muted }}
        >
          {artifact.tagline}
        </p>
        <p
          className="text-sm leading-relaxed mb-4 flex-1"
          style={{ fontFamily: SANS, color: theme.muted }}
        >
          {artifact.description}
        </p>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {artifact.tags.map((tag) => (
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
            href={artifact.href}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-85"
            style={{
              fontFamily: SANS,
              backgroundColor: theme.accent,
              color: theme.ctaText,
            }}
          >
            {artifact.cta}
            <span aria-hidden="true">&rarr;</span>
          </a>
          <span
            className="text-xs"
            style={{ fontFamily: MONO, color: theme.muted }}
          >
            {artifact.urlLabel}
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

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Playground — Interactive Demos";
    return () => {
      document.title = previousTitle;
    };
  }, []);

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
              {STATIC_STANDALONE.map((artifact) => (
                <StaticArtifactCard key={artifact.id} artifact={artifact} />
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
              {STATIC_ARTIFACTS.map((artifact) => (
                <StaticArtifactCard key={artifact.id} artifact={artifact} />
              ))}
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
