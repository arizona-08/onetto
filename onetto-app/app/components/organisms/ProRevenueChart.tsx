'use client';

import { CategoryScale, Chart as ChartJS, Filler, Legend, LineElement, LinearScale, PointElement, ScriptableContext, Tooltip } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

function areaGradient(context: ScriptableContext<'line'>, color: string) {
  const { chart } = context;
  const { ctx } = chart;
  const chartArea = chart.chartArea;
  if (!chartArea) return color === 'primary' ? 'rgba(69, 74, 222, 0.14)' : 'rgba(16, 185, 129, 0.12)';

  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  const isPrimary = color === 'primary';
  gradient.addColorStop(0, isPrimary ? 'rgba(69, 74, 222, 0.24)' : 'rgba(16, 185, 129, 0.18)');
  gradient.addColorStop(0.7, isPrimary ? 'rgba(69, 74, 222, 0.05)' : 'rgba(16, 185, 129, 0.04)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  return gradient;
}

export default function ProRevenueChart({ points }: { points: Array<{ label: string; billed: number; collected: number }> }) {
  return <Line data={{ labels: points.map((point) => point.label), datasets: [
    { label: 'Facturé', data: points.map((point) => point.billed), borderColor: '#454ADE', backgroundColor: (context) => areaGradient(context, 'primary'), fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 4, pointHoverBackgroundColor: '#454ADE', pointHoverBorderColor: '#FFFFFF', pointHoverBorderWidth: 2 },
    { label: 'Encaissé', data: points.map((point) => point.collected), borderColor: '#059669', backgroundColor: (context) => areaGradient(context, 'success'), fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 4, pointHoverBackgroundColor: '#059669', pointHoverBorderColor: '#FFFFFF', pointHoverBorderWidth: 2 },
  ] }} options={{ responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' }, plugins: { legend: { position: 'bottom', align: 'start', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8, padding: 18, color: '#52525B', font: { size: 12 } } }, tooltip: { backgroundColor: '#231942', padding: 10, callbacks: { label: (context) => `${context.dataset.label} : ${Number(context.raw).toLocaleString('fr-FR')} €` } } }, scales: { y: { beginAtZero: true, border: { display: false }, ticks: { callback: (value) => `${value} €`, color: '#A1A1AA', font: { size: 11 } }, grid: { color: '#F4F4F5', drawTicks: false } }, x: { border: { display: false }, ticks: { color: '#A1A1AA', font: { size: 11 } }, grid: { display: false } } } }} />;
}
