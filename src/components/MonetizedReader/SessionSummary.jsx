import { Link } from "react-router-dom";
import {
  BOOK_AUTHOR,
  BOOK_TITLE,
  EMOTIONS,
  SUMMARY_DISCLAIMER,
  formatUSD,
} from "./constants";

const emotionLabel = (key) => EMOTIONS[key]?.label ?? key.charAt(0).toUpperCase() + key.slice(1);

const StatRow = ({ label, value }) => (
  <div className="flex items-baseline justify-between gap-4 py-2 border-b border-mr-border/60 last:border-b-0">
    <dt className="font-mono text-xs uppercase tracking-wider text-mr-text-muted">
      {label}
    </dt>
    <dd className="font-mono text-sm text-mr-text tabular-nums text-right">{value}</dd>
  </div>
);

const SessionSummary = ({ stats }) => {
  if (!stats) return null;

  const readingMinutes = Math.max(1, Math.round(stats.readingTimeMs / 60000));
  const soldEntries = Object.entries(stats.unitsSold);

  return (
    <section className="max-w-prose mx-auto px-5 sm:px-6" aria-label="Session report">
      <div className="rounded-xl bg-mr-surface border border-mr-border p-6 sm:p-8">
        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-mr-accent mb-1">
          Meridian · Session report
        </p>
        <h2 className="font-serif text-2xl text-mr-text mb-6">
          Uplink disconnected
        </h2>

        <dl className="mb-6">
          <StatRow label="Gross earnings" value={formatUSD(stats.totalEarned)} />
          {soldEntries.length > 0 ? (
            soldEntries.map(([emotion, units]) => (
              <StatRow
                key={emotion}
                label={`${emotionLabel(emotion)} sold`}
                value={`${units} unit${units === 1 ? "" : "s"}`}
              />
            ))
          ) : (
            <StatRow label="Units sold" value="0" />
          )}
          <StatRow label="Reading time" value={`${readingMinutes} min`} />
          <StatRow label="Peak happiness" value={`${stats.peakHappiness}%`} />
          <StatRow label="Contamination events" value={stats.contaminationEvents} />
          <StatRow label="Calls from Harold" value={stats.haroldCalls} />
          <StatRow
            label="Market disruption caused"
            value={`${stats.marketDisruptionBps} bps`}
          />
        </dl>

        <p className="font-mono text-[10px] text-mr-text-muted mb-8">
          {SUMMARY_DISCLAIMER}
        </p>

        <div className="border-t border-mr-border pt-6">
          <p className="font-sans text-sm text-mr-text-secondary leading-relaxed mb-4">
            You just read the opening of{" "}
            <em className="text-mr-text">{BOOK_TITLE}</em>, a novel by{" "}
            {BOOK_AUTHOR} about what happens when the world&apos;s most
            profitable sadness meets a kindergarten teacher with other ideas.
          </p>
          <p className="font-mono text-xs text-mr-money mb-6">
            COMING SOON — IN PRINT, UNMONITORED
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/janet"
              className="font-mono text-xs px-4 py-2.5 rounded-md border border-mr-border text-mr-text-secondary hover:bg-mr-panel transition-colors text-center"
            >
              Talk to JANET &rarr;
            </Link>
            <Link
              to="/ele"
              className="font-mono text-xs px-4 py-2.5 rounded-md border border-mr-border text-mr-text-secondary hover:bg-mr-panel transition-colors text-center"
            >
              Trade on the Emotional Labor Exchange &rarr;
            </Link>
            <Link
              to="/"
              className="font-mono text-xs px-4 py-2.5 rounded-md bg-mr-accent text-mr-bg font-semibold hover:opacity-90 transition-opacity text-center"
            >
              Back to portfolio
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SessionSummary;
