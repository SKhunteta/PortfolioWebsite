import { useState, useEffect, useCallback } from "react";
import { API_ENDPOINTS } from "../../config/api";

export default function useInvoiceGenerator() {
  const [status, setStatus] = useState("form"); // form | loading | invoice | error
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState(null);
  const [emotionPrices, setEmotionPrices] = useState({});

  // Fetch ELE market prices on mount for display in emotion selector
  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch(API_ENDPOINTS.ele, { method: "POST" });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.emotions) {
            setEmotionPrices(json.data.emotions);
          }
        }
      } catch {
        // Non-critical — form works without prices
      }
    }
    fetchPrices();
  }, []);

  const generateInvoice = useCallback(async (formData) => {
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch(API_ENDPOINTS.invoiceGenerate, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.message || "Failed to generate invoice. Please try again."
        );
      }

      const json = await res.json();
      if (json.success && json.invoice) {
        setInvoice(json.invoice);
        setStatus("invoice");
      } else {
        throw new Error("Unexpected response format.");
      }
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }, []);

  const resetForm = useCallback(() => {
    setStatus("form");
    setInvoice(null);
    setError(null);
  }, []);

  return { status, invoice, error, emotionPrices, generateInvoice, resetForm };
}
