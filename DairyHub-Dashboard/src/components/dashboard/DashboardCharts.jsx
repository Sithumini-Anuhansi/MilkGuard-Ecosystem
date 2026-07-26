import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";

import { toDateString } from "../../services/milkCollectionService";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend);

// `records` is the array of milkCollections documents (see milkCollectionService.getAllCollections)
export default function DashboardCharts({ records = [] }) {
  const dailyTotals = useMemo(() => {
    const byDate = {};

    records.forEach((r) => {
      const key = toDateString(r) || "unknown";
      byDate[key] = (byDate[key] || 0) + (Number(r.quantity) || 0);
    });

    const dates = Object.keys(byDate).sort().slice(-7);

    return {
      labels: dates,
      values: dates.map((d) => byDate[d]),
    };
  }, [records]);

  const qualityCounts = useMemo(() => {
    const counts = { Fresh: 0, Warning: 0, Spoiled: 0 };
    records.forEach((r) => {
      if (counts[r.status] !== undefined) counts[r.status] += 1;
    });
    return counts;
  }, [records]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-xl shadow p-6 lg:col-span-2">
        <h3 className="text-gray-700 font-semibold mb-4">Daily Milk Volume (L)</h3>
        <Line
          data={{
            labels: dailyTotals.labels,
            datasets: [
              {
                label: "Liters",
                data: dailyTotals.values,
                borderColor: "#2563eb",
                backgroundColor: "rgba(37, 99, 235, 0.15)",
                tension: 0.3,
                fill: true,
              },
            ],
          }}
          options={{ responsive: true, plugins: { legend: { display: false } } }}
        />
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-gray-700 font-semibold mb-4">Quality Distribution</h3>
        <Doughnut
          data={{
            labels: ["Fresh", "Warning", "Spoiled"],
            datasets: [
              {
                data: [qualityCounts.Fresh, qualityCounts.Warning, qualityCounts.Spoiled],
                backgroundColor: ["#16a34a", "#f97316", "#dc2626"],
              },
            ],
          }}
          options={{ responsive: true }}
        />
      </div>
    </div>
  );
}
