import React from "react";
import SparkLine from "./SparkLine";
import { EMOTIONS, getSignalStyle } from "./constants";

const EmotionCard = ({ emotionKey, data, history }) => {
  const emotionMeta = EMOTIONS[emotionKey];
  if (!emotionMeta || !data) return null;

  const isPositive = data.change >= 0;
  const changeStr = `${isPositive ? "+" : ""}${data.change?.toFixed(2)}`;
  const arrow = isPositive ? "\u25B2" : "\u25BC";

  return (
    <div
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-5 border-l-4 flex flex-col gap-3"
      style={{ borderLeftColor: emotionMeta.accentColor }}
    >
      {/* Header: name + icon */}
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg text-ele-text">{emotionMeta.name}</h3>
        <span className="text-lg opacity-70" aria-hidden="true">
          {emotionMeta.icon}
        </span>
      </div>

      {/* Price + change */}
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-2xl font-bold text-ele-text">
          ${data.price?.toFixed(2)}
        </span>
        <span
          className={`font-mono text-sm font-medium ${isPositive ? "text-ele-up" : "text-ele-down"}`}
        >
          {changeStr} {arrow}
        </span>
      </div>

      {/* Signal badge + sparkline */}
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${getSignalStyle(data.signal)}`}
        >
          {data.signal}
        </span>
        <SparkLine
          data={history}
          color={emotionMeta.accentColor}
          width={80}
          height={24}
        />
      </div>

      {/* Reason */}
      {data.reason && (
        <p className="font-sans-ele text-xs italic text-ele-text-secondary leading-snug line-clamp-2">
          {data.reason}
        </p>
      )}
    </div>
  );
};

export default EmotionCard;
