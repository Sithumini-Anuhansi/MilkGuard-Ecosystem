import { useEffect, useState } from "react";

import HistoryTable from "../../components/dashboard/HistoryTable";
import Loading from "../../components/common/Loading";
import { getAllCollections } from "../../services/milkCollectionService";

export default function MilkCollections() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getAllCollections(300);
        if (!cancelled) setRecords(data);
      } catch (err) {
        console.error("Failed to load milk collections:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Milk Collections</h1>

      {loading ? <Loading label="Loading history..." /> : <HistoryTable records={records} />}
    </div>
  );
}
