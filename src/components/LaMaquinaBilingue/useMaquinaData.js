/**
 * Custom hook for fetching data from the La Máquina Bilingüe API.
 */

import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../../config/api";
import { API_BASE } from "./constants";

const buildUrl = (endpoint) => `${API_BASE_URL}${API_BASE}${endpoint}`;

export function useMaquinaData() {
  const [pairs, setPairs] = useState([]);
  const [trends, setTrends] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPairs = useCallback(async (topic = "", days = 7) => {
    try {
      const params = new URLSearchParams();
      if (topic) params.set("topic", topic);
      params.set("days", days);
      const res = await fetch(buildUrl(`/pairs?${params}`));
      if (!res.ok) throw new Error(`Failed to fetch pairs: ${res.status}`);
      const data = await res.json();
      setPairs(data);
      return data;
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  const fetchTrends = useCallback(async (emotion = "", days = 30) => {
    try {
      const params = new URLSearchParams();
      if (emotion) params.set("emotion", emotion);
      params.set("days", days);
      const res = await fetch(buildUrl(`/trends?${params}`));
      if (!res.ok) throw new Error(`Failed to fetch trends: ${res.status}`);
      const data = await res.json();
      setTrends(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(buildUrl("/health"));
      if (!res.ok) throw new Error(`Failed to fetch health: ${res.status}`);
      const data = await res.json();
      setHealth(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const analyzeHeadline = useCallback(async (headline, language = "auto") => {
    try {
      const res = await fetch(buildUrl("/analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline, language }),
      });
      if (!res.ok) throw new Error(`Analysis failed: ${res.status}`);
      return await res.json();
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const compareHeadlines = useCallback(async (headlineEn, headlineEs) => {
    try {
      const res = await fetch(buildUrl("/compare"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline_en: headlineEn, headline_es: headlineEs }),
      });
      if (!res.ok) throw new Error(`Comparison failed: ${res.status}`);
      return await res.json();
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const searchHeadlines = useCallback(async (query, language = "both") => {
    try {
      const res = await fetch(buildUrl("/search"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, language }),
      });
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      return await res.json();
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchPairs(), fetchHealth()]);
      setLoading(false);
    };
    load();
  }, [fetchPairs, fetchHealth]);

  return {
    pairs,
    trends,
    health,
    loading,
    error,
    fetchPairs,
    fetchTrends,
    fetchHealth,
    analyzeHeadline,
    compareHeadlines,
    searchHeadlines,
  };
}
