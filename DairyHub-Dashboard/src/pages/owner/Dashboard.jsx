import { useEffect, useMemo, useState } from "react";

import DashboardCards from "../../components/dashboard/DashboardCards";
import LatestReading from "../../components/dashboard/LatestReading";
import DashboardCharts from "../../components/dashboard/DashboardCharts";
import Loading from "../../components/common/Loading";
import LiveDeviceState from "../../components/dashboard/LiveDeviceState";

import useRealtimeMilkData from "../../hooks/useRealtimeMilkData";
import useLiveDeviceState from "../../hooks/useLiveDeviceState";

import { computeTodaySummary } from "../../services/dashboardService";
import { subscribeAllCollections } from "../../services/milkCollectionService";
import { getSettings } from "../../services/settingsService";

export default function Dashboard() {
  const milkData = useRealtimeMilkData();
  const { latestStatus, currentCollector } = useLiveDeviceState();

  const [records, setRecords] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const summary = useMemo(() => computeTodaySummary(records), [records]);

  /** RTDB live test + Firestore quantity (manual edits live in milkCollections). */
  const latestMilkData = useMemo(() => {
    if (!milkData) return null;

    const saved = records.find(
      (record) => record.testId === milkData.testId || record.id === milkData.testId
    );

    if (!saved) return milkData;

    return {
      ...milkData,
      quantity: saved.quantity ?? milkData.quantity ?? 0,
    };
  }, [milkData, records]);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch((err) => console.error("Failed to load settings:", err));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAllCollections((history) => {
      setRecords(history);
      setLoading(false);
    }, 100);

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">MilkGuard Dashboard</h1>
        <p className="text-gray-500 mt-2">Real-time milk quality monitoring</p>
      </div>

      <LiveDeviceState latestStatus={latestStatus} currentCollector={currentCollector} />

      <DashboardCards summary={summary} />

      <LatestReading milkData={latestMilkData} settings={settings} />

      {loading ? <Loading label="Loading analytics..." /> : <DashboardCharts records={records} />}
    </div>
  );
}
