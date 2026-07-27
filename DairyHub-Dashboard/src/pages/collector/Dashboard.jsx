import { useEffect, useState } from "react";

import SummaryCard from "../../components/common/SummaryCard";
import LatestReading from "../../components/dashboard/LatestReading";
import Loading from "../../components/common/Loading";

import { useAuth } from "../../context/AuthContext";
import { getCollectionsByCollector } from "../../services/milkCollectionService";

export default function Dashboard() {
  const { collectorId } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!collectorId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const data = await getCollectionsByCollector(collectorId, 50);
        if (!cancelled) setRecords(data);
      } catch (err) {
        console.error("Failed to load collector deliveries:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [collectorId]);

  const totalLiters = records.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  const latest = records[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Collector Dashboard</h1>
        <p className="text-gray-500 mt-2">Your milk delivery information</p>
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
            <SummaryCard label="Total Deliveries" value={records.length} />
            <SummaryCard label="Total Liters" value={`${totalLiters} L`} colorClass="text-blue-600" />
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

          <LatestReading milkData={latest} />
        </>
      )}
    </div>
  );
}
