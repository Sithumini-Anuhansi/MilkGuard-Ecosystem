import { useEffect, useMemo, useState } from "react";
import { FiSearch, FiEdit2, FiCheck, FiX } from "react-icons/fi";
import { toDateString, updateCollectionQuantity } from "../../services/milkCollectionService";

const STATUS_STYLES = {
  Fresh: "bg-green-100 text-green-700",
  Warning: "bg-orange-100 text-orange-700",
  Spoiled: "bg-red-100 text-red-700",
  Unknown: "bg-gray-100 text-gray-600",
};

export default function HistoryTable({
  records = [],
  showCollector = true,
  editableQuantity = false,
  highlightId = null,
  highlightTestId = null,
  onQuantityUpdated,
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [editQty, setEditQty] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeHighlightId, setActiveHighlightId] = useState(null);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchesStatus = statusFilter === "All" || r.status === statusFilter;
      const matchesSearch =
        !search ||
        r.collectorName?.toLowerCase().includes(search.toLowerCase()) ||
        r.rfidUID?.toLowerCase().includes(search.toLowerCase()) ||
        r.testId?.toLowerCase().includes(search.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [records, search, statusFilter]);

  useEffect(() => {
    if (!highlightId && !highlightTestId) return;

    const targetId =
      highlightId ||
      records.find((record) => record.testId === highlightTestId)?.id;

    if (!targetId) return;

    setActiveHighlightId(targetId);

    const timer = window.setTimeout(() => {
      const row = document.getElementById(`collection-row-${targetId}`);
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);

    const clearTimer = window.setTimeout(() => setActiveHighlightId(null), 4000);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clearTimer);
    };
  }, [highlightId, highlightTestId, records]);

  const startEdit = (record) => {
    setEditingId(record.id);
    setEditQty(String(record.quantity || 0));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditQty("");
  };

  const saveQuantity = async (recordId) => {
    setSaving(true);
    try {
      await updateCollectionQuantity(recordId, editQty);
      setEditingId(null);
      onQuantityUpdated?.();
    } catch (err) {
      console.error("Failed to update quantity:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-4">
        <div className="relative w-full sm:w-72">
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search collector, RFID, test ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">All statuses</option>
          <option value="Fresh">Fresh</option>
          <option value="Warning">Warning</option>
          <option value="Spoiled">Spoiled</option>
          <option value="Unknown">Unknown</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-gray-500 border-b">
            <tr>
              <th className="py-2 pr-4">Date</th>
              {showCollector && <th className="py-2 pr-4">Collector</th>}
              <th className="py-2 pr-4">Test ID</th>
              <th className="py-2 pr-4">Quantity</th>
              <th className="py-2 pr-4">pH</th>
              <th className="py-2 pr-4">Gas</th>
              <th className="py-2 pr-4">Temp</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={showCollector ? 8 : 7}
                  className="py-6 text-center text-gray-400"
                >
                  No records found.
                </td>
              </tr>
            )}

            {filtered.map((r) => (
              <tr
                key={r.id}
                id={`collection-row-${r.id}`}
                data-test-id={r.testId || ""}
                className={`border-b last:border-0 transition-colors ${
                  activeHighlightId === r.id ? "bg-blue-50 ring-2 ring-inset ring-blue-400" : ""
                }`}
              >
                <td className="py-3 pr-4">{toDateString(r)}</td>
                {showCollector && <td className="py-3 pr-4">{r.collectorName}</td>}
                <td className="py-3 pr-4 font-mono text-xs">{r.testId || "-"}</td>
                <td className="py-3 pr-4">
                  {editableQuantity && editingId === r.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                        className="w-16 border rounded px-1 py-0.5 text-sm"
                      />
                      <button
                        onClick={() => saveQuantity(r.id)}
                        disabled={saving}
                        className="text-green-600 hover:text-green-800"
                      >
                        <FiCheck />
                      </button>
                      <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                        <FiX />
                      </button>
                    </div>
                  ) : (
                    <span className="flex items-center gap-2">
                      {r.quantity || 0} L
                      {editableQuantity && (
                        <button
                          onClick={() => startEdit(r)}
                          className="text-blue-500 hover:text-blue-700"
                          title="Edit quantity"
                        >
                          <FiEdit2 size={14} />
                        </button>
                      )}
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4">{r.pH}</td>
                <td className="py-3 pr-4">{r.gas} ppm</td>
                <td className="py-3 pr-4">{r.temperature} °C</td>
                <td className="py-3 pr-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      STATUS_STYLES[r.status] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
