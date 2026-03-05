import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaDownload, FaShareAlt } from "react-icons/fa";
import { GENRE_ACCENT_COLORS } from "./constants";

// Genre → gradient color stops for canvas
const GENRE_CANVAS_COLORS = {
  "sci-fi": ["#0e1a2e", "#1a0e2e"],
  fantasy: ["#1a0e2e", "#0e1a2e"],
  horror: ["#2e0e0e", "#1a0e0e"],
  literary: ["#2e1a0e", "#1a1a0e"],
  humor: ["#0e2e1a", "#0e1a2e"],
  thriller: ["#2e1a0e", "#1a0e0e"],
  "magical-realism": ["#2e0e2e", "#1a0e1a"],
  mystery: ["#0e0e2e", "#1a0e2e"],
  romance: ["#2e0e1a", "#1a0e1a"],
  dystopian: ["#1a1a0e", "#0e2e1a"],
  historical: ["#2e1a0e", "#1a1a0e"],
  absurdist: ["#1a2e0e", "#0e1a2e"],
  noir: ["#1a1a1a", "#0e0e0e"],
  fable: ["#0e2e1a", "#1a2e0e"],
};

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const paragraphs = text.split("\n");
  let currentY = y;

  for (const para of paragraphs) {
    const words = para.split(" ");
    let line = "";

    for (const word of words) {
      const testLine = line + word + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== "") {
        ctx.fillText(line.trim(), x, currentY);
        line = word + " ";
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, currentY);
    currentY += lineHeight * 1.4; // paragraph spacing
  }
  return currentY;
}

function generateShareImage(canvas, story) {
  const ctx = canvas.getContext("2d");
  const W = 1080;
  const H = 1350;
  canvas.width = W;
  canvas.height = H;

  const accentColor = GENRE_ACCENT_COLORS[story.genre] || "#8B5CF6";
  const [gradStart, gradEnd] = GENRE_CANVAS_COLORS[story.genre] || [
    "#0F0F1A",
    "#1A1A2E",
  ];

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, gradStart);
  grad.addColorStop(1, gradEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Top accent line
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, W, 4);

  const PAD = 80;

  // Genre badge
  ctx.font = '500 28px "DM Sans", system-ui, sans-serif';
  ctx.fillStyle = accentColor;
  ctx.fillText(
    (story.genre || "literary").toUpperCase(),
    PAD,
    PAD + 40
  );

  // Mood
  if (story.mood) {
    const genreWidth = ctx.measureText(
      (story.genre || "literary").toUpperCase()
    ).width;
    ctx.font = 'italic 24px "DM Sans", system-ui, sans-serif';
    ctx.fillStyle = "rgba(160,160,184,0.7)";
    ctx.fillText(story.mood, PAD + genreWidth + 20, PAD + 40);
  }

  // Title
  ctx.font = 'bold 56px "Georgia", serif';
  ctx.fillStyle = "#F0F0F0";
  const titleY = wrapText(ctx, story.title, PAD, PAD + 120, W - PAD * 2, 68);

  // Content
  const isPremise = story.type === "premise";
  ctx.font = isPremise
    ? '32px "DM Sans", system-ui, sans-serif'
    : '28px "Georgia", serif';
  ctx.fillStyle = "rgba(160,160,184,0.9)";

  // Truncate content for the card
  const maxContent = isPremise ? story.content : story.content.slice(0, 500);
  wrapText(ctx, maxContent, PAD, titleY + 40, W - PAD * 2, isPremise ? 48 : 44);

  // Tags
  if (story.tags && story.tags.length > 0) {
    ctx.font = '22px "DM Sans", system-ui, sans-serif';
    ctx.fillStyle = "rgba(107,107,128,0.8)";
    const tagText = story.tags.map((t) => `#${t}`).join("  ");
    ctx.fillText(tagText, PAD, H - 160);
  }

  // Watermark
  ctx.font = 'bold 28px "Georgia", serif';
  ctx.fillStyle = "rgba(139,92,246,0.4)";
  ctx.fillText("Plot Twist", PAD, H - 80);

  // Accent line at bottom
  ctx.fillStyle = accentColor;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(PAD, H - 60, 60, 2);
  ctx.globalAlpha = 1;
}

const ShareCard = ({ story, isOpen, onClose }) => {
  const canvasRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);
  const canShare = typeof navigator.share === "function";

  useEffect(() => {
    if (isOpen && story && canvasRef.current) {
      generateShareImage(canvasRef.current, story);
      setImageUrl(canvasRef.current.toDataURL("image/png"));
    }
  }, [isOpen, story]);

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `plot-twist-${story.title.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  };

  const handleShare = async () => {
    if (!canvasRef.current) return;
    try {
      const blob = await new Promise((resolve) =>
        canvasRef.current.toBlob(resolve, "image/png")
      );
      const file = new File([blob], "plot-twist-story.png", {
        type: "image/png",
      });
      await navigator.share({
        title: `Plot Twist: ${story.title}`,
        text: story.content.slice(0, 100) + "...",
        files: [file],
      });
    } catch {
      // User cancelled or share not supported
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-40"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[400px] sm:max-h-[85vh] z-50 bg-pt-surface rounded-2xl border border-pt-border flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-pt-border shrink-0">
              <h3 className="text-pt-text font-semibold">Share Story</h3>
              <button
                onClick={onClose}
                className="text-pt-text-muted hover:text-pt-text transition-colors"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Preview */}
            <div className="flex-1 overflow-y-auto p-4">
              <canvas ref={canvasRef} className="hidden" />
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Share preview"
                  className="w-full rounded-lg shadow-lg"
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-4 py-3 border-t border-pt-border shrink-0">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 text-pt-text text-sm font-medium hover:bg-white/15 transition-colors"
              >
                <FaDownload size={14} />
                Download
              </button>
              {canShare && (
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-pt-accent text-white text-sm font-medium hover:bg-pt-accent/90 transition-colors"
                >
                  <FaShareAlt size={14} />
                  Share
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ShareCard;
