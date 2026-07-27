import { useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { toDateString } from "../../services/milkCollectionService";

const STATUS_STYLES = {
  Fresh: "bg-green-100 text-green-700",
  Warning: "bg-orange-100 text-orange-700",
  Spoiled: "bg-red-100 text-red-700",
};

// `records` is an array of milkCollections documents.
// `showCollector` hides the collector column for the collector-facing history view.
export default function HistoryTable({ records = [], showCollector = true }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchesStatus = statusFilter === "All" || r.status === statusFilter;
      const matchesSearch =
        !search ||
        r.collectorName?.toLowerCase().includes(search.toLowerCase()) ||
        r.rfidUID?.toLowerCase().includes(search.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [records, search, statusFilter]);

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-4">
        <div className="relative w-full sm:w-72">
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search collector or RFID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">All statuses</option>
          <option value="Fresh">Fresh</option>
          <option value="Warning">Warning</option>
          <option value="Spoiled">Spoiled</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-gray-500 border-b">
            <tr>
              <th className="py-2 pr-4">Date</th>
              {showCollector && <th className="py-2 pr-4">Collector</th>}
              <th className="py-2 pr-4">Quantity</th>
              <th className="py-2 pr-4">pH</th>
              <th className="py-2 pr-4">Gas</th>
              <th className="py-2 pr-4">Temp</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={showCollector ? 7 : 6} className="py-6 text-center text-gray-400">
                  No records found.
                </td>
              </tr>
            )}

            {filtered.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-3 pr-4">{toDateString(r)}</td>
                {showCollector && <td className="py-3 pr-4">{r.collectorName}</td>}
                <td className="py-3 pr-4">{r.quantity} L</td>
                <td className="py-3 pr-4">{r.pH}</td>
                <td className="py-3 pr-4">{r.gas} ppm</td>
                <td className="py-3 pr-4">{r.temperature} °C</td>
                <td className="py-3 pr-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[r.status] || "bg-gray-100 text-gray-600"}`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
