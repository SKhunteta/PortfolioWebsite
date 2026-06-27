import React from "react";
import { motion } from "framer-motion";
import AnimatedPrice from "./AnimatedPrice";
import {
  PRE_HIKE_LABEL,
  POST_HIKE_LABEL,
  formatSigned,
  percentChange,
} from "./pricing";
import { SF, MONO, COLORS } from "./theme";

// The hero of the piece: last week's price, today's price, and the tax between
// them. The "today" figure and the delta animate when the configuration
// changes, so adding memory or storage visibly widens the gap.
const PriceContrast = ({ contrast, deviceName }) => {
  const { before, after, delta } = contrast;
  const pct = percentChange(before.total, after.total);

  return (
    <div
      className="rounded-2xl p-6 sm:p-8"
      style={{ backgroundColor: COLORS.surface, boxShadow: "0 10px 40px rgba(0,0,0,0.06)" }}
    >
      <p className="text-[11px] uppercase tracking-widest mb-5" style={{ fontFamily: MONO, color: COLORS.muted }}>
        {deviceName}
      </p>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        {/* Last week */}
        <div>
          <p className="text-xs mb-1" style={{ fontFamily: SF, color: COLORS.muted }}>
            {PRE_HIKE_LABEL}
          </p>
          <p
            className="text-3xl sm:text-4xl font-medium tabular-nums"
            style={{ fontFamily: SF, color: COLORS.before }}
          >
            <span className="line-through decoration-1">
              ${Math.round(before.total).toLocaleString("en-US")}
            </span>
          </p>
        </div>

        <span className="text-2xl mb-1.5" style={{ color: COLORS.muted }} aria-hidden="true">
          &rarr;
        </span>

        {/* Today */}
        <div className="text-right">
          <p className="text-xs mb-1" style={{ fontFamily: SF, color: COLORS.rise }}>
            {POST_HIKE_LABEL}
          </p>
          <AnimatedPrice
            value={after.total}
            className="block text-4xl sm:text-6xl font-semibold tabular-nums tracking-tight"
            style={{ fontFamily: SF, color: COLORS.ink }}
          />
        </div>
      </div>

      {/* The tax */}
      <motion.div
        key={delta.total}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-6 flex items-center gap-3 rounded-xl px-4 py-3"
        style={{ backgroundColor: COLORS.riseSoft }}
      >
        <span
          className="text-lg font-semibold tabular-nums"
          style={{ fontFamily: SF, color: COLORS.rise }}
        >
          {formatSigned(delta.total)}
        </span>
        <span className="text-sm" style={{ fontFamily: SF, color: COLORS.rise }}>
          more than last week
          <span className="opacity-70"> · +{pct.toFixed(pct >= 10 ? 0 : 1)}%</span>
        </span>
      </motion.div>
    </div>
  );
};

export default PriceContrast;
