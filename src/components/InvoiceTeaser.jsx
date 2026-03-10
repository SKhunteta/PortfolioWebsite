import React from "react";
import { Link } from "react-router-dom";

const PREVIEW_LINE_ITEMS = [
  { description: "Listening to the same complaint (again)", qty: "3 hrs", rate: "$45.00", amount: "$135.00" },
  { description: "Suppressing visible frustration", qty: "1 hr", rate: "$72.00", amount: "$72.00" },
  { description: "Crafting the perfect 'I'm fine'", qty: "2 hrs", rate: "$38.00", amount: "$76.00" },
  { description: "Emotional code-switching", qty: "4 hrs", rate: "$55.00", amount: "$220.00" },
];

const InvoiceTeaser = () => {
  return (
    <div className="section-container py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-xl overflow-hidden shadow-custom-lg"
          style={{ backgroundColor: "#FAFAF7" }}
        >
          <div className="p-6 sm:p-8 md:p-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3
                  className="text-2xl sm:text-3xl font-bold tracking-tight mb-1"
                  style={{
                    fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
                    color: "#1A1A1A",
                  }}
                >
                  Emotional Labor Invoice
                </h3>
                <p
                  className="text-xs italic"
                  style={{
                    fontFamily: '"DM Sans", system-ui, sans-serif',
                    color: "#9A9A9A",
                  }}
                >
                  Itemizing the work nobody pays for
                </p>
              </div>
              <span
                className="text-xs px-2 py-1 rounded border"
                style={{
                  fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
                  borderColor: "#E8E4DF",
                  color: "#C49A3C",
                }}
              >
                INV
              </span>
            </div>

            {/* Preview line items */}
            <div className="rounded-lg overflow-hidden border mb-6" style={{ borderColor: "#E8E4DF" }}>
              {/* Table header */}
              <div
                className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium uppercase tracking-wider"
                style={{
                  fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
                  color: "#9A9A9A",
                  backgroundColor: "#F5F5F0",
                }}
              >
                <span className="col-span-6">Description</span>
                <span className="col-span-2 text-right">Qty</span>
                <span className="col-span-2 text-right">Rate</span>
                <span className="col-span-2 text-right">Amount</span>
              </div>
              {/* Rows */}
              {PREVIEW_LINE_ITEMS.map((item, i) => (
                <div
                  key={item.description}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-2 px-3 py-2.5 border-t"
                  style={{
                    borderColor: "#E8E4DF",
                    backgroundColor: i % 2 === 0 ? "#FFFFFF" : "#F5F5F0",
                  }}
                >
                  <span
                    className="col-span-6 text-sm"
                    style={{ fontFamily: '"DM Sans", system-ui, sans-serif', color: "#1A1A1A" }}
                  >
                    {item.description}
                  </span>
                  <span
                    className="col-span-2 text-sm text-right"
                    style={{ fontFamily: '"IBM Plex Mono", monospace', color: "#6B6B6B" }}
                  >
                    {item.qty}
                  </span>
                  <span
                    className="col-span-2 text-sm text-right"
                    style={{ fontFamily: '"IBM Plex Mono", monospace', color: "#6B6B6B" }}
                  >
                    {item.rate}
                  </span>
                  <span
                    className="col-span-2 text-sm text-right font-medium"
                    style={{ fontFamily: '"IBM Plex Mono", monospace', color: "#1A1A1A" }}
                  >
                    {item.amount}
                  </span>
                </div>
              ))}
              {/* Total row */}
              <div
                className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-2 px-3 py-2.5 border-t"
                style={{ borderColor: "#C49A3C", borderTopWidth: "2px", backgroundColor: "#F5F5F0" }}
              >
                <span
                  className="col-span-10 text-sm text-right font-medium uppercase tracking-wider"
                  style={{ fontFamily: '"IBM Plex Mono", monospace', color: "#1A1A1A" }}
                >
                  Total Due
                </span>
                <span
                  className="col-span-2 text-sm text-right font-bold"
                  style={{ fontFamily: '"IBM Plex Mono", monospace', color: "#C49A3C" }}
                >
                  $503.00
                </span>
              </div>
            </div>

            {/* Description + CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p
                className="text-sm max-w-md"
                style={{
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  color: "#6B6B6B",
                }}
              >
                Generate a real invoice for the emotional labor you&rsquo;ve been
                doing for free. AI-itemized. Exportable. Unpayable.
              </p>
              <Link
                to="/invoice"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors shrink-0"
                style={{
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  backgroundColor: "#1A1A1A",
                  color: "#FAFAF7",
                }}
              >
                Generate an Invoice
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Gold accent strip at bottom */}
          <div className="h-1.5" style={{ backgroundColor: "#C49A3C" }} />
        </div>
      </div>
    </div>
  );
};

export default InvoiceTeaser;
