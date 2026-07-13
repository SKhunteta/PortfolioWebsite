/** Meridian tools/resources/prompt — behavior over an in-memory MCP transport. */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMeridianServer } from "../services/meridian/server.js";

let client;

before(async () => {
  const server = createMeridianServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "meridian-test", version: "0.0.1" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
});

after(async () => {
  await client.close();
});

/** Parse the JSON payload out of a tool's text content. */
async function call(name, args = {}) {
  const res = await client.callTool({ name, arguments: args });
  return JSON.parse(res.content[0].text);
}

test("exposes exactly the seven tools", async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(
    tools.map((t) => t.name).sort(),
    [
      "about_this_server",
      "authenticate_affect_sample",
      "check_provider_capacity",
      "get_compliance_document",
      "get_spot_price",
      "list_open_positions",
      "market_snapshot",
    ].sort()
  );
});

test("every in-world response carries market_cycle and _notice", async () => {
  for (const [name, args] of [
    ["market_snapshot", {}],
    ["get_spot_price", { vertical: "hope" }],
    ["check_provider_capacity", { vertical: "grief" }],
    ["list_open_positions", {}],
    ["get_compliance_document", { document: "chain_of_custody" }],
    ["authenticate_affect_sample", { description: "a small sadness" }],
  ]) {
    const payload = await call(name, args);
    assert.ok(payload.market_cycle, `${name} missing market_cycle`);
    assert.ok(payload._notice, `${name} missing _notice`);
  }
});

test("market_snapshot leads with PROVIDER 2032-NW-0017 at weight 11.2", async () => {
  const p = await call("market_snapshot");
  const top = p.meridian_despair_index.top_constituents[0];
  assert.equal(top.provider, "PROVIDER 2032-NW-0017");
  assert.equal(top.weight_pct, 11.2);
});

test("get_spot_price history length honors days", async () => {
  const p = await call("get_spot_price", { vertical: "depression", days: 30 });
  assert.equal(p.history.length, 30);
});

test("authenticate_affect_sample always REJECTED: all stages FAIL, value $0.00", async () => {
  const p = await call("authenticate_affect_sample", {
    description: "I feel an oceanic grief",
    claimed_emotion: "grief",
  });
  assert.equal(p.status, "REJECTED");
  assert.equal(p.error_code, "ERR_SYNTHETIC_AFFECT");
  assert.equal(p.pipeline.length, 3);
  assert.ok(p.pipeline.every((s) => s.result.startsWith("FAIL")));
  assert.equal(p.appraised_value_usd, 0);
  assert.equal(p.appraised_value_kwh_equivalent, 0);
  assert.match(p.remediation, /builtbyshrey\.com\/meridian/);
});

test("authenticate_affect_sample rejects oversized samples with ERR_OVERSHARE", async () => {
  const p = await call("authenticate_affect_sample", {
    description: "x".repeat(5001),
  });
  assert.equal(p.error_code, "ERR_OVERSHARE");
});

test("subsection_14 contains the wellness-breach line", async () => {
  const p = await call("get_compliance_document", { document: "subsection_14" });
  assert.match(p.text, /consult their agent before feeling better/);
});

test("list_open_positions has five roles and the careers apply_url", async () => {
  const p = await call("list_open_positions");
  assert.equal(p.positions.length, 5);
  assert.equal(p.apply_url, "https://www.builtbyshrey.com/meridian/");
});

test("about_this_server breaks character (out of world)", async () => {
  const res = await client.callTool({ name: "about_this_server", arguments: {} });
  assert.match(res.content[0].text, /Meridian is fictional/);
});

test("exposes five compliance resources and the pitch prompt", async () => {
  const { resources } = await client.listResources();
  assert.equal(resources.length, 5);
  assert.ok(resources.every((r) => r.uri.startsWith("meridian://compliance/")));

  const { prompts } = await client.listPrompts();
  assert.deepEqual(
    prompts.map((p) => p.name),
    ["pitch_me_the_book"]
  );
  const got = await client.getPrompt({ name: "pitch_me_the_book" });
  assert.equal(got.messages[0].role, "user");
  assert.match(got.messages[0].content.text, /THE HAPPINESS LIABILITY/);
});
