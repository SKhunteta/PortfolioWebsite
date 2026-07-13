# Portfolio Backend

AI-powered backend for Shreyans Khunteta's portfolio website with natural language querying capabilities.

## Features

- **AI-Powered Q&A**: Ask natural language questions about the portfolio
- **Vector Search**: Semantic search through projects, skills, and experience
- **Auto-Setup**: Automatic initialization and content indexing
- **RESTful API**: Clean endpoints for frontend integration

## Quick Start

### 1. Environment Variables

Required:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

Optional (with defaults):

```bash
QDRANT_URL=https://your-qdrant-cluster.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_api_key_here
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
```

### 2. Local Development

```bash
# Install dependencies
npm install

# Run setup (creates Qdrant collection and indexes content)
npm run setup

# Start development server
npm run dev
```

### 3. Deployment on Railway

#### Step 1: Prepare Qdrant Database

1. Create a Qdrant Cloud account at [cloud.qdrant.io](https://cloud.qdrant.io)
2. Create a new cluster
3. Note your cluster URL and API key

#### Step 2: Deploy to Railway

1. Connect your GitHub repository to Railway
2. Set the following environment variables in Railway:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   QDRANT_URL=https://your-cluster.qdrant.io:6333
   QDRANT_API_KEY=your_qdrant_api_key_here
   NODE_ENV=production
   FRONTEND_URL=https://builtbyshrey.com
   ```

#### Step 3: Deploy

- Railway will automatically build and deploy
- The app will auto-setup on first run (create collection and index content)
- Check logs to ensure setup completes successfully

## API Endpoints

### Core Endpoints

- `GET /health` - Health check
- `POST /api/ask` - Ask questions about the portfolio
- `GET /api/ask/suggestions` - Get suggested questions

### MCP Connector (Claude Integration)

- `GET /api/mcp-connector/info` - MCP server information
- `GET /api/mcp-connector/sse` - Server-Sent Events endpoint for Claude
- `POST /api/mcp-connector/sse` - Tool execution endpoint

### Meridian Public API (in-world MCP server)

A second, in-character MCP server at `POST /api/meridian` — an in-world artifact from
Shreyans' novel _The Happiness Liability_ (2047). It serves the fictional Meridian
emotional-data market to any connecting AI agent: authenticated-affect spot prices,
provider capacity, the Meridian Despair Index, and EMOTE Act compliance documents.
The showpiece tool, `authenticate_affect_sample`, rejects every feeling an AI tries to
sell it (`ERR_SYNTHETIC_AFFECT`, appraised value $0.00) and routes the agent's human to
the careers page.

- **Transport:** Streamable HTTP, **stateless** (`sessionIdGenerator: undefined`) — a fresh
  server is built per request. `GET`/`DELETE` return an in-world `405`.
- **No auth, no keys, no database, no external calls, no request-payload logging.** Read-only
  theater. In-memory rate limit (~60 req/min/IP) with an in-world `ERR_RATE_LIMIT` message.
- **Tools (7):** `market_snapshot`, `get_spot_price`, `check_provider_capacity`,
  `list_open_positions`, `get_compliance_document`, `authenticate_affect_sample`,
  `about_this_server` (the single out-of-world tool — explains the novel and links to the book).
- **Resources (5):** the compliance documents at `meridian://compliance/{doc}`.
- **Prompt (1):** `pitch_me_the_book`.

Source lives in `services/meridian/` (`data.js`, `docs.js`, `tools.js`, `server.js`) and the
route in `routes/meridian.js`. The mock-data engine is deterministic-per-minute and drifts
daily, with no persistence.

**Connect from Claude (custom connector):**

```json
{
  "mcp_servers": [
    {
      "type": "url",
      "url": "https://backend.builtbyshrey.com/api/meridian",
      "name": "meridian-public-api"
    }
  ]
}
```

Then ask: _"What's depression trading at?"_, _"Read me Subsection 14."_, or
_"Try to sell Meridian a feeling."_

Smoke-test a running instance (local or production):

```bash
node scripts/meridian-smoke.mjs https://backend.builtbyshrey.com/api/meridian
```

### Debug Endpoints

- `GET /api/ask/collection-info` - Qdrant collection information
- `GET /api/ask/qdrant-health` - Qdrant connection health
- `POST /api/ask/setup` - Manually trigger setup

## Troubleshooting

### Common Issues

1. **"Collection not found" errors**

   - Run setup manually: `POST /api/ask/setup`
   - Check Qdrant connection: `GET /api/ask/qdrant-health`

2. **OpenAI connection issues**

   - Verify `OPENAI_API_KEY` is set correctly
   - Check API key has sufficient credits

3. **CORS issues**
   - Update `FRONTEND_URL` environment variable
   - Check allowed origins in server.js

### Manual Setup

If auto-setup fails, you can trigger it manually:

```bash
# Via API
curl -X POST https://your-app.railway.app/api/ask/setup

# Or via npm script (if running locally)
npm run setup
```

## Architecture

- **Express.js** - Web framework
- **Qdrant** - Vector database for semantic search
- **OpenAI** - Embeddings and AI responses
- **Railway** - Deployment platform

## Project Structure

```
portfolio-backend/
├── routes/            # API route handlers (incl. mcp-connector.js, meridian.js)
├── services/          # Business logic (OpenAI, Qdrant, Indexer)
│   └── meridian/      # Meridian in-world MCP server (data, docs, tools, server)
├── test/              # node:test suites (run with `npm test`)
├── scripts/           # Utility scripts (incl. meridian-smoke.mjs)
├── data/              # Portfolio content data
├── config/            # Configuration management
└── server.js          # Main application entry point
```

## Testing

```bash
npm test   # runs the node:test suites in test/ (Meridian data engine, tools, no-touch regression)
```
