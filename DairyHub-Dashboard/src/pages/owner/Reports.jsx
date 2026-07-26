import { useEffect, useState } from "react";
import { FiFileText, FiDownload } from "react-icons/fi";

import HistoryTable from "../../components/dashboard/HistoryTable";
import Loading from "../../components/common/Loading";

import { useAuth } from "../../context/AuthContext";
import { getCollectors } from "../../services/collectorService";
import {
  getReportData,
  exportToPDF,
  exportToExcel,
  exportToCSV,
} from "../../services/reportService";

const PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function Reports() {
  const { role } = useAuth();
  const [period, setPeriod] = useState("daily");
  const [collectorId, setCollectorId] = useState("");
  const [collectors, setCollectors] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCollectors().then(setCollectors).catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await getReportData(period, collectorId || null);
        if (!cancelled) setRecords(data);
      } catch (err) {
        console.error("Failed to load report data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [period, collectorId]);

  const reportTitle = `MilkGuard_${period}_report`;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reports</h1>

      <div className="bg-white shadow rounded-xl p-6 flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Collector</label>
            <select
              value={collectorId}
              onChange={(e) => setCollectorId(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">All collectors</option>
              {collectors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => exportToPDF(records, reportTitle, role)}
            disabled={records.length === 0}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg font-semibold"
          >
            <FiFileText /> PDF
          </button>

          <button
            onClick={() => exportToExcel(records, reportTitle, role)}
            disabled={records.length === 0}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg font-semibold"
          >
            <FiDownload /> Excel
          </button>

          <button
            onClick={() => exportToCSV(records, reportTitle, role)}
            disabled={records.length === 0}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white px-4 py-2 rounded-lg font-semibold"
          >
            <FiDownload /> CSV
          </button>
        </div>
      </div>

      {loading ? <Loading label="Building report..." /> : <HistoryTable records={records} />}
    </div>
  );
}
