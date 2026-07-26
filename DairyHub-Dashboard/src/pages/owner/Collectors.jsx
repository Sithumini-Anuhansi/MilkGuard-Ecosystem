import { useEffect, useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiUsers, FiUserCheck, FiUserX } from "react-icons/fi";

import Loading from "../../components/common/Loading";
import CollectorPerformanceChart from "../../components/dashboard/CollectorPerformanceChart";

import {
  getCollectors,
  addCollector,
  updateCollector,
  deleteCollector,
} from "../../services/collectorService";
import { getAllCollections } from "../../services/milkCollectionService";

const emptyForm = {
  name: "",
  nic: "",
  phone: "",
  email: "",
  password: "",
  address: "",
  village: "",
  rfidUID: "",
  vehicleNumber: "",
};

export default function Collectors() {
  const [collectors, setCollectors] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadCollectors = async () => {
    setLoading(true);
    try {
      const [collectorData, collectionData] = await Promise.all([
        getCollectors(),
        getAllCollections(300),
      ]);
      setCollectors(collectorData);
      setRecords(collectionData);
    } catch (err) {
      console.error("Failed to load collectors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollectors();
  }, []);

  // Calculate status counts
  const activeCount = collectors.filter((c) => c.status === "ACTIVE").length;
  const inactiveCount = collectors.filter((c) => c.status === "INACTIVE").length;

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (collector) => {
    setEditingId(collector.id);
    setForm({
      name: collector.name || "",
      nic: collector.nic || "",
      phone: collector.phone || "",
      email: collector.email || "",
      password: "",
      address: collector.address || "",
      village: collector.village || "",
      rfidUID: collector.rfidUID || "",
      vehicleNumber: collector.vehicleNumber || "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.rfidUID.trim() || !form.email.trim()) {
      setError("Name, email, and RFID card are required.");
      return;
    }

    if (!editingId && form.password.trim().length < 6) {
      setError("Password must be at least 6 characters — this becomes the collector's login.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const { password, ...updates } = form;
        await updateCollector(editingId, updates);
      } else {
        await addCollector(form);
      }

      setShowModal(false);
      await loadCollectors();
    } catch (err) {
      console.error("Failed to save collector:", err);
      setError(
        err?.code === "auth/email-already-in-use"
          ? "That email already has a login account."
          : "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (collector) => {
    if (!window.confirm(`Remove ${collector.name} from collectors? This also removes their login.`))
      return;

    try {
      await deleteCollector(collector.id);
      await loadCollectors();
    } catch (err) {
      console.error("Failed to delete collector:", err);
    }
  };

  const toggleStatus = async (collector) => {
    const nextStatus = collector.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await updateCollector(collector.id, { status: nextStatus });
      await loadCollectors();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Collectors</h1>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:to-sky-700 text-white px-4 py-2 rounded-lg font-semibold"
        >
          <FiPlus /> Add Collector
        </button>
      </div>

      {/* Top Section: 4-col (Stats Container) / 8-col (Performance Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Collector Stats Container */}
        <div className="lg:col-span-4 bg-white shadow rounded-xl p-5 flex flex-col justify-between space-y-4">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Collector Summary
          </h2>

          <div className="grid grid-cols-1 gap-3 flex-1 justify-center">
            {/* Total Collectors */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium">Total Collectors</p>
                <p className="text-2xl font-bold text-blue-900">{collectors.length}</p>
              </div>
              <div className="p-2.5 bg-blue-600 text-white rounded-lg">
                <FiUsers size={20} />
              </div>
            </div>

            {/* Active Collectors */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-medium">Active Collectors</p>
                <p className="text-2xl font-bold text-emerald-900">{activeCount}</p>
              </div>
              <div className="p-2.5 bg-emerald-600 text-white rounded-lg">
                <FiUserCheck size={20} />
              </div>
            </div>

            {/* Inactive Collectors */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Inactive Collectors</p>
                <p className="text-2xl font-bold text-gray-800">{inactiveCount}</p>
              </div>
              <div className="p-2.5 bg-gray-500 text-white rounded-lg">
                <FiUserX size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Collector Performance Chart */}
        <div className="lg:col-span-8">
          {!loading && <CollectorPerformanceChart records={records} />}
        </div>
      </div>

      {/* Collectors Table */}
      <div className="bg-white shadow rounded-xl p-6">
        {loading ? (
          <Loading label="Loading collectors..." />
        ) : collectors.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No collectors added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-gray-500 border-b">
                <tr>
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Village</th>
                  <th className="py-2 pr-4">RFID Card</th>
                  <th className="py-2 pr-4">Vehicle</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {collectors.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-mono text-xs text-gray-500">{c.collectorId || c.id}</td>
                    <td className="py-3 pr-4 font-medium">{c.name}</td>
                    <td className="py-3 pr-4">{c.phone || "-"}</td>
                    <td className="py-3 pr-4">{c.village || "-"}</td>
                    <td className="py-3 pr-4 font-mono">{c.rfidUID}</td>
                    <td className="py-3 pr-4">{c.vehicleNumber || "-"}</td>
                    <td className="py-3 pr-4">
                      <button
                        onClick={() => toggleStatus(c)}
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          c.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {c.status}
                      </button>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => openEditModal(c)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <FiX size={20} />
            </button>

            <h2 className="text-xl font-bold mb-1">
              {editingId ? "Edit Collector" : "Add Collector"}
            </h2>
            {!editingId && (
              <p className="text-sm text-gray-500 mb-5">
                This creates a real login for the collector — share the email and password with them.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Silva"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">NIC</label>
                  <input
                    type="text"
                    value={form.nic}
                    onChange={(e) => setForm({ ...form, nic: e.target.value })}
                    className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="200112345678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+94771234567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email (login)</label>
                  <input
                    type="email"
                    value={form.email}
                    disabled={!!editingId}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="john@gmail.com"
                  />
                </div>

                {!editingId && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Password (login)</label>
                    <input
                      type="text"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="At least 6 characters"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Village</label>
                  <input
                    type="text"
                    value={form.village}
                    onChange={(e) => setForm({ ...form, village: e.target.value })}
                    className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Wariyapola"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="No.12, Main Street"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">RFID Card UID</label>
                  <input
                    type="text"
                    value={form.rfidUID}
                    onChange={(e) => setForm({ ...form, rfidUID: e.target.value })}
                    className="w-full border rounded-lg p-3 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="8A3F91BC"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={form.vehicleNumber}
                    onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                    className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="CAB-1234"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-100 text-red-700 p-3 text-sm">{error}</div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:to-sky-700 disabled:opacity-50 text-white rounded-lg py-3 font-semibold transition"
              >
                {saving ? "Saving..." : editingId ? "Save Changes" : "Add Collector"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}