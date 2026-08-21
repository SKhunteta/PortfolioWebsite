// Prerender tests — a synthetic SPA shell, no build, no filesystem.
import { describe, it, expect } from "vitest";
import { ROUTES, renderRouteHtml, setMetaContent } from "../prerender-routes.mjs";

const SHELL = `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Shreyans Khunteta | Senior Software Engineer</title>
    <meta name="title" content="Shreyans Khunteta | Senior Software Engineer" />
    <meta name="description" content="Portfolio of Shreyans Khunteta." />
    <link rel="canonical" href="https://builtbyshrey.com/">
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://builtbyshrey.com/" />
    <meta property="og:title" content="Shreyans Khunteta | Senior Software Engineer" />
    <meta property="og:description" content="AI-accessible portfolio." />
    <meta property="og:image" content="https://builtbyshrey.com/images/Kaliavatar.png" />
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="https://builtbyshrey.com/" />
    <meta property="twitter:title" content="Shreyans Khunteta | Senior Software Engineer" />
    <meta property="twitter:description" content="AI-enhanced portfolio." />
    <meta property="twitter:image" content="https://builtbyshrey.com/images/Kaliavatar.png" />
  </head>
  <body><div id="root"></div></body>
</html>`;

describe("setMetaContent", () => {
  it("replaces content for property= metas", () => {
    const out = setMetaContent(SHELL, "og:title", "New Title");
    expect(out).toContain('<meta property="og:title" content="New Title" />');
    expect(out).not.toContain('<meta property="og:title" content="Shreyans');
  });

  it("replaces content for name= metas", () => {
    const out = setMetaContent(SHELL, "description", "New description.");
    expect(out).toContain('<meta name="description" content="New description." />');
  });

  it("leaves other metas untouched", () => {
    const out = setMetaContent(SHELL, "og:title", "New Title");
    expect(out).toContain('<meta property="twitter:title" content="Shreyans Khunteta');
    expect(out).toContain('<meta property="og:type" content="website" />');
  });
});

describe("renderRouteHtml for /unit-4b", () => {
  const route = ROUTES.find((r) => r.path === "unit-4b");
  const html = renderRouteHtml(SHELL, route);

  it("is registered", () => {
    expect(route).toBeTruthy();
  });

  it("sets the page title and canonical URL", () => {
    expect(html).toContain("<title>Unit 4B — Apartment Survival Simulator</title>");
    expect(html).toContain('<link rel="canonical" href="https://builtbyshrey.com/unit-4b">');
  });

  it("sets game-specific OG and Twitter cards", () => {
    for (const key of ["og:title", "twitter:title"]) {
      expect(html).toContain(`property="${key}" content="Unit 4B — Apartment Survival Simulator"`);
    }
    for (const key of ["og:image", "twitter:image"]) {
      expect(html).toContain(`property="${key}" content="https://builtbyshrey.com/images/unit-4b-og.png"`);
    }
    for (const key of ["og:url", "twitter:url"]) {
      expect(html).toContain(`property="${key}" content="https://builtbyshrey.com/unit-4b"`);
    }
    expect(html).toContain('property="og:description" content="Twelve months of luxury living. Allegedly.');
    expect(html).toContain('<meta property="og:image:alt"');
  });

  it("does not leave the homepage Kali avatar anywhere in the card", () => {
    expect(html).not.toContain("Kaliavatar.png");
  });
});
