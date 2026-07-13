# 🤖 AI-Powered Portfolio Website

A modern, AI-enhanced portfolio website built with React and Express.js, featuring natural language interaction capabilities powered by OpenAI and vector search.

## Features

- **🎨 Modern Portfolio Interface**: Clean, responsive design built with React and Tailwind CSS
- **🤖 AI Chat Assistant**: Interactive chatbot that can answer questions about skills, projects, and experience
- **🔍 Vector Search**: Semantic search using Qdrant vector database for intelligent content retrieval
- **⚡ Real-time Responses**: Fast, context-aware AI responses powered by OpenAI GPT
- **📱 Responsive Design**: Mobile-first design with smooth animations and modern UX

## 🛠️ Tech Stack

### Frontend

- **React 19** with Vite for fast development
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Router** for navigation
- **React Icons** for iconography

### Backend

- **Express.js** with Node.js
- **OpenAI GPT** for AI responses
- **Qdrant** vector database for semantic search
- **CORS** and security middleware
- **Morgan** for logging

## 🔧 Setup Instructions

### Prerequisites

- Node.js 18+
- NPM or Yarn
- OpenAI API key
- Qdrant instance (local or cloud)

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd PortfolioWebsite

# Install root dependencies
npm install

# Install frontend dependencies
cd shreyans-portfolio
npm install

# Install backend dependencies
cd ../portfolio-backend
npm install
```

### 2. Environment Configuration

⚠️ **IMPORTANT**: Never commit API keys or sensitive data!

```bash
# In portfolio-backend directory
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Required: Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Qdrant configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key_if_needed

# Server configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 3. Start Qdrant Vector Database

**Option A: Docker (Recommended)**

```bash
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

**Option B: Local Installation**
Follow [Qdrant installation guide](https://qdrant.tech/documentation/guides/installation/)

### 4. Initialize the AI System

```bash
cd portfolio-backend
npm run setup
```

This will:

- Test API connections
- Create vector database collections
- Index portfolio content
- Prepare the AI system

### 5. Start Development Servers

**Terminal 1 - Backend:**

```bash
cd portfolio-backend
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd shreyans-portfolio
npm run dev
```

### 6. Access the Application

- **Portfolio Website**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 🎯 Usage

### AI Chat Features

- Navigate to the "AI Chat" section on the website
- Ask questions like:
  - "Tell me about your experience"
  - "What technologies do you work with?"
  - "Show me your AI projects"
  - "What's your background in cloud computing?"

### API Endpoints

- `GET /health` - Health check
- `POST /api/ask` - AI-powered Q&A
- `GET /api/ask/suggestions` - Question suggestions
- `GET /api/schema` - Portfolio schema data
- `GET /api/mcp-connector/info` - MCP connector server information
- `GET /api/mcp-connector/sse` - MCP connector SSE endpoint for Claude
- `GET /api/linkmap/vehicles` - Link light-rail train positions (live GTFS-RT
  via the OneBusAway key, deterministic simulation when keyless/offline)

### Link GTFS data (The Link, Alive)

The `/link-map/` sub-app and the `/api/linkmap` simulator run on data baked
from Sound Transit's GTFS feed:

- `link-map/src/data/network.json` — projected line geometry + stations
- `portfolio-backend/data/linkmap-schedule.json` — headways + run times

Re-generate both whenever the Link network changes (new stations or lines):

```bash
node scripts/build-link-network.mjs           # fetches the current feed
```

or dispatch the **Refresh Link GTFS data** workflow (Actions tab), which runs
the same script and commits the result. Tunnel/elevated shading is a manual
annotation in `scripts/data/link-grade-annotations.json` — extend it when new
segments open (unannotated segments fall back to at-grade and log a warning).

## 🔒 Security Considerations

- ✅ Environment variables are properly gitignored
- ✅ API keys are never committed to version control
- ✅ CORS is configured for specific origins
- ✅ Input validation on all API endpoints
- ✅ Security headers with Helmet.js

## 📝 Customization

### Portfolio Data

Edit `portfolio-backend/data/portfolio.json` to customize:

- Personal information
- Projects and skills
- Work experience
- Contact details

After editing, run `npm run setup` to reindex the content.

### Styling

- Modify Tailwind configuration in `tailwind.config.js`
- Update components in `shreyans-portfolio/src/components/`
- Customize colors and themes in the CSS files

## Deployment

### Frontend (Netlify/Vercel)

```bash
cd shreyans-portfolio
npm run build
# Deploy dist/ folder
```

### Backend (Railway/Render/Heroku)

1. Set environment variables in your hosting platform
2. Deploy the `portfolio-backend` directory
3. Ensure Qdrant is accessible (use cloud instance for production)

## 📊 Project Structure

```
PortfolioWebsite/
├── shreyans-portfolio/          # React frontend
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── AIChat.jsx      # AI chat interface
│   │   │   ├── Hero.jsx        # Hero section
│   │   │   └── ...
│   │   └── App.jsx             # Main app component
│   └── public/                  # Static assets
├── portfolio-backend/           # Express.js backend
│   ├── routes/                  # API routes
│   ├── services/               # AI and database services
│   ├── data/                   # Portfolio data
│   └── server.js              # Main server file
└── README.md                   # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for GPT API
- Qdrant for vector search capabilities
- React and Vite communities
- Tailwind CSS for styling framework

---

**⚠️ Security Note**: This repository excludes sensitive files like `.env`. Make sure to never commit API keys or sensitive configuration data.
