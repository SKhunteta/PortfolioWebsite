// Post-build prerender for SPA route share metadata.
//
// GitHub Pages serves the SPA through 404.html for client-side routes, which
// means link scrapers (iMessage, Slack, X, LinkedIn — none of which run JS)
// fetching a deep link like /unit-4b get a bare "Redirecting..." page with no
// Open Graph tags. This script runs after `vite build` and writes a real
// dist/<route>/index.html for each route below: the built SPA shell with the
// route's own title/description/OG/Twitter tags swapped in. Browsers get the
// app (Pages now serves the route with a 200, no redirect bounce); scrapers
// get an honest preview card.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://builtbyshrey.com";

export const ROUTES = [
  {
    path: "unit-4b",
    title: "Unit 4B — Apartment Survival Simulator",
    description:
      "Twelve months of luxury living. Allegedly. Survive elevator outages, AI leasing assistants, and Parcel Pending notifications — then negotiate your renewal against the Centralized Services desk. Your only weapon is documentation.",
    image: `${SITE}/images/unit-4b-og.png`,
    imageAlt:
      "Unit 4B resident portal: a laminated “W Elevaor Down” facility notice, sanity and evidence meters, and a Parcel Pending notification. live remarkably™",
  },
];

// Swap the content="" of every <meta> whose name= or property= equals `key`.
export function setMetaContent(html, key, value) {
  const pattern = new RegExp(
    `(<meta\\s+(?:property|name)="${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s+content=")[^"]*(")`,
    "g"
  );
  return html.replace(pattern, `$1${value}$2`);
}

// Produce the route's HTML from the built SPA shell.
export function renderRouteHtml(shellHtml, route) {
  const url = `${SITE}/${route.path}`;
  let html = shellHtml;

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`);
  html = html.replace(
    /(<link rel="canonical" href=")[^"]*(">)/,
    `$1${url}$2`
  );

  for (const [key, value] of [
    ["title", route.title],
    ["description", route.description],
    ["og:url", url],
    ["og:title", route.title],
    ["og:description", route.description],
    ["og:image", route.image],
    ["twitter:url", url],
    ["twitter:title", route.title],
    ["twitter:description", route.description],
    ["twitter:image", route.image],
  ]) {
    html = setMetaContent(html, key, value);
  }

  // The shell has no og:image:alt; give scrapers one for the route's image.
  if (route.imageAlt) {
    html = html.replace(
      /(<meta property="og:image" content="[^"]*" \/>)/,
      `$1\n    <meta property="og:image:alt" content="${route.imageAlt}" />`
    );
  }

  return html;
}

async function main() {
  const distDir = path.resolve(process.cwd(), "dist");
  const shellHtml = await fs.readFile(path.join(distDir, "index.html"), "utf8");

  for (const route of ROUTES) {
    const outDir = path.join(distDir, route.path);
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(path.join(outDir, "index.html"), renderRouteHtml(shellHtml, route));
    console.log(`prerendered /${route.path}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
