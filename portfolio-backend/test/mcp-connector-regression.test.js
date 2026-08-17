/**
 * Regression lock for the existing portfolio MCP server.
 *
 * Asserts /api/mcp-connector still advertises exactly its six tools,
 * unchanged. Uses an in-memory transport so no Qdrant / OpenAI / Anthropic
 * services are touched (tools/list does not invoke them).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../routes/mcp-connector.js";

test("portfolio MCP server still exposes its six tools (no-touch)", async () => {
  const server = createMcpServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "regression", version: "0.0.1" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  const { tools } = await client.listTools();
  assert.deepEqual(
    tools.map((t) => t.name),
    ["portfolio_search", "analyze_portfolio", "get_project_details", "assess_fit", "ask_shrey", "explore_happiness_liability"]
  );

  await client.close();
});
