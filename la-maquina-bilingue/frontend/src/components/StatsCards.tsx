import type { Stats } from '../api';

interface Props {
  stats: Stats | null;
  loading: boolean;
}

export default function StatsCards({ stats, loading }: Props) {
  const cards = [
    { label: 'Total Headlines', value: stats?.total ?? '—', icon: '📰' },
    { label: 'English', value: stats?.en ?? '—', color: 'var(--en-color)' },
    { label: 'Spanish', value: stats?.es ?? '—', color: 'var(--es-color)' },
  ];

  return (
    <div className="stats-grid">
      {cards.map((card) => (
        <div key={card.label} className="stat-card">
          <div className="stat-label">{card.label}</div>
          <div
            className="stat-value"
            style={card.color ? { color: card.color } : undefined}
          >
            {loading ? '...' : card.value}
          </div>
        </div>
      ))}
    </div>
  );
}
