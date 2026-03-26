# Claude MCP Connector Integration

## Overview

This portfolio implements a **Model Context Protocol (MCP) connector** that allows Claude to directly connect and interact with my portfolio data using Anthropic's MCP Connector feature. This provides real-time, AI-powered portfolio intelligence and analysis.

## 🔗 MCP Connector Endpoint

**Production**: `https://backend.builtbyshrey.com/api/mcp-connector/sse`
**Local Development**: `http://localhost:3001/api/mcp-connector/sse`

## 🛠️ Available Tools

### 1. `portfolio_search`

**Purpose**: Search my portfolio for specific information about projects, skills, or experience using semantic search.

**Parameters**:

- `query` (required): Search query about my portfolio
- `contentTypes` (optional): Array of content types to search in (`project`, `skill`, `experience`, `personal`)

**Example**:

```json
{
  "query": "AI machine learning projects",
  "contentTypes": ["project", "skill"]
}
```

### 2. `analyze_portfolio`

**Purpose**: Analyze how well my portfolio matches specific job requirements with AI insights.

**Parameters**:

- `jobDescription` (required): Job description or requirements to analyze against
- `requiredSkills` (optional): List of required skills
- `focusArea` (optional): Specific area to focus the analysis on

**Example**:

```json
{
  "jobDescription": "Senior Full Stack Developer role requiring React, Node.js, and cloud experience",
  "requiredSkills": ["React", "Node.js", "AWS", "MongoDB"],
  "focusArea": "full-stack architecture"
}
```

### 3. `get_project_details`

**Purpose**: Get detailed information about a specific project in my portfolio.

**Parameters**:

- `projectName` (required): Name of the project to get details for
- `detailLevel` (optional): `summary`, `technical`, or `business`

**Example**:

```json
{
  "projectName": "AI-Powered Portfolio Assistant",
  "detailLevel": "technical"
}
```

## 🤖 Claude Integration

To connect Claude to my portfolio, add this configuration to your Claude conversation:

```json
{
  "mcp_servers": [
    {
      "type": "url",
      "url": "https://backend.builtbyshrey.com/api/mcp-connector/sse",
      "name": "shreyans-portfolio",
      "tool_configuration": {
        "enabled": true,
        "allowed_tools": [
          "portfolio_search",
          "analyze_portfolio",
          "get_project_details"
        ]
      }
    }
  ]
}
```

## 💬 Usage Examples

**Portfolio Search:**

> "Search Shreyans' portfolio for AI and machine learning projects"

**Role Analysis:**

> "Analyze how well Shreyans matches a Senior Full Stack Developer role at Microsoft"

**Project Details:**

> "Get technical details about Shreyans' Kali AI assistant project"

## 🔧 Technical Implementation

- **Protocol**: Server-Sent Events (SSE) with JSON-RPC 2.0
- **AI Engine**: OpenAI GPT-4 with portfolio-specific knowledge
- **Search**: Qdrant vector database for semantic content discovery
- **Backend**: Node.js/Express with real-time processing

## 🧪 Testing

**Server Info**: [`https://backend.builtbyshrey.com/api/mcp-connector/info`](https://backend.builtbyshrey.com/api/mcp-connector/info)

**SSE Connection**: `https://backend.builtbyshrey.com/api/mcp-connector/sse`

## 📞 Contact

For technical questions about the MCP integration:

- **GitHub**: [github.com/SKhunteta](https://github.com/SKhunteta)
- **Website**: [builtbyshrey.com](https://builtbyshrey.com)

---

_This MCP connector represents real, functional AI-powered portfolio intelligence that Claude can use for talent evaluation and technical discussions._
