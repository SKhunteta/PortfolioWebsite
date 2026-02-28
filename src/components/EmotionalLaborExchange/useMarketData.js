import { useState, useEffect, useCallback, useRef } from "react";
import { API_ENDPOINTS } from "../../config/api";

const MAX_HISTORY = 12;
const CACHE_KEY = "ele_market_cache";
const INITIAL_REFRESH_MS = 20 * 1000; // first background refresh after 20s
const INTERVAL_REFRESH_MS = 10 * 60 * 1000; // then every 10 minutes

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded — ignore */ }
}

export default function useMarketData() {
  const cached = useRef(readCache());
  const [marketData, setMarketData] = useState(cached.current);
  const [priceHistory, setPriceHistory] = useState({});
  const [loading, setLoading] = useState(!cached.current);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Shared fetch logic. When `silent` is true the existing UI stays untouched
  // until new data arrives (no loading spinner, no error flash).
  const fetchMarketData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await fetch(API_ENDPOINTS.ele, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.message || `Request failed with status ${response.status}`
        );
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error("Invalid response from pricing engine");
      }

      const data = result.data;
      setMarketData(data);
      setLastUpdate(new Date());
      writeCache(data);

      // Append new prices to history
      setPriceHistory((prev) => {
        const updated = { ...prev };
        if (data.emotions && typeof data.emotions === "object") {
          for (const [key, emotion] of Object.entries(data.emotions)) {
            const existing = updated[key] || [];
            updated[key] = [...existing.slice(-(MAX_HISTORY - 1)), emotion.price];
          }
        }
        return updated;
      });

      if (!silent) setError(null);
    } catch (err) {
      // Silent fetches fail quietly — don't disturb what's on screen
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // Background refresh: 20s after mount, then every 10 minutes
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      fetchMarketData(true);
    }, INITIAL_REFRESH_MS);

    const interval = setInterval(() => {
      fetchMarketData(true);
    }, INTERVAL_REFRESH_MS);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [fetchMarketData]);

  return {
    marketData,
    priceHistory,
    loading,
    error,
    lastUpdate,
    refreshMarket: fetchMarketData,
  };
}
