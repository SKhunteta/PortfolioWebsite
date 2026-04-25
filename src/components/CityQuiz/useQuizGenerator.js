import { useCallback, useState } from "react";
import { API_ENDPOINTS } from "../../config/api";

export default function useQuizGenerator() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);

  const generate = useCallback(async (city, { forceRefresh = false } = {}) => {
    setLoading(true);
    setError(null);
    setErrorType(null);
    setData(null);

    try {
      const response = await fetch(API_ENDPOINTS.quiz, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, forceRefresh }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const code = result.error || "unknown";
        const messageMap = {
          validation: result.message || "Please enter a valid city.",
          insufficient_data:
            result.message ||
            "We couldn't find enough verifiable trivia about that city. Try a nearby larger city.",
          rate_limited:
            result.message || "Too many requests. Please wait a moment.",
          budget_exceeded:
            result.message ||
            "Today's research budget is full. Please try a popular city or come back later.",
          timeout:
            result.message || "Claude took too long. Please try again.",
        };
        const msg = messageMap[code] || result.message || `Request failed (${response.status})`;
        setError(msg);
        setErrorType(code);
        return null;
      }

      if (!result.success || !result.data) {
        throw new Error("Invalid response from quiz engine.");
      }

      setData(result.data);
      return result.data;
    } catch (err) {
      setError(err.message || "Network error.");
      setErrorType("network");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setErrorType(null);
    setLoading(false);
  }, []);

  return { data, loading, error, errorType, generate, reset };
}
