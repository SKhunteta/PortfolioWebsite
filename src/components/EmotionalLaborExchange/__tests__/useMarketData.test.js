import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import useMarketData from "../useMarketData";

// Mock the api config module
vi.mock("../../../config/api", () => ({
  API_ENDPOINTS: {
    ele: "http://localhost:3001/api/ele/market-data",
  },
}));

const mockMarketResponse = {
  success: true,
  data: {
    emotions: {
      joy: { price: 42.5, change: 1.2, signal: "BUY", reason: "Good vibes" },
      grief: {
        price: 88.0,
        change: -2.1,
        signal: "SELL",
        reason: "Processing",
      },
    },
    volatilityIndex: 45,
    headlines: [],
  },
};

describe("useMarketData", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMarketResponse),
        })
      )
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts in loading state", () => {
    const { result } = renderHook(() => useMarketData());
    expect(result.current.loading).toBe(true);
    expect(result.current.marketData).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("fetches market data on mount", async () => {
    const { result } = renderHook(() => useMarketData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.marketData).toEqual(mockMarketResponse.data);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdate).toBeInstanceOf(Date);
  });

  it("builds price history from fetched data", async () => {
    const { result } = renderHook(() => useMarketData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.priceHistory).toHaveProperty("joy");
    expect(result.current.priceHistory.joy).toContain(42.5);
    expect(result.current.priceHistory).toHaveProperty("grief");
    expect(result.current.priceHistory.grief).toContain(88.0);
  });

  it("handles API error responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: "Server error" }),
        })
      )
    );

    const { result } = renderHook(() => useMarketData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Server error");
    expect(result.current.marketData).toBeNull();
  });

  it("handles API error with no message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.reject(new Error("parse error")),
        })
      )
    );

    const { result } = renderHook(() => useMarketData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Request failed with status 500");
  });

  it("handles network errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("Network error")))
    );

    const { result } = renderHook(() => useMarketData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
  });

  it("handles invalid response structure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: false }),
        })
      )
    );

    const { result } = renderHook(() => useMarketData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(
      "Invalid response from pricing engine"
    );
  });

  it("exposes a refreshMarket function", async () => {
    const { result } = renderHook(() => useMarketData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refreshMarket).toBe("function");
  });

  it("sends POST request with correct headers", async () => {
    const { result } = renderHook(() => useMarketData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/ele/market-data",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );
  });
});
