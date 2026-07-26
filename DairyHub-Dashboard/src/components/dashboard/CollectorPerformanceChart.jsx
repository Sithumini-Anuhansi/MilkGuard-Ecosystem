import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// `records` is the array of milkCollections documents. Lives on the
// Collectors page rather than the main Dashboard, since it's collector-scoped.
export default function CollectorPerformanceChart({ records = [] }) {
  const collectorTotals = useMemo(() => {
    const byCollector = {};

    records.forEach((r) => {
      const name = r.collectorName || "Unknown";
      byCollector[name] = (byCollector[name] || 0) + (Number(r.quantity) || 0);
    });

    const sorted = Object.entries(byCollector).sort((a, b) => b[1] - a[1]).slice(0, 8);

    return {
      labels: sorted.map(([name]) => name),
      values: sorted.map(([, total]) => total),
    };
  }, [records]);

  if (records.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-gray-700 font-semibold mb-4">Collector Performance (L)</h3>
      <Bar
        data={{
          labels: collectorTotals.labels,
          datasets: [
            {
              label: "Liters delivered",
              data: collectorTotals.values,
              backgroundColor: "#2563eb",
              borderRadius: 6,
            },
          ],
        }}
        options={{ responsive: true, plugins: { legend: { display: false } } }}
      />
    </div>
  );
}
