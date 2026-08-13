import { useEffect, useMemo, useState } from "react";
import { FiCalendar, FiFileText, FiDownload } from "react-icons/fi";

import HistoryTable from "../../components/dashboard/HistoryTable";
import Loading from "../../components/common/Loading";

import { useAuth } from "../../context/AuthContext";
import { getCollectors } from "../../services/collectorService";
import {
  getReportData,
  formatReportRange,
  exportToPDF,
  exportToExcel,
  exportToCSV,
} from "../../services/reportService";

const PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthISO() {
  return new Date().toISOString().slice(0, 7);
}

function referenceDateForPeriod(period, dayValue, monthValue) {
  if (period === "monthly") {
    const [year, month] = monthValue.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }

  const [year, month, day] = dayValue.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export default function Reports() {
  const { role } = useAuth();
  const [period, setPeriod] = useState("daily");
  const [collectorId, setCollectorId] = useState("");
  const [dayValue, setDayValue] = useState(todayISO);
  const [monthValue, setMonthValue] = useState(monthISO);
  const [collectors, setCollectors] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const referenceDate = useMemo(
    () => referenceDateForPeriod(period, dayValue, monthValue),
    [period, dayValue, monthValue]
  );

  const rangeLabel = useMemo(
    () => formatReportRange(period, referenceDate),
    [period, referenceDate]
  );

  useEffect(() => {
    getCollectors().then(setCollectors).catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await getReportData(period, collectorId || null, referenceDate);
        if (!cancelled) setRecords(data);
      } catch (err) {
        console.error("Failed to load report data:", err);
        if (!cancelled) setRecords([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [period, collectorId, referenceDate]);

  const collectorLabel =
    collectors.find((c) => c.collectorId === collectorId)?.name || "All collectors";
  const reportTitle = `MilkGuard_${period}_${collectorLabel.replace(/\s+/g, "_")}`;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reports</h1>

      <div className="bg-white shadow rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="border rounded-lg px-3 py-2 min-w-[120px]"
              >
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {period === "daily" && "Select day"}
                {period === "weekly" && "Select week"}
                {period === "monthly" && "Select month"}
              </label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                {period === "monthly" ? (
                  <input
                    type="month"
                    value={monthValue}
                    onChange={(e) => setMonthValue(e.target.value)}
                    className="border rounded-lg pl-9 pr-3 py-2"
                  />
                ) : (
                  <input
                    type="date"
                    value={dayValue}
                    onChange={(e) => setDayValue(e.target.value)}
                    className="border rounded-lg pl-9 pr-3 py-2"
                  />
                )}
              </div>
              {period === "weekly" && (
                <p className="text-xs text-gray-400 mt-1">Pick any day in the week</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Collector</label>
              <select
                value={collectorId}
                onChange={(e) => setCollectorId(e.target.value)}
                className="border rounded-lg px-3 py-2 min-w-[180px]"
              >
                <option value="">All collectors</option>
                {collectors.map((c) => (
                  <option key={c.id} value={c.collectorId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
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

        <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          Showing <span className="font-semibold">{records.length}</span> record
          {records.length === 1 ? "" : "s"} for{" "}
          <span className="font-semibold">{rangeLabel}</span>
          {collectorId ? (
            <>
              {" "}
              · <span className="font-semibold">{collectorLabel}</span>
            </>
          ) : (
            " · all collectors"
          )}
        </p>
      </div>

      {loading ? <Loading label="Building report..." /> : <HistoryTable records={records} />}
    </div>
  );
}
