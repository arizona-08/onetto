'use client';

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function StarterRevenueChart({ points }: { points: Array<{ label: string; amount: number }> }) {
  return <Line
    data={{
      labels: points.map((point) => point.label),
      datasets: [{
        label: 'CA facturé',
        data: points.map((point) => point.amount),
        borderColor: '#5b4bdb',
        backgroundColor: 'rgba(91, 75, 219, 0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
      }],
    }}
    options={{
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: (value) => `${value} €` }, grid: { color: '#f1f1f1' } },
        x: { grid: { display: false } },
      },
    }}
  />;
}
