import React from "react";
import { motion } from "framer-motion";
import { PART_LABELS } from "./scenes";

const SANS = '"DM Sans", system-ui, sans-serif';
const MONO = '"JetBrains Mono", "IBM Plex Mono", monospace';

const appear = (reduced) =>
  reduced
    ? { initial: false, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, scale: 0.9 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
      };

// The persistent die diagram. `parts` is a Set of part ids that have been
// dropped in so far. In the crossing scene the whole package detaches.
const ChipAssembly = ({ parts, reducedMotion = false, shipped = false, compact = false }) => {
  const has = (p) => parts.has(p);
  const size = compact ? 120 : 200;
  const present = Array.from(parts);

  return (
    <div className="flex flex-col items-center">
      <motion.svg
        viewBox="0 0 200 160"
        width={size}
        height={size * 0.8}
        role="img"
        aria-label={`Chip assembly: ${present.map((p) => PART_LABELS[p]).join(", ") || "empty die slot"}`}
        animate={shipped && !reducedMotion ? { y: [-2, 2, -2] } : { y: 0 }}
        transition={shipped ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : {}}
      >
        {/* Empty slot outline */}
        <rect x="20" y="20" width="160" height="120" rx="6" fill="none" stroke="#E0DACF" strokeWidth="1" strokeDasharray="3 3" />

        {/* Package substrate + interposer */}
        {has("interposer") && (
          <motion.g {...appear(reducedMotion)}>
            <rect x="26" y="26" width="148" height="108" rx="4" fill="#2C2A26" />
            <rect x="34" y="34" width="132" height="92" rx="2" fill="#3E5C5A" />
          </motion.g>
        )}

        {/* Logic die */}
        {has("die") && (
          <motion.g {...appear(reducedMotion)}>
            <rect
              x="70"
              y="52"
              width="60"
              height="56"
              rx="2"
              fill={has("fabbed") ? "#1A1A1A" : "#4A4A4A"}
            />
            <path d="M70 56 L74 52" stroke="#6B6B6B" strokeWidth="1.2" />
          </motion.g>
        )}

        {/* EUV pattern on the die */}
        {has("pattern") && (
          <motion.g {...appear(reducedMotion)} stroke="#5BC0BE" strokeWidth="0.5" opacity="0.85">
            {[58, 64, 70, 76, 82, 88, 94, 100].map((y) => (
              <line key={y} x1="74" y1={y} x2="126" y2={y} />
            ))}
          </motion.g>
        )}

        {/* Sub-nanometer features (finer cross-hatch) */}
        {has("fineEtch") && (
          <motion.g {...appear(reducedMotion)} stroke="#A7E0DE" strokeWidth="0.3" opacity="0.7">
            {[78, 86, 94, 102, 110, 118].map((x) => (
              <line key={x} x1={x} y1="54" x2={x} y2="106" />
            ))}
          </motion.g>
        )}

        {/* HBM stacks flanking the die */}
        {has("hbm") &&
          [44, 144].map((x) => (
            <motion.g key={x} {...appear(reducedMotion)}>
              {[0, 1, 2, 3].map((i) => (
                <rect key={i} x={x} y={56 + i * 12} width="14" height="10" rx="1" fill="#C9A227" stroke="#8A6D14" strokeWidth="0.4" />
              ))}
            </motion.g>
          ))}

        {/* Shipping crate */}
        {has("crate") && (
          <motion.g {...appear(reducedMotion)}>
            <rect x="14" y="14" width="172" height="132" rx="4" fill="none" stroke="#7A6F5C" strokeWidth="2" strokeDasharray="6 4" />
            <line x1="14" y1="80" x2="186" y2="80" stroke="#7A6F5C" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
          </motion.g>
        )}
      </motion.svg>

      <p className="text-[10px] mt-1 tracking-widest uppercase" style={{ fontFamily: MONO, color: "#9A9A9A" }}>
        {shipped ? "Shipped" : present.length === 0 ? "Empty die slot" : `${present.length} of 7 components`}
      </p>
      {!compact && present.length > 0 && (
        <p className="text-[10px] mt-0.5 text-center max-w-[200px]" style={{ fontFamily: SANS, color: "#B8B2AA" }}>
          {present.map((p) => PART_LABELS[p]).join(" · ")}
        </p>
      )}
    </div>
  );
};

export default ChipAssembly;
