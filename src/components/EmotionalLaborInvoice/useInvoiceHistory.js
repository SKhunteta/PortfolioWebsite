import { useState, useCallback, useMemo } from "react";

const STORAGE_KEY = "ele-invoice-history";
const MAX_ENTRIES = 20;

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // localStorage full or unavailable
  }
}

export default function useInvoiceHistory() {
  const [history, setHistory] = useState(loadHistory);

  const addInvoice = useCallback((invoice) => {
    setHistory((prev) => {
      const entry = {
        id: invoice.invoice_number,
        date: invoice.date,
        client: invoice.client,
        total: invoice.total,
        invoice,
      };
      const next = [entry, ...prev].slice(0, MAX_ENTRIES);
      saveHistory(next);
      return next;
    });
  }, []);

  const getInvoice = useCallback(
    (id) => history.find((h) => h.id === id)?.invoice || null,
    [history]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const lifetimeTotal = useMemo(
    () => history.reduce((sum, h) => sum + (h.total || 0), 0),
    [history]
  );

  return { history, addInvoice, getInvoice, clearHistory, lifetimeTotal };
}
