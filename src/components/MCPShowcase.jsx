import React from "react";
import { FaRobot, FaCode, FaFileAlt } from "react-icons/fa";

const MCPShowcase = () => {
  return (
    <div id="mcp" className="section-container py-12 md:py-16">
      <div className="text-center mb-12">
        <h2 className="section-title mx-auto">🚀 Claude MCP Connector Ready</h2>
        <p className="section-subtitle">
          Connect Claude directly to my portfolio using Anthropic's MCP
          Connector
        </p>
        <p className="text-gray-600 max-w-3xl mx-auto">
          This portfolio implements a proper MCP server that Claude can connect
          to using the
          <a
            href="https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-accent underline font-medium mx-1"
          >
            MCP Connector feature
          </a>
          for real-time portfolio intelligence and analysis.
        </p>
      </div>

      {/* Claude MCP Connection Guide */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="card">
          <h3 className="text-2xl font-bold mb-6 text-center">
            Connect Claude to My Portfolio
          </h3>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h4 className="font-semibold mb-3 text-gray-800">
              Add this exact configuration to your Claude conversation:
            </h4>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
              <div className="mb-2 text-gray-500 text-xs">
                // Copy and paste this entire block into Claude
              </div>
              <pre className="whitespace-pre-wrap">{`{
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
          "get_project_details"
        ]
      }
    }
  ]
}`}</pre>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              <strong>Primary endpoint:</strong>{" "}
              <code className="bg-gray-200 px-2 py-1 rounded">
                https://backend.builtbyshrey.com/api/mcp-connector
              </code>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <strong>Alternative SSE endpoint:</strong>{" "}
              <code className="bg-gray-200 px-2 py-1 rounded">
                https://backend.builtbyshrey.com/api/mcp-connector/sse
              </code>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-primary text-3xl mb-4">
                <FaRobot className="mx-auto" />
              </div>
              <h4 className="font-semibold mb-2">Portfolio Search</h4>
              <p className="text-gray-600 text-sm">
                Search my projects, skills, and experience with natural language
                queries
              </p>
            </div>

            <div className="text-center">
              <div className="text-primary text-3xl mb-4">
                <FaCode className="mx-auto" />
              </div>
              <h4 className="font-semibold mb-2">Role Analysis</h4>
              <p className="text-gray-600 text-sm">
                Analyze how my portfolio matches specific job requirements
              </p>
            </div>

            <div className="text-center">
              <div className="text-primary text-3xl mb-4">
                <FaFileAlt className="mx-auto" />
              </div>
              <h4 className="font-semibold mb-2">Project Details</h4>
              <p className="text-gray-600 text-sm">
                Get technical, business, or summary details about any project
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-yellow-800 mb-2 flex items-center">
                <span className="mr-2">⚠️</span>
                Troubleshooting Claude Desktop UI Connection
              </h4>
              <div className="text-yellow-700 text-sm space-y-2">
                <p><strong>If Claude's MCP connector shows "disabled" or can't connect:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Use HTTP endpoint:</strong> <code className="bg-yellow-100 px-1 rounded">https://backend.builtbyshrey.com/api/mcp-connector</code> (not /sse)</li>
                  <li><strong>Check server status:</strong> <a href="https://backend.builtbyshrey.com/api/mcp-connector/info" target="_blank" className="text-blue-600 underline">MCP server info</a></li>
                  <li><strong>Restart Claude Desktop</strong> after adding the connector</li>
                  <li><strong>Look for the hammer icon</strong> in the chat input to verify connection</li>
                  <li><strong>Check Claude's logs</strong> for error messages about the connection</li>
                  <li><strong>If tools show as disabled:</strong> The server is connecting but initialization failed</li>
                </ul>
                <p className="mt-3"><strong>Alternative connection methods:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Use <code className="bg-yellow-100 px-1 rounded">mcp-remote</code> package: <code className="bg-yellow-100 px-1 rounded">npx mcp-remote https://backend.builtbyshrey.com/api/mcp-connector</code></li>
                  <li>Contact me at <a href="mailto:contact@builtbyshrey.com" className="text-blue-600 underline">contact@builtbyshrey.com</a> for direct integration support</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Examples */}
      <div className="max-w-4xl mx-auto mb-12">
        <h3 className="text-2xl font-bold text-center mb-8">
          Claude Usage Examples
        </h3>

        <div className="space-y-6">
          <div className="card">
            <h4 className="font-semibold text-primary mb-3">
              🔍 Portfolio Search
            </h4>
            <p className="text-gray-700 mb-2">
              <strong>Ask Claude:</strong> "Search Shreyans' portfolio for AI
              and machine learning projects"
            </p>
            <p className="text-gray-600 text-sm">
              Claude will use the{" "}
              <code className="bg-gray-100 px-1 rounded">portfolio_search</code>{" "}
              tool to find relevant AI/ML projects, skills, and experience.
            </p>
          </div>

          <div className="card">
            <h4 className="font-semibold text-primary mb-3">
              📊 Role Analysis
            </h4>
            <p className="text-gray-700 mb-2">
              <strong>Ask Claude:</strong> "Analyze how well Shreyans matches a
              Senior Full Stack Developer role at Microsoft"
            </p>
            <p className="text-gray-600 text-sm">
              Claude will use{" "}
              <code className="bg-gray-100 px-1 rounded">
                analyze_portfolio
              </code>{" "}
              to provide a detailed match analysis with specific examples.
            </p>
          </div>

          <div className="card">
            <h4 className="font-semibold text-primary mb-3">
              🛠️ Project Deep Dive
            </h4>
            <p className="text-gray-700 mb-2">
              <strong>Ask Claude:</strong> "Get technical details about
              Shreyans' AI-Powered Portfolio project"
            </p>
            <p className="text-gray-600 text-sm">
              Claude will use{" "}
              <code className="bg-gray-100 px-1 rounded">
                get_project_details
              </code>{" "}
              to provide architecture, implementation details, and technical
              insights.
            </p>
          </div>
        </div>
      </div>

      {/* Technical Implementation */}
      <div className="max-w-4xl mx-auto">
        <div className="card">
          <h3 className="text-xl font-bold mb-6">
            MCP Connector Implementation
          </h3>

          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">
                  🔗 Endpoints
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">HTTP (Primary):</span>
                    <code className="block bg-gray-900 text-green-400 p-2 rounded text-xs mt-1">
                      https://backend.builtbyshrey.com/api/mcp-connector
                    </code>
                  </div>
                  <div>
                    <span className="font-medium">SSE (Fallback):</span>
                    <code className="block bg-gray-900 text-green-400 p-2 rounded text-xs mt-1">
                      https://backend.builtbyshrey.com/api/mcp-connector/sse
                    </code>
                  </div>
                  <div>
                    <span className="font-medium">Info:</span>
                    <code className="block bg-gray-900 text-green-400 p-2 rounded text-xs mt-1">
                      https://backend.builtbyshrey.com/api/mcp-connector/info
                    </code>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">
                  ⚡ Features
                </h4>
                <ul className="text-sm space-y-1">
                  <li>• Server-Sent Events (SSE) transport</li>
                  <li>• JSON-RPC 2.0 protocol</li>
                  <li>• Real-time portfolio search</li>
                  <li>• AI-powered analysis tools</li>
                  <li>• Claude MCP connector compatible</li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                <span className="mr-2">🛠️</span>
                Test the MCP Connector
              </h4>
              <p className="text-blue-700 text-sm mb-3">
                Get server information and test connectivity:
              </p>
              <a
                href="https://backend.builtbyshrey.com/api/mcp-connector/info"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                View MCP Server Info
                <span className="ml-2">→</span>
              </a>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">
                ✅ Ready for Claude Integration
              </h4>
              <p className="text-green-700 text-sm">
                This MCP server follows Anthropic's specification and is ready
                to connect with Claude's MCP connector feature. Just add the
                configuration above to your Claude conversation and start asking
                questions about my portfolio!
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-yellow-800 mb-2 flex items-center">
                <span className="mr-2">⚠️</span>
                Troubleshooting Claude Connection
              </h4>
              <div className="text-yellow-700 text-sm space-y-2">
                <p>
                  <strong>If Claude can't connect:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>
                    Verify the full URL:{" "}
                    <code className="bg-yellow-100 px-1 rounded">
                      https://backend.builtbyshrey.com/api/mcp-connector/sse
                    </code>
                  </li>
                  <li>
                    Try the alternative format:{" "}
                    <code className="bg-yellow-100 px-1 rounded">
                      https://backend.builtbyshrey.com/api/mcp-connector/info
                    </code>
                  </li>
                  <li>
                    Test server status:{" "}
                    <a
                      href="https://backend.builtbyshrey.com/health"
                      target="_blank"
                      className="text-blue-600 underline"
                    >
                      backend health check
                    </a>
                  </li>
                  <li>
                    Contact me at{" "}
                    <a
                      href="mailto:contact@builtbyshrey.com"
                      className="text-blue-600 underline"
                    >
                      contact@builtbyshrey.com
                    </a>{" "}
                    for direct integration
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center mt-12">
        <h3 className="text-xl font-bold mb-4">
          Ready to Experience AI-Powered Recruitment?
        </h3>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          This MCP integration represents the future of how AI systems will
          discover and evaluate talent. Experience firsthand how intelligent
          portfolio discovery works.
        </p>
        <div className="flex justify-center space-x-4">
          <a href="#chat" className="btn btn-primary">
            Chat with Kali AI
          </a>
          <a href="#contact" className="btn btn-secondary">
            Get In Touch
          </a>
        </div>
      </div>
    </div>
  );
};

export default MCPShowcase;
