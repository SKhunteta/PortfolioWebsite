import React, { forwardRef } from "react";
import { motion } from "framer-motion";

const InvoiceDisplay = forwardRef(function InvoiceDisplay({ invoice }, ref) {
  if (!invoice) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-2xl mx-auto"
    >
      <div
        ref={ref}
        className="bg-white border border-inv-border shadow-lg rounded-sm overflow-hidden"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {/* Gold top border */}
        <div className="h-1 bg-inv-gold" />

        <div className="px-8 sm:px-12 py-10">
          {/* Title */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h2 className="font-invoice text-xl font-bold text-inv-text tracking-tight uppercase">
                Emotional Labor Invoice
              </h2>
              <div className="mt-1 w-12 h-0.5 bg-inv-gold" />
            </div>
            <div className="text-right font-invoice text-xs text-ele-text-secondary space-y-0.5">
              <p>
                <span className="uppercase tracking-widest text-ele-text-tertiary">
                  Invoice #
                </span>{" "}
                {invoice.invoice_number}
              </p>
              <p>
                <span className="uppercase tracking-widest text-ele-text-tertiary">
                  Date
                </span>{" "}
                {invoice.date}
              </p>
              <p className="text-inv-gold font-medium">
                Due: Upon receipt (overdue since always)
              </p>
            </div>
          </div>

          {/* From / To */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-16 mb-10">
            <div>
              <p className="font-invoice text-[10px] uppercase tracking-[0.2em] text-ele-text-tertiary mb-1">
                From
              </p>
              <p className="font-sans-ele text-sm font-medium text-inv-text">
                {invoice.from}
              </p>
            </div>
            <div>
              <p className="font-invoice text-[10px] uppercase tracking-[0.2em] text-ele-text-tertiary mb-1">
                To
              </p>
              <p className="font-sans-ele text-sm font-medium text-inv-text">
                {invoice.client}
              </p>
            </div>
          </div>

          {/* Line Items Header */}
          <div className="border-b-2 border-inv-text pb-2 mb-0">
            <div className="grid grid-cols-12 gap-2 font-invoice text-[10px] uppercase tracking-[0.15em] text-ele-text-secondary">
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Rate</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>
          </div>

          {/* Line Items */}
          <div className="divide-y divide-inv-border">
            {invoice.line_items.map((item, i) => (
              <div
                key={i}
                className={`grid grid-cols-12 gap-2 py-4 ${
                  i % 2 === 1 ? "bg-inv-band" : ""
                }`}
                style={i % 2 === 1 ? { margin: "0 -2rem", padding: "1rem 2rem" } : undefined}
              >
                <div className="col-span-6 font-sans-ele text-sm text-inv-text leading-relaxed whitespace-pre-line">
                  {item.description}
                </div>
                <div className="col-span-2 text-right font-mono text-xs text-ele-text-secondary self-start pt-0.5">
                  {item.quantity}
                </div>
                <div className="col-span-2 text-right font-mono text-xs text-ele-text-secondary self-start pt-0.5">
                  ${typeof item.rate === "number" ? item.rate.toFixed(2) : item.rate}
                </div>
                <div className="col-span-2 text-right font-mono text-sm font-medium text-inv-text self-start pt-0.5">
                  ${typeof item.amount === "number" ? item.amount.toFixed(2) : item.amount}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t-2 border-inv-text mt-2 pt-4">
            {/* Subtotal */}
            <div className="flex justify-between items-center py-1.5">
              <span className="font-invoice text-xs uppercase tracking-widest text-ele-text-secondary">
                Subtotal
              </span>
              <span className="font-mono text-sm text-inv-text">
                ${invoice.subtotal.toFixed(2)}
              </span>
            </div>

            {/* Surcharges */}
            {invoice.surcharges?.map((surcharge, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-1.5"
              >
                <span className="font-sans-ele text-xs text-inv-gold font-medium">
                  {surcharge.label}
                </span>
                <span className="font-mono text-sm text-inv-gold">
                  ${surcharge.amount.toFixed(2)}
                </span>
              </div>
            ))}

            {/* Total */}
            <div className="flex justify-between items-center py-3 mt-2 border-t border-inv-border">
              <span className="font-invoice text-sm font-bold uppercase tracking-widest text-inv-text">
                Total
              </span>
              <span className="font-mono text-lg font-bold text-inv-text">
                ${invoice.total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="mt-8 pt-6 border-t border-inv-border">
            <p className="font-invoice text-[10px] uppercase tracking-[0.2em] text-ele-text-tertiary mb-2">
              Payment Terms
            </p>
            <p className="font-sans-ele text-sm text-inv-text leading-relaxed">
              {invoice.payment_terms}
            </p>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-4">
              <p className="font-sans-ele text-xs text-ele-text-secondary italic leading-relaxed">
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-inv-border text-center">
            <p className="font-sans-ele text-xs text-ele-text-tertiary mb-1">
              Market rates sourced from the{" "}
              <a
                href="/ele"
                className="text-inv-gold hover:text-inv-gold/80 underline decoration-inv-gold/30"
              >
                Emotional Labor Exchange
              </a>
            </p>
            <p className="font-sans-ele text-xs text-ele-text-tertiary mb-3">
              From the world of{" "}
              <span className="italic">The Happiness Liability</span>
            </p>
            <p className="font-invoice text-xs text-ele-text-secondary mt-4">
              {invoice.footer_note}
            </p>
          </div>
        </div>

        {/* Gold bottom border */}
        <div className="h-0.5 bg-inv-gold/40" />
      </div>
    </motion.div>
  );
});

export default InvoiceDisplay;
