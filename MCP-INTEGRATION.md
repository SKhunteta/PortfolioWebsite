# MCP Connector Integration

## Overview

This portfolio implements a **Model Context Protocol (MCP) server** that lets AI assistants (Claude, ChatGPT, or any MCP client) connect directly to my portfolio data — and to the spoiler-safe world bible for my science fiction novel, *The Happiness Liability*.

## 🔗 Endpoint

**Production**: `https://backend.builtbyshrey.com/api/mcp-connector`
**Local Development**: `http://localhost:3001/api/mcp-connector`
**Discovery**: `https://backend.builtbyshrey.com/.well-known/mcp.json`

- **Transport**: Streamable HTTP (protocol version `2025-03-26`), JSON-RPC 2.0
- `POST /` — JSON-RPC requests (send `initialize` with no `Mcp-Session-Id` header to open a session; the session id comes back in the response headers)
- `GET /` — SSE stream for an existing session, or discovery JSON without one
- `DELETE /` — session teardown
- `GET /info` — human-readable server info

## 🛠️ Available Tools

### 1. `portfolio_search`

Semantic search across the portfolio.

- `query` (required): search query
- `contentTypes` (optional): array of `project`, `skill`, `experience`, `personal`, `creative_work`, `happiness_liability`

```json
{ "query": "AI machine learning projects", "contentTypes": ["project", "skill"] }
```

### 2. `analyze_portfolio`

Analyze how the portfolio matches specific job requirements.

- `jobDescription` (required)
- `requiredSkills` (optional): array of strings
- `focusArea` (optional)

### 3. `get_project_details`

Deep-dive on one project.

- `projectName` (required)
- `detailLevel` (optional): `summary`, `technical`, or `business`

### 4. `assess_fit`

Structured candidate assessment for recruiters: overall fit, matching experience, relevant projects, skill alignment, gaps, and interview talking points.

- `jobDescription` (required)
- `requiredSkills` (optional): array of strings

### 5. `ask_shrey`

Ask a question and get an answer in Shrey's voice, grounded in his actual portfolio, writing, and documented perspectives.

- `question` (required)

### 6. `explore_happiness_liability`

Explore the world of *The Happiness Liability* — the 2026→2047 alternate-history timeline, the Great Copyright Purge, the EMOTE Act, Meridian Emotional Partners, the Emotional Labor Exchange futures market, neural interfaces and the empathy grid, the main characters, and the interactive experiments on builtbyshrey.com built from the world. **Spoiler-safe**: covers worldbuilding and the novel's opening setup only.

- `query` (required): question about the world, its history, or its logic
- `aspect` (optional): `overview`, `timeline`, `institutions`, `market`, `technology`, `characters`, `experiments`

```json
{ "query": "What is the EMOTE Act?", "aspect": "institutions" }
```

## 🤖 Claude Integration

```json
{
  "mcp_servers": [
    {
      "type": "url",
      "url": "https://backend.builtbyshrey.com/api/mcp-connector",
      "name": "shreyans-portfolio",
      "tool_configuration": {
        "enabled": true,
        "allowed_tools": [
          "portfolio_search",
          "analyze_portfolio",
          "get_project_details",
          "assess_fit",
          "ask_shrey",
          "explore_happiness_liability"
        ]
      }
    }
  ]
}
```

## 💬 Usage Examples

> "Search Shreyans' portfolio for AI and machine learning projects"

> "Analyze how well Shreyans matches a Senior ML Engineer role"

> "What law legalized emotional labor in The Happiness Liability?"

> "What experiments from the novel's world can I try on the site?"

## 🌍 The Happiness Liability world bible

The world knowledge behind `explore_happiness_liability` (and the experiments) is a single canonical source:

- `portfolio-backend/data/happiness-liability-canon.json` — distilled worldbuilding facts (no manuscript prose, no plot beyond the opening chapter)
- `portfolio-backend/services/canon.js` — loads the canon, builds prompt context blocks, and shapes ~20 documents for the vector index (`content_type: "happiness_liability"`, sub-filterable by `aspect`)
- The experiment routes (`/api/janet`, `/api/ele`, `/api/invoice`) inject the same canon into their system prompts, so JANET, the Exchange, and the Invoice desk all agree on the world's history
- `portfolio-backend/data/HAPPINESS-LIABILITY-SPOILER-POLICY.md` documents the spoiler boundary; `portfolio-backend/scripts/check-canon-spoilers.js` enforces it

### Reindexing

The production server clears and rebuilds the vector index on every boot, so a deploy reindexes everything. For a targeted refresh without a restart:

```
POST /api/ask/reindex
X-Admin-Key: <admin key>
{ "contentType": "happiness_liability" }
```

## 🔧 Technical Implementation

- **Protocol**: MCP over Streamable HTTP (JSON-RPC 2.0), per-session server instances
- **Retrieval**: OpenAI embeddings + Qdrant vector database
- **Generation**: Anthropic Claude models
- **Backend**: Node.js/Express

## 🧪 Testing

**Server Info**: [`https://backend.builtbyshrey.com/api/mcp-connector/info`](https://backend.builtbyshrey.com/api/mcp-connector/info)

**Discovery**: [`https://backend.builtbyshrey.com/.well-known/mcp.json`](https://backend.builtbyshrey.com/.well-known/mcp.json)

## 📞 Contact

- **GitHub**: [github.com/skhunteta](https://github.com/skhunteta)
- **Website**: [builtbyshrey.com](https://builtbyshrey.com)

---

_This MCP connector is real, functional portfolio intelligence — and a queryable world bible for the novel — that any MCP client can use._
