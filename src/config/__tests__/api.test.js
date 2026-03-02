import { describe, it, expect, beforeEach } from "vitest";

describe("API Configuration", () => {
  beforeEach(() => {
    // Clear module cache so each test gets a fresh import
    vi.resetModules();
  });

  it("uses production base URL for non-localhost hostnames", async () => {
    // Default jsdom hostname is "localhost", so override it
    Object.defineProperty(window, "location", {
      value: { hostname: "builtbyshrey.com" },
      writable: true,
    });

    const { API_BASE_URL, API_ENDPOINTS } = await import("../../config/api");

    expect(API_BASE_URL).toBe("https://backend.builtbyshrey.com");
    expect(API_ENDPOINTS.ask).toBe(
      "https://backend.builtbyshrey.com/api/ask"
    );
    expect(API_ENDPOINTS.suggestions).toBe(
      "https://backend.builtbyshrey.com/api/ask/suggestions"
    );
    expect(API_ENDPOINTS.health).toBe(
      "https://backend.builtbyshrey.com/health"
    );
    expect(API_ENDPOINTS.mcp).toBe(
      "https://backend.builtbyshrey.com/api/mcp"
    );
    expect(API_ENDPOINTS.ele).toBe(
      "https://backend.builtbyshrey.com/api/ele/market-data"
    );
  });

  it("uses development base URL for localhost", async () => {
    Object.defineProperty(window, "location", {
      value: { hostname: "localhost" },
      writable: true,
    });

    const { API_BASE_URL } = await import("../../config/api");
    expect(API_BASE_URL).toBe("http://localhost:3001");
  });

  it("uses development base URL for 127.0.0.1", async () => {
    Object.defineProperty(window, "location", {
      value: { hostname: "127.0.0.1" },
      writable: true,
    });

    const { API_BASE_URL } = await import("../../config/api");
    expect(API_BASE_URL).toBe("http://localhost:3001");
  });

  it("exports default API_CONFIG with both environments", async () => {
    Object.defineProperty(window, "location", {
      value: { hostname: "localhost" },
      writable: true,
    });

    const module = await import("../../config/api");
    const config = module.default;

    expect(config).toHaveProperty("development");
    expect(config).toHaveProperty("production");
    expect(config.development.baseURL).toBe("http://localhost:3001");
    expect(config.production.baseURL).toBe(
      "https://backend.builtbyshrey.com"
    );
  });

  it("constructs all endpoint paths correctly", async () => {
    Object.defineProperty(window, "location", {
      value: { hostname: "localhost" },
      writable: true,
    });

    const { API_BASE_URL, API_ENDPOINTS } = await import("../../config/api");

    expect(API_ENDPOINTS.ask).toBe(`${API_BASE_URL}/api/ask`);
    expect(API_ENDPOINTS.suggestions).toBe(
      `${API_BASE_URL}/api/ask/suggestions`
    );
    expect(API_ENDPOINTS.health).toBe(`${API_BASE_URL}/health`);
    expect(API_ENDPOINTS.mcp).toBe(`${API_BASE_URL}/api/mcp`);
    expect(API_ENDPOINTS.ele).toBe(`${API_BASE_URL}/api/ele/market-data`);
  });
});
