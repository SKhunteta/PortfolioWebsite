import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SocialCard from "./SocialCard";

function formatInvoiceAsText(invoice) {
  const lines = [
    "EMOTIONAL LABOR INVOICE",
    `Invoice #${invoice.invoice_number} | ${invoice.date}`,
    `From: ${invoice.from} \u2192 To: ${invoice.client}`,
    "",
  ];

  invoice.line_items.forEach((item, i) => {
    lines.push(
      `${i + 1}. ${item.description} \u2014 ${item.quantity} \u00d7 $${
        typeof item.rate === "number" ? item.rate.toFixed(2) : item.rate
      } = $${typeof item.amount === "number" ? item.amount.toFixed(2) : item.amount}`
    );
  });

  lines.push("");
  lines.push(`Subtotal: $${Number(invoice.subtotal || 0).toFixed(2)}`);

  if (invoice.surcharges?.length) {
    invoice.surcharges.forEach((s) => {
      lines.push(`${s.label}: $${Number(s.amount || 0).toFixed(2)}`);
    });
  }

  lines.push(`TOTAL: $${Number(invoice.total || 0).toFixed(2)}`);

  if (invoice.notes) {
    lines.push("");
    lines.push(`"${invoice.notes}"`);
  }

  lines.push("");
  lines.push("Payment: Not expected.");

  return lines.join("\n");
}

export default function ExportControls({ invoice, invoiceRef, onReset }) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [showSocialCard, setShowSocialCard] = useState(false);
  const [instagramToast, setInstagramToast] = useState(false);
  const socialCardRef = useRef(null);

  const handleDownloadPDF = async () => {
    if (!invoiceRef?.current || exporting) return;
    setExporting(true);
    setExportError(null);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#FFFFFF",
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const pdfWidth = 210;
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;

      const pdf = new jsPDF({
        orientation: pdfHeight > pdfWidth ? "portrait" : "landscape",
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      });

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("emotional-labor-invoice.pdf");
    } catch (err) {
      console.error("PDF export failed:", err);
      setExportError("PDF export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!invoiceRef?.current || exporting) return;
    setExporting(true);
    setExportError(null);

    try {
      const html2canvas = (await import("html2canvas")).default;

      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#FFFFFF",
      });

      const link = document.createElement("a");
      link.download = "emotional-labor-invoice.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Image export failed:", err);
      setExportError("Image export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleCopyText = async () => {
    if (!invoice) return;
    try {
      await navigator.clipboard.writeText(formatInvoiceAsText(invoice));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setExportError("Copy failed. Please try again.");
    }
  };

  const handleShareToThreads = () => {
    if (!invoice) return;
    const clientName =
      invoice.client.length > 40
        ? invoice.client.slice(0, 40) + "\u2026"
        : invoice.client;
    const total = Number(invoice.total || 0).toFixed(2);
    const url = `${window.location.origin}/invoice`;
    const text = `I just invoiced ${clientName} for $${total} of emotional labor.\n\nGenerate yours: ${url}`;
    window.open(
      `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  const handleShareToInstagram = async () => {
    // Instagram doesn't support web sharing — download social image + show guidance
    await handleSocialImageDownload();
    setInstagramToast(true);
    setTimeout(() => setInstagramToast(false), 4000);
  };

  const handleSocialImageDownload = async () => {
    if (exporting) return;
    setExporting(true);
    setExportError(null);
    setShowSocialCard(true);

    try {
      // Wait for render
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const html2canvas = (await import("html2canvas")).default;
      const el = socialCardRef.current;
      if (!el) throw new Error("Social card not rendered");

      const canvas = await html2canvas(el, {
        scale: 1,
        useCORS: true,
        backgroundColor: "#FFFFFF",
        width: 1080,
        height: 1350,
      });

      const link = document.createElement("a");
      link.download = "emotional-labor-invoice-social.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Social image export failed:", err);
      setExportError("Social image export failed. Please try again.");
    } finally {
      setExporting(false);
      setShowSocialCard(false);
    }
  };

  const handleSendInvoice = () => {
    setSent(true);
  };

  // Gold particle positions for the send animation
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    return { x: Math.cos(angle) * 60, y: Math.sin(angle) * 60 };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className="w-full max-w-2xl mx-auto mt-8 flex flex-col items-center gap-3"
    >
      {exportError && (
        <p className="font-sans-ele text-xs text-red-600 mb-1">{exportError}</p>
      )}

      {instagramToast && (
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="font-sans-ele text-xs text-inv-gold mb-1"
        >
          Image saved! Open Instagram and share from your gallery.
        </motion.p>
      )}

      {/* Primary actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={handleDownloadPDF}
          disabled={exporting}
          className="px-4 sm:px-6 py-2.5 bg-inv-text text-inv-bg font-invoice text-xs font-semibold uppercase tracking-widest rounded-md hover:bg-inv-text/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {exporting ? "Exporting\u2026" : "Download PDF"}
        </button>

        <button
          onClick={handleDownloadImage}
          disabled={exporting}
          className="px-4 sm:px-6 py-2.5 border border-inv-text text-inv-text font-invoice text-xs font-semibold uppercase tracking-widest rounded-md hover:bg-inv-text/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Save as Image
        </button>

        <button
          onClick={onReset}
          className="px-4 sm:px-6 py-2.5 border border-inv-border text-ele-text-secondary font-invoice text-xs font-semibold uppercase tracking-widest rounded-md hover:border-inv-text/30 hover:text-inv-text transition-colors cursor-pointer"
        >
          File Another
        </button>
      </div>

      {/* Secondary actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
        <button
          onClick={handleCopyText}
          className="px-4 py-2 border border-inv-border text-ele-text-secondary font-invoice text-[10px] font-semibold uppercase tracking-widest rounded-md hover:border-inv-text/30 hover:text-inv-text transition-colors cursor-pointer"
        >
          {copied ? "\u2713 Copied" : "Copy Text"}
        </button>

        <button
          onClick={handleShareToInstagram}
          disabled={exporting}
          className="px-4 py-2 border border-inv-border text-ele-text-secondary font-invoice text-[10px] font-semibold uppercase tracking-widest rounded-md hover:border-inv-text/30 hover:text-inv-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Share to Instagram
        </button>

        <button
          onClick={handleShareToThreads}
          className="px-4 py-2 border border-inv-border text-ele-text-secondary font-invoice text-[10px] font-semibold uppercase tracking-widest rounded-md hover:border-inv-text/30 hover:text-inv-text transition-colors cursor-pointer"
        >
          Share to Threads
        </button>

        {/* Send Invoice button */}
        <div className="relative">
          <AnimatePresence>
            {sent &&
              particles.map((p, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-inv-gold"
                  style={{ left: "50%", top: "50%" }}
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{ x: p.x, y: p.y, opacity: 0 }}
                  transition={{ duration: 0.8, delay: i * 0.03, ease: "easeOut" }}
                />
              ))}
          </AnimatePresence>
          <motion.button
            onClick={handleSendInvoice}
            disabled={sent}
            animate={
              sent
                ? { scale: [1, 1.05, 1], backgroundColor: "#C49A3C" }
                : {}
            }
            transition={{ duration: 0.3 }}
            className={`px-4 py-2 border font-invoice text-[10px] font-semibold uppercase tracking-widest rounded-md transition-colors cursor-pointer ${
              sent
                ? "border-inv-gold text-white bg-inv-gold"
                : "border-inv-border text-ele-text-secondary hover:border-inv-text/30 hover:text-inv-text"
            }`}
          >
            {sent ? (
              <span className="normal-case tracking-normal font-normal italic text-white text-[10px]">
                Invoice filed. Payment still not expected.
              </span>
            ) : (
              "Send Invoice"
            )}
          </motion.button>
        </div>
      </div>

      {/* Off-screen social card for capture */}
      {showSocialCard && invoice && (
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <SocialCard ref={socialCardRef} invoice={invoice} />
        </div>
      )}
    </motion.div>
  );
}
