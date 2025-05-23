// API Configuration
const API_CONFIG = {
  development: {
    baseURL: "http://localhost:3001",
  },
  production: {
    baseURL: "https://backend.builtbyshrey.com",
  },
};

// Determine environment - Updated May 23, 2025
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
};

export default API_CONFIG;
