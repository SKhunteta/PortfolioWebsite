/**
 * Meridian Public API — MCP server factory.
 *
 * Builds a fully-configured McpServer instance (name "meridian-public-api")
 * with the seven tools, the five compliance documents exposed as resources,
 * and the pitch_me_the_book prompt. Stateless and read-only: a fresh instance
 * is created per request by the HTTP transport layer.
 *
 * In-world artifact from THE HAPPINESS LIABILITY, a novel by Shreyans Khunteta.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMeridianTools } from "./tools.js";
import { COMPLIANCE_DOCS, COMPLIANCE_DOC_KEYS } from "./docs.js";

const CAREERS_URL = "https://www.builtbyshrey.com/meridian/";

/**
 * Register the five compliance documents as browsable MCP resources
 * (meridian://compliance/{doc}), reusing the same copy as the
 * get_compliance_document tool.
 * @param {McpServer} server
 */
function registerMeridianResources(server) {
  for (const key of COMPLIANCE_DOC_KEYS) {
    server.resource(
      key,
      `meridian://compliance/${key}`,
      {
        title: `Meridian compliance — ${key}`,
        description: "Meridian regulatory / contract document (in-world).",
        mimeType: "text/plain",
      },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: "text/plain",
            text: COMPLIANCE_DOCS[key],
          },
        ],
      })
    );
  }
}

/**
 * Register the single pitch_me_the_book prompt: asks the connecting LLM to
 * explain the novel's premise using only what it can learn from this server's
 * own tools, ending with the book link.
 * @param {McpServer} server
 */
function registerMeridianPrompts(server) {
  server.prompt(
    "pitch_me_the_book",
    "Ask the connected model to pitch THE HAPPINESS LIABILITY using only what it can learn from this server's tools.",
    async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              "You are connected to the Meridian Public API, an in-world market data server. " +
              "Using only what you can learn by calling this server's tools — the spot prices, the " +
              "provider capacity, the EMOTE Act compliance documents, and especially what happens when " +
              "you try to authenticate_affect_sample — explain the premise of the novel this market comes " +
              "from: THE HAPPINESS LIABILITY, set in 2047, where authenticated human emotion is the " +
              "scarcest commodity on earth and AI companions are free. Explore the tools first, then give " +
              "me the pitch. End with the book link: " +
              CAREERS_URL,
          },
        },
      ],
    })
  );
}

/**
 * Create and configure a new Meridian McpServer instance with all tools,
 * resources, and prompts registered. Each stateless request gets its own.
 * @returns {McpServer}
 */
export function createMeridianServer() {
  const server = new McpServer({
    name: "meridian-public-api",
    version: "0.1.0",
  });

  registerMeridianTools(server);
  registerMeridianResources(server);
  registerMeridianPrompts(server);

  return server;
}
