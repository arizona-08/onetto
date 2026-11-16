"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  ScriptableContext,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

function areaGradient(context: ScriptableContext<"line">) {
  const { chart } = context;
  const { ctx } = chart;
  const chartArea = chart.chartArea;
  if (!chartArea) return "rgba(69, 74, 222, 0.14)";

  const gradient = ctx.createLinearGradient(
    0,
    chartArea.top,
    0,
    chartArea.bottom,
  );
  gradient.addColorStop(0, "rgba(69, 74, 222, 0.28)");
  gradient.addColorStop(0.65, "rgba(69, 74, 222, 0.07)");
  gradient.addColorStop(1, "rgba(69, 74, 222, 0)");
  return gradient;
}

export default function StarterRevenueChart({
  points,
}: {
  points: Array<{ label: string; amount: number }>;
}) {
  return (
    <div className="h-full">
      <Line
      role="img"
      aria-label="Évolution du chiffre d’affaires facturé sur les six derniers mois"
      data={{
        labels: points.map((point) => point.label),
        datasets: [
          {
            label: "CA facturé",
            data: points.map((point) => point.amount),
            borderColor: "#454ADE",
            backgroundColor: areaGradient,
            fill: true,
            tension: 0.4,
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: "#454ADE",
            pointHoverBorderColor: "#FFFFFF",
            pointHoverBorderWidth: 2,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#FFFFFF",
            titleColor: "#231942",
            bodyColor: "#52525B",
            borderColor: "rgba(69, 74, 222, 0.22)",
            borderWidth: 1,
            cornerRadius: 8,
            caretSize: 6,
            caretPadding: 8,
            padding: 10,
            titleMarginBottom: 5,
            displayColors: false,
            titleFont: { family: "Poppins", size: 12, weight: 600 },
            bodyFont: { family: "Poppins", size: 12, weight: 500 },
            callbacks: {
              label: (context) =>
                `CA facturé · ${Number(context.raw).toLocaleString("fr-FR")} €`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            border: { display: false },
            ticks: {
              callback: (value) => `${value} €`,
              color: "#A1A1AA",
              font: { size: 11 },
            },
            grid: { color: "#F4F4F5", drawTicks: false },
          },
          x: {
            border: { display: false },
            ticks: { color: "#A1A1AA", font: { size: 11 } },
            grid: { display: false },
          },
        },
      }}
      />
      <table className="sr-only">
        <caption>Évolution du chiffre d’affaires facturé</caption>
        <thead><tr><th scope="col">Mois</th><th scope="col">Facturé</th></tr></thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.label}>
              <th scope="row">{point.label}</th>
              <td>{point.amount.toLocaleString("fr-FR")} €</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
