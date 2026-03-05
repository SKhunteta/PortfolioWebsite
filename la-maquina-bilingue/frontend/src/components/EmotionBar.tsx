import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const EMOTION_COLORS: Record<string, string> = {
  anger: '#ef4444',
  disgust: '#84cc16',
  fear: '#a855f7',
  joy: '#eab308',
  sadness: '#3b82f6',
  surprise: '#f97316',
  neutral: '#6b7280',
};

interface Props {
  emotions: Record<string, number> | null;
  height?: number;
}

export default function EmotionBar({ emotions, height = 120 }: Props) {
  if (!emotions) {
    return <div className="emotion-empty">No emotion data</div>;
  }

  const labels = Object.keys(emotions);
  const values = Object.values(emotions);

  const data = {
    labels: labels.map((l) => l.charAt(0).toUpperCase() + l.slice(1)),
    datasets: [
      {
        data: values,
        backgroundColor: labels.map((l) => EMOTION_COLORS[l] || '#6b7280'),
        borderRadius: 4,
        barThickness: 16,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { x: number } }) =>
            `${(ctx.parsed.x * 100).toFixed(1)}%`,
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 1,
        grid: { color: '#2e3244' },
        ticks: { color: '#6b7280', callback: (v: string | number) => `${Number(v) * 100}%` },
      },
      y: {
        grid: { display: false },
        ticks: { color: '#9aa0b0', font: { size: 11 } },
      },
    },
  };

  return (
    <div style={{ height }}>
      <Bar data={data} options={options} />
    </div>
  );
}
