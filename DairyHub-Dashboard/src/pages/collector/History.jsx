import { useEffect, useState } from "react";

import HistoryTable from "../../components/dashboard/HistoryTable";
import Loading from "../../components/common/Loading";

import { useAuth } from "../../context/AuthContext";
import { getCollectionsByCollector } from "../../services/milkCollectionService";

export default function History() {
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
        const data = await getCollectionsByCollector(collectorId, 200);
        if (!cancelled) setRecords(data);
      } catch (err) {
        console.error("Failed to load delivery history:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [collectorId]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Delivery History</h1>

      {loading ? (
        <Loading label="Loading history..." />
      ) : (
        <HistoryTable records={records} showCollector={false} />
      )}
    </div>
  );
}
