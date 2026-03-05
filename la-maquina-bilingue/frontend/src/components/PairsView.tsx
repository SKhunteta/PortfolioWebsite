import type { MatchedPair } from '../api';
import EmotionBar from './EmotionBar';

interface Props {
  pairs: MatchedPair[];
  loading: boolean;
}

function parseEmotions(
  val: Record<string, number> | string | null,
): Record<string, number> | null {
  if (!val) return null;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  }
  return val;
}

export default function PairsView({ pairs, loading }: Props) {
  if (loading) {
    return <div className="loading">Loading matched pairs...</div>;
  }

  if (pairs.length === 0) {
    return (
      <div className="empty-state">
        <p>No matched pairs yet. Run the matching pipeline with Qdrant to find cross-lingual story pairs.</p>
      </div>
    );
  }

  return (
    <div className="pairs-list">
      {pairs.map((pair, i) => (
        <div key={i} className="pair-card">
          <div className="pair-score">
            <span className="score-label">Match</span>
            <span className="score-value">
              {(pair.match_score * 100).toFixed(0)}%
            </span>
          </div>
          <div className="pair-sides">
            <div className="pair-side pair-en">
              <div className="pair-lang">
                <span className="lang-badge lang-en">EN</span>
                <span className="pair-source">{pair.en_source}</span>
              </div>
              <div className="pair-title">{pair.en_title}</div>
              <EmotionBar emotions={parseEmotions(pair.en_emotions)} height={100} />
            </div>
            <div className="pair-divider" />
            <div className="pair-side pair-es">
              <div className="pair-lang">
                <span className="lang-badge lang-es">ES</span>
                <span className="pair-source">{pair.es_source}</span>
              </div>
              <div className="pair-title">{pair.es_title}</div>
              <EmotionBar emotions={parseEmotions(pair.es_emotions)} height={100} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
