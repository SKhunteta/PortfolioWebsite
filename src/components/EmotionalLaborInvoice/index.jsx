import React, { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import ViewSourceLink from "../ViewSourceLink";
import useInvoiceGenerator from "./useInvoiceGenerator";
import useInvoiceHistory from "./useInvoiceHistory";
import IntakeForm from "./IntakeForm";
import ProcessingState from "./ProcessingState";
import InvoiceDisplay from "./InvoiceDisplay";
import ExportControls from "./ExportControls";
import PastInvoices from "./PastInvoices";

export default function EmotionalLaborInvoice() {
  const { status, invoice, error, emotionPrices, generateInvoice, resetForm, viewExisting } =
    useInvoiceGenerator();
  const { history, addInvoice, clearHistory, lifetimeTotal } =
    useInvoiceHistory();
  const invoiceRef = useRef(null);

  // Auto-save generated invoices to history
  useEffect(() => {
    if (status === "invoice" && invoice) {
      addInvoice(invoice);
    }
  }, [status, invoice, addInvoice]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Emotional Labor Invoice";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="min-h-screen bg-inv-bg">
      <div className="px-4 sm:px-6 pt-4 flex items-center justify-between">
        <Link
          to="/"
          className="inline-block text-sm text-inv-text/60 hover:text-inv-text transition-colors font-invoice"
        >
          &larr; Back
        </Link>
        <ViewSourceLink
          dir="src/components/EmotionalLaborInvoice"
          className="text-xs text-inv-text/60 font-invoice"
        />
      </div>
      <div className="px-4 sm:px-6 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          {status === "form" && (
            <div key="form">
              <IntakeForm
                emotionPrices={emotionPrices}
                onSubmit={generateInvoice}
              />
              <PastInvoices
                history={history}
                lifetimeTotal={lifetimeTotal}
                onView={viewExisting}
                onClear={clearHistory}
              />
            </div>
          )}

          {status === "loading" && <ProcessingState key="loading" />}

          {status === "invoice" && invoice && (
            <div key="invoice">
              <InvoiceDisplay ref={invoiceRef} invoice={invoice} />
              <ExportControls invoice={invoice} invoiceRef={invoiceRef} onReset={resetForm} />
            </div>
          )}

          {status === "error" && (
            <div key="error" className="max-w-xl mx-auto text-center py-20">
              <p className="font-invoice text-lg text-inv-text mb-4">
                Generation Failed
              </p>
              <p className="font-sans-ele text-sm text-ele-text-secondary mb-6">
                {error || "Something went wrong. Please try again."}
              </p>
              <button
                onClick={resetForm}
                className="px-6 py-2.5 bg-inv-text text-inv-bg font-invoice text-xs font-semibold uppercase tracking-widest rounded-md hover:bg-inv-text/90 transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
