import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

import HistoryTable from "../../components/dashboard/HistoryTable";
import Loading from "../../components/common/Loading";

import { useAuth } from "../../context/AuthContext";
import { subscribeCollectionsByCollector } from "../../services/milkCollectionService";

export default function History() {
  const { collectorId } = useAuth();
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const highlightId = searchParams.get("highlight");
  const highlightTestId = searchParams.get("testId");

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
    }, 200);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [collectorId]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Delivery History</h1>
      <p className="text-gray-500 text-sm">
        Edit quantity (liters) for each collection after testing.
      </p>

      {loading ? (
        <Loading label="Loading history..." />
      ) : (
        <HistoryTable
          records={records}
          showCollector={false}
          editableQuantity
          highlightId={highlightId}
          highlightTestId={highlightTestId}
        />
      )}
    </div>
  );
}
