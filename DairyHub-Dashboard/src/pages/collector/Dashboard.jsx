import { useEffect, useMemo, useState } from "react";

import SummaryCard from "../../components/common/SummaryCard";
import LatestReading from "../../components/dashboard/LatestReading";
import HistoryTable from "../../components/dashboard/HistoryTable";
import Loading from "../../components/common/Loading";

import { useAuth } from "../../context/AuthContext";
import { subscribeCollectionsByCollector, toDateString } from "../../services/milkCollectionService";
import useCollectorLiveData from "../../hooks/useCollectorLiveData";
import { getSettings } from "../../services/settingsService";

export default function Dashboard() {
  const { collectorId, profile } = useAuth();
  const [records, setRecords] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const { liveData } = useCollectorLiveData(collectorId);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch((err) => console.error("Failed to load settings:", err));
  }, []);

  useEffect(() => {
    if (!collectorId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const unsubscribe = subscribeCollectionsByCollector(collectorId, (data) => {
      if (!cancelled) {
        setRecords(data);
        setLoading(false);
      }
    }, 50);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [collectorId]);

  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter((r) => toDateString(r) === today);
  const totalLiters = todayRecords.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

  const latestMilkData = useMemo(() => {
    const base = liveData || records[0];
    if (!base) return null;

    const saved = records.find(
      (record) => record.testId === base.testId || record.id === base.testId
    );

    if (!saved) return base;

    return {
      ...base,
      quantity: saved.quantity ?? base.quantity ?? 0,
    };
  }, [liveData, records]);

  const latest = latestMilkData || records[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-gray-500 mt-2">Your milk collection information</p>
      </div>

      {loading ? (
        <Loading label="Loading your deliveries..." />
      ) : !collectorId ? (
        <div className="bg-white shadow rounded-xl p-6 text-gray-500">
          Your account isn't linked to a collector profile yet. Ask the dairy hub owner to
          connect your login to your collector record.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SummaryCard label="Today's Collections" value={todayRecords.length} />
            <SummaryCard
              label="Today's Liters"
              value={`${totalLiters} L`}
              colorClass="text-blue-600"
            />
            <SummaryCard
              label="Last Status"
              value={latest?.status || "-"}
              colorClass={
                latest?.status === "Spoiled"
                  ? "text-red-600"
                  : latest?.status === "Warning"
                  ? "text-orange-500"
                  : "text-green-600"
              }
            />
          </div>

          {latestMilkData ? (
            <LatestReading milkData={latestMilkData} settings={settings} />
          ) : (
            <LatestReading milkData={records[0]} settings={settings} />
          )}

          <div>
            <h2 className="text-lg font-bold mb-4">Today's Collections</h2>
            {todayRecords.length === 0 ? (
              <div className="bg-white shadow rounded-xl p-6 text-gray-400 text-sm">
                No collections recorded today yet.
              </div>
            ) : (
              <HistoryTable records={todayRecords} showCollector={false} editableQuantity />
            )}
          </div>
        </>
      )}
    </div>
  );
}
