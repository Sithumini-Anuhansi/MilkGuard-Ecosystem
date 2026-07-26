import { useEffect, useState } from "react";

import DashboardCards from "../../components/dashboard/DashboardCards";
import LatestReading from "../../components/dashboard/LatestReading";
import DeviceStatus from "../../components/dashboard/DeviceStatus";
import LiveAlertBanner from "../../components/dashboard/LiveAlertBanner";
import DashboardCharts from "../../components/dashboard/DashboardCharts";
import Loading from "../../components/common/Loading";

import useRealtimeMilkData from "../../hooks/useRealtimeMilkData";
import useAutoLogCollection from "../../hooks/useAutoLogCollection";

import { getTodaySummary } from "../../services/dashboardService";
import { getAllCollections } from "../../services/milkCollectionService";
import { getSettings } from "../../services/settingsService";

export default function Dashboard() {
  const milkData = useRealtimeMilkData();

  // Mirrors every new ESP32 reading into Firestore history and raises alerts.
  useAutoLogCollection();

  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [summaryData, history, thresholds] = await Promise.all([
          getTodaySummary(),
          getAllCollections(100),
          getSettings(),
        ]);

        if (!cancelled) {
          setSummary(summaryData);
          setRecords(history);
          setSettings(thresholds);
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [milkData]); // refresh summary/history whenever a new live reading comes in

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">MilkGuard Dashboard</h1>
        <p className="text-gray-500 mt-2">Real-time milk quality monitoring</p>
      </div>

      {/* Instant ESP32-pushed alert, if any */}
      <LiveAlertBanner />

      {/* Summary Cards */}
      <DashboardCards summary={summary} />

      {/* Status + Device */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DeviceStatus />
      </div>

      {/* Latest Reading */}
      <LatestReading milkData={milkData} />

      {/* Analytics */}
      {loading ? <Loading label="Loading analytics..." /> : <DashboardCharts records={records} />}
    </div>
  );
}
