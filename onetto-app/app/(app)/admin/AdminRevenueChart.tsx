"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
);

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default function AdminRevenueChart({
  points,
}: {
  points: Array<{ label: string; amountCents: number }>;
}) {
  return (
    <>
      <Line
        data={{
          labels: points.map((point) => point.label),
          datasets: [
            {
              label: "Encaissé",
              data: points.map((point) => point.amountCents / 100),
              borderColor: "#454ADE",
              backgroundColor: "rgba(69, 74, 222, 0.10)",
              fill: true,
              tension: 0.3,
              borderWidth: 2.5,
              pointRadius: points.length <= 7 ? 3 : 0,
              pointHoverRadius: 5,
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
              callbacks: {
                label: (context) =>
                  `Encaissé : ${new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  }).format(Number(context.raw))}`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { maxTicksLimit: 8, color: "#71717A" },
            },
            y: {
              beginAtZero: true,
              border: { display: false },
              grid: { color: "#F4F4F5" },
              ticks: {
                color: "#71717A",
                callback: (value) => euros.format(Number(value)),
              },
            },
          },
        }}
      />
      <ul className="sr-only" aria-label="Montants encaissés par période">
        {points.map((point) => (
          <li key={point.label}>
            {point.label} : {euros.format(point.amountCents / 100)}
          </li>
        ))}
      </ul>
    </>
  );
}
