import type { Headline } from '../api';
import EmotionBar from './EmotionBar';

interface Props {
  headlines: Headline[];
  loading: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function HeadlineList({ headlines, loading }: Props) {
  if (loading) {
    return <div className="loading">Loading headlines...</div>;
  }

  if (headlines.length === 0) {
    return (
      <div className="empty-state">
        <p>No headlines yet. Run the ingestion pipeline to fetch some!</p>
      </div>
    );
  }

  return (
    <div className="headline-list">
      {headlines.map((h) => (
        <div key={h.id} className="headline-card">
          <div className="headline-header">
            <span className={`lang-badge lang-${h.language}`}>
              {h.language.toUpperCase()}
            </span>
            <span className="headline-source">{h.source}</span>
            <span className="headline-time">{timeAgo(h.published_at)}</span>
          </div>
          <a
            href={h.url}
            target="_blank"
            rel="noopener noreferrer"
            className="headline-title"
          >
            {h.title}
          </a>
          {h.emotions && (
            <div className="headline-emotions">
              <EmotionBar emotions={h.emotions} height={100} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
