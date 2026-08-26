'use client';

import { CategoryScale, Chart as ChartJS, Legend, LineElement, LinearScale, PointElement, Tooltip } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function ProRevenueChart({ points }: { points: Array<{ label: string; billed: number; collected: number }> }) {
  return <Line data={{ labels: points.map((point) => point.label), datasets: [
    { label: 'Facturé', data: points.map((point) => point.billed), borderColor: '#5b4bdb', backgroundColor: '#5b4bdb', tension: 0.35, pointRadius: 3 },
    { label: 'Encaissé', data: points.map((point) => point.collected), borderColor: '#0f766e', backgroundColor: '#0f766e', tension: 0.35, pointRadius: 3 },
  ] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { ticks: { callback: (value) => `${value} €` }, grid: { color: '#f1f1f1' } }, x: { grid: { display: false } } } }} />;
}
