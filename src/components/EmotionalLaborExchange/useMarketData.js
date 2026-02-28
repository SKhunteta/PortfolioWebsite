import { useState, useEffect, useCallback } from "react";
import { API_ENDPOINTS } from "../../config/api";

const MAX_HISTORY = 12;

export default function useMarketData() {
  const [marketData, setMarketData] = useState(null);
  const [priceHistory, setPriceHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchMarketData = useCallback(async () => {
    setLoading(true);
    setError(null);

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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketData();
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
