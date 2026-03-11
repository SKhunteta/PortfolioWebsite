import React from "react";

export default function PastInvoices({ history, lifetimeTotal, onView, onClear }) {
  if (!history.length) return null;

  return (
    <div className="w-full max-w-xl mx-auto mt-10">
      {/* Lifetime total */}
      {lifetimeTotal > 0 && (
        <p className="font-invoice text-sm text-inv-gold font-medium text-center mb-4">
          Lifetime emotional labor invoiced:{" "}
          {lifetimeTotal.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}
        </p>
      )}

      <div className="border-t border-inv-border pt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="font-invoice text-[10px] uppercase tracking-[0.2em] text-ele-text-tertiary">
            Past Invoices
          </p>
          <button
            onClick={onClear}
            className="font-sans-ele text-[10px] text-ele-text-tertiary hover:text-inv-text transition-colors cursor-pointer"
          >
            Clear History
          </button>
        </div>

        <div className="space-y-1">
          {history.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onView(entry.invoice)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-md border border-transparent hover:border-inv-border hover:bg-white transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-[10px] text-ele-text-tertiary shrink-0">
                  {entry.date}
                </span>
                <span className="font-sans-ele text-sm text-inv-text truncate">
                  {entry.client}
                </span>
              </div>
              <span className="font-mono text-sm font-medium text-inv-text shrink-0 ml-3">
                ${Number(entry.total || 0).toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
