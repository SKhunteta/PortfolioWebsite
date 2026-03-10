import React, { useState } from "react";
import { motion } from "framer-motion";

export default function ExportControls({ invoiceRef, onReset }) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

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

      // A4-ish proportions, sized to content
      const pdfWidth = 210; // mm (A4 width)
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
    </motion.div>
  );
}
