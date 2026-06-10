import { EMOTIONS } from "./constants";

const EmotionMeter = ({ emotion, level, reducedMotion }) => {
  const config = EMOTIONS[emotion];
  if (!config) return null;
  const clamped = Math.max(0, Math.min(100, level));

  return (
    <div className="flex items-center gap-2">
      <span
        className="font-mono text-[10px] uppercase tracking-wider w-20 shrink-0"
        style={{ color: config.dangerous ? "#F59E0B" : "#8B98A9" }}
      >
        {config.label}
        {config.dangerous && <span aria-hidden="true"> ⚠</span>}
      </span>
      <div
        role="meter"
        aria-label={`${config.label} level`}
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="flex-1 h-1.5 rounded-full bg-mr-panel overflow-hidden"
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${clamped}%`,
            backgroundColor: config.color,
            transition: reducedMotion ? "none" : "width 0.8s ease-out",
          }}
        />
      </div>
      <span className="font-mono text-[10px] text-mr-text-muted w-7 text-right tabular-nums">
        {Math.round(clamped)}
      </span>
    </div>
  );
};

export default EmotionMeter;
