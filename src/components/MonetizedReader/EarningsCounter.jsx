import { formatUSD } from "./constants";

const EarningsCounter = ({ earnings, frozen }) => (
  <div className="text-right" aria-hidden="true">
    <p className="font-mono text-[10px] uppercase tracking-wider text-mr-text-muted">
      {frozen ? "Session total" : "Earned this session"}
    </p>
    <p className="font-mono text-lg sm:text-xl font-semibold text-mr-money tabular-nums leading-tight">
      {formatUSD(earnings)}
    </p>
  </div>
);

export default EarningsCounter;
