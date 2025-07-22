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
├── routes/          # API route handlers
├── services/        # Business logic (OpenAI, Qdrant, Indexer)
├── data/           # Portfolio content data
├── config/         # Configuration management
└── server.js       # Main application entry point
```
