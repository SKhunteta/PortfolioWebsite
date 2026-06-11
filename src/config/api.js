// API Configuration
const API_CONFIG = {
  development: {
    baseURL: "http://localhost:3001",
  },
  production: {
    baseURL: "https://backend.builtbyshrey.com",
  },
};

// Determine environment
const isDevelopment =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const currentConfig = isDevelopment
  ? API_CONFIG.development
  : API_CONFIG.production;

export const API_BASE_URL = currentConfig.baseURL;
export const API_ENDPOINTS = {
  ask: `${API_BASE_URL}/api/ask`,
  suggestions: `${API_BASE_URL}/api/ask/suggestions`,
  health: `${API_BASE_URL}/health`,
  mcp: `${API_BASE_URL}/api/mcp`,
  ele: `${API_BASE_URL}/api/ele/market-data`,
  stories: `${API_BASE_URL}/api/stories/generate`,
  storiesContinue: `${API_BASE_URL}/api/stories/continue`,
  storiesRemix: `${API_BASE_URL}/api/stories/remix`,
  invoiceGenerate: `${API_BASE_URL}/api/invoice/generate`,
  janet: `${API_BASE_URL}/api/janet/chat`,
  quiz: `${API_BASE_URL}/api/quiz/generate`,
  quizCacheClear: `${API_BASE_URL}/api/quiz/cache`,
  linkArrivals: `${API_BASE_URL}/api/linkrail/arrivals`,
};

export default API_CONFIG;
