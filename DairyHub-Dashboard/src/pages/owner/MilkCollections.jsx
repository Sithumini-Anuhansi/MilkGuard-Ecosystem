import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

import HistoryTable from "../../components/dashboard/HistoryTable";
import Loading from "../../components/common/Loading";
import { subscribeAllCollections } from "../../services/milkCollectionService";

export default function MilkCollections() {
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const highlightId = searchParams.get("highlight");
  const highlightTestId = searchParams.get("testId");

  useEffect(() => {
    const unsubscribe = subscribeAllCollections((data) => {
      setRecords(data);
      setLoading(false);
    }, 300);

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Milk Collections</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Quantity can be added or edited after the device test (liters).
        </p>
      </div>

      {loading ? (
        <Loading label="Loading history..." />
      ) : (
        <HistoryTable
          records={records}
          editableQuantity
          highlightId={highlightId}
          highlightTestId={highlightTestId}
        />
      )}
    </div>
  );
}
