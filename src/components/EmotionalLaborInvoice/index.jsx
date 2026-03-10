import React, { useRef } from "react";
import { AnimatePresence } from "framer-motion";
import useInvoiceGenerator from "./useInvoiceGenerator";
import IntakeForm from "./IntakeForm";
import ProcessingState from "./ProcessingState";
import InvoiceDisplay from "./InvoiceDisplay";
import ExportControls from "./ExportControls";

export default function EmotionalLaborInvoice() {
  const { status, invoice, error, emotionPrices, generateInvoice, resetForm } =
    useInvoiceGenerator();
  const invoiceRef = useRef(null);

  return (
    <div className="min-h-screen bg-inv-bg">
      <div className="px-4 sm:px-6 py-12 sm:py-16">
        <AnimatePresence mode="wait">
          {status === "form" && (
            <IntakeForm
              key="form"
              emotionPrices={emotionPrices}
              onSubmit={generateInvoice}
            />
          )}

          {status === "loading" && <ProcessingState key="loading" />}

          {status === "invoice" && invoice && (
            <div key="invoice">
              <InvoiceDisplay ref={invoiceRef} invoice={invoice} />
              <ExportControls invoiceRef={invoiceRef} onReset={resetForm} />
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
