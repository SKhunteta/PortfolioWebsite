import React, { useState, useEffect } from "react";
import {
  FaRobot,
  FaCode,
  FaFileAlt,
  FaPlay,
  FaCheck,
  FaSpinner,
} from "react-icons/fa";
import { API_ENDPOINTS } from "../config/api.js";

const MCPShowcase = () => {
  const [mcpCapabilities, setMcpCapabilities] = useState(null);
  const [demoScenarios, setDemoScenarios] = useState([]);
  const [activeDemo, setActiveDemo] = useState(null);
  const [demoResults, setDemoResults] = useState({});
  const [loading, setLoading] = useState({});
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  useEffect(() => {
    fetchMCPCapabilities();
    fetchDemoScenarios();
  }, []);

  const fetchMCPCapabilities = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.mcp}/capabilities`);
      const data = await response.json();
      setMcpCapabilities(data);
    } catch (error) {
      console.error("Failed to fetch MCP capabilities:", error);
    }
  };

  const fetchDemoScenarios = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.mcp}/demo`);
      const data = await response.json();
      setDemoScenarios(data.scenarios || []);
    } catch (error) {
      console.error("Failed to fetch demo scenarios:", error);
    }
  };

  const runDemo = async (scenario) => {
    const demoKey = scenario.tool;
    setLoading((prev) => ({ ...prev, [demoKey]: true }));
    setActiveDemo(scenario.tool);

    try {
      const response = await fetch(`${API_ENDPOINTS.mcp}/tools/call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tool: scenario.tool,
          parameters: scenario.parameters,
        }),
      });

      const result = await response.json();
      setDemoResults((prev) => ({ ...prev, [demoKey]: result }));
    } catch (error) {
      console.error("Demo failed:", error);
      setDemoResults((prev) => ({
        ...prev,
        [demoKey]: {
          error:
            "Oops! It looks like too many users made too many requests this month. My human Shreyans doesn't have the budget for that! If you'd like him to have the update, you can send him some money at his Venmo @Shreyans-Khunteta or his PayPal paypal.me/SKhunteta",
          details: error.message,
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [demoKey]: false }));
    }
  };

  const formatDemoResult = (result) => {
    if (!result) return null;

    if (result.error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Error: {result.error}</p>
          {result.details && (
            <p className="text-red-600 text-sm mt-1">{result.details}</p>
          )}
        </div>
      );
    }

    const { result: toolResult } = result;
    if (!toolResult) return null;

    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
        {toolResult.matchScore && (
          <div className="flex items-center space-x-2">
            <span className="text-green-800 font-semibold">Match Score:</span>
            <div className="bg-green-200 rounded-full px-3 py-1 text-green-800 font-bold">
              {Math.round(toolResult.matchScore * 100)}%
            </div>
          </div>
        )}

        {toolResult.analysis && (
          <div>
            <h4 className="text-green-800 font-semibold mb-2">
              Kali's Analysis:
            </h4>
            <p className="text-green-700 text-sm">{toolResult.analysis}</p>
          </div>
        )}

        {toolResult.kaliInsights && (
          <div>
            <h4 className="text-green-800 font-semibold mb-2">
              🐱 Kali's Insights:
            </h4>
            <p className="text-green-700 text-sm italic">
              {toolResult.kaliInsights}
            </p>
          </div>
        )}

        {toolResult.interviewTalkingPoints && (
          <div>
            <h4 className="text-green-800 font-semibold mb-2">
              Interview Talking Points:
            </h4>
            <ul className="list-disc list-inside text-green-700 text-sm space-y-1">
              {toolResult.interviewTalkingPoints.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>
        )}

        {toolResult.relevantProjects && (
          <div>
            <h4 className="text-green-800 font-semibold mb-2">
              Relevant Projects:
            </h4>
            <div className="space-y-2">
              {toolResult.relevantProjects.map((project, index) => (
                <div
                  key={index}
                  className="bg-white rounded border border-green-200 p-3"
                >
                  <div className="flex justify-between items-start">
                    <h5 className="font-semibold text-green-800">
                      {project.title}
                    </h5>
                    {project.relevanceScore && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {Math.round(project.relevanceScore * 100)}% match
                      </span>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-green-600 text-sm mt-1">
                      {project.description}
                    </p>
                  )}
                  {project.technologies && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {project.technologies.map((tech, techIndex) => (
                        <span
                          key={techIndex}
                          className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="mcp" className="section-container py-12 md:py-16">
      <div className="text-center mb-12">
        <h2 className="section-title mx-auto">
          🚀 MCP-Powered Portfolio Intelligence
        </h2>
        <p className="section-subtitle">
          Experience the future of AI-discoverable portfolios with Model Context
          Protocol
        </p>
        <p className="text-gray-600 max-w-3xl mx-auto">
          This portfolio features cutting-edge MCP integration, allowing AI
          systems to intelligently discover and interact with my professional
          information. Try the interactive demos below to see what makes this
          revolutionary.
        </p>
      </div>

      {/* MCP Overview */}
      <div className="max-w-6xl mx-auto mb-12">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card text-center">
            <div className="text-primary text-3xl mb-4">
              <FaRobot className="mx-auto" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI-Discoverable</h3>
            <p className="text-gray-600">
              AI systems can automatically discover and use portfolio
              intelligence tools
            </p>
          </div>

          <div className="card text-center">
            <div className="text-primary text-3xl mb-4">
              <FaCode className="mx-auto" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Intelligent Analysis</h3>
            <p className="text-gray-600">
              Deep technical analysis with Kali's observational insights
            </p>
          </div>

          <div className="card text-center">
            <div className="text-primary text-3xl mb-4">
              <FaFileAlt className="mx-auto" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Dynamic Content</h3>
            <p className="text-gray-600">
              Real-time resume generation and role-specific optimization
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Demos */}
      <div className="max-w-4xl mx-auto mb-12">
        <h3 className="text-2xl font-bold text-center mb-8">
          Interactive MCP Demos
        </h3>

        <div className="space-y-6">
          {demoScenarios.map((scenario, index) => (
            <div key={index} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-primary mb-2">
                    {scenario.title}
                  </h4>
                  <p className="text-gray-600 mb-3">{scenario.description}</p>

                  {/* Show parameters */}
                  <div className="bg-gray-50 rounded p-3 mb-4">
                    <h5 className="text-sm font-semibold text-gray-700 mb-2">
                      Parameters:
                    </h5>
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                      {JSON.stringify(scenario.parameters, null, 2)}
                    </pre>
                  </div>
                </div>

                <button
                  onClick={() => runDemo(scenario)}
                  disabled={loading[scenario.tool]}
                  className="btn btn-primary flex items-center space-x-2 ml-4"
                >
                  {loading[scenario.tool] ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>Running...</span>
                    </>
                  ) : demoResults[scenario.tool] ? (
                    <>
                      <FaCheck />
                      <span>Re-run</span>
                    </>
                  ) : (
                    <>
                      <FaPlay />
                      <span>Try Demo</span>
                    </>
                  )}
                </button>
              </div>

              {/* Demo Results */}
              {demoResults[scenario.tool] && (
                <div className="mt-4">
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">
                    Results:
                  </h5>
                  {formatDemoResult(demoResults[scenario.tool])}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Technical Details */}
      <div className="max-w-4xl mx-auto">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Technical Implementation</h3>
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="btn btn-secondary text-sm"
            >
              {showTechnicalDetails ? "Hide Details" : "Show Details"}
            </button>
          </div>

          {showTechnicalDetails && mcpCapabilities && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-primary mb-2">
                  Available MCP Tools:
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {mcpCapabilities.tools?.map((tool, index) => (
                    <div key={index} className="bg-gray-50 rounded p-3">
                      <h5 className="font-semibold text-gray-800">
                        {tool.name}
                      </h5>
                      <p className="text-sm text-gray-600 mt-1">
                        {tool.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-primary mb-2">
                  MCP Resources:
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {mcpCapabilities.resources?.map((resource, index) => (
                    <div key={index} className="bg-gray-50 rounded p-3">
                      <h5 className="font-semibold text-gray-800">
                        {resource.name}
                      </h5>
                      <p className="text-sm text-gray-600 mt-1">
                        {resource.description}
                      </p>
                      <code className="text-xs text-blue-600 block mt-2">
                        {resource.uri}
                      </code>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <h4 className="font-semibold text-blue-800 mb-2">
                  🔗 MCP Endpoint
                </h4>
                <p className="text-blue-700 text-sm mb-2">
                  AI systems can discover and interact with this portfolio at:
                </p>
                <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                  {API_ENDPOINTS.mcp ||
                    "https://backend.builtbyshrey.com/api/mcp"}
                </code>
              </div>
            </div>
          )}
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
