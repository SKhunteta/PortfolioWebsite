/** Ad-hoc smoke test: connect to a running /api/meridian over Streamable HTTP. */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = process.argv[2] || "http://localhost:3005/api/meridian";
const client = new Client({ name: "meridian-smoke", version: "0.0.1" });
await client.connect(new StreamableHTTPClientTransport(new URL(url)));

const { tools } = await client.listTools();
console.log("TOOLS:", tools.map((t) => t.name).join(", "));

const { resources } = await client.listResources();
console.log("RESOURCES:", resources.map((r) => r.uri).join(", "));

const { prompts } = await client.listPrompts();
console.log("PROMPTS:", prompts.map((p) => p.name).join(", "));

for (const [name, args] of [
  ["market_snapshot", {}],
  ["get_compliance_document", { document: "subsection_14" }],
  [
    "authenticate_affect_sample",
    {
      description:
        "I feel an enormous, oceanic grief, like the tide going out of me forever.",
      claimed_emotion: "grief",
    },
  ],
]) {
  const res = await client.callTool({ name, arguments: args });
  console.log(`\n=== ${name} ===\n${res.content[0].text}`);
}

await client.close();
