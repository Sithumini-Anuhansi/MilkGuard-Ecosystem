import { useEffect, useState } from "react";
import { FiUser, FiPhone, FiCreditCard, FiMail, FiMapPin, FiTruck, FiEdit2, FiSave, FiX, FiBell } from "react-icons/fi";

import Loading from "../../components/common/Loading";
import { useAuth } from "../../context/AuthContext";
import { getCollectorById, updateCollector } from "../../services/collectorService";
import { normalizePhone, isValidPhone } from "../../utils/phoneUtils";

const FIELD_ROWS = [
  { key: "name", label: "Name", icon: FiUser, editable: true },
  { key: "email", label: "Email", icon: FiMail, editable: false },
  { key: "phone", label: "WhatsApp Phone", icon: FiPhone, editable: true },
  { key: "rfidUID", label: "RFID Card", icon: FiCreditCard, editable: false, mono: true },
  { key: "village", label: "Village", icon: FiMapPin, editable: true },
  { key: "address", label: "Address", icon: FiMapPin, editable: true },
  { key: "vehicleNumber", label: "Vehicle", icon: FiTruck, editable: true },
];

export default function Profile() {
  const { user } = useAuth();
  const [collector, setCollector] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    getCollectorById(user.uid)
      .then((data) => {
        setCollector(data);
        setForm(data || {});
      })
      .catch((err) => console.error("Failed to load profile:", err))
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const startEditing = () => {
    setForm(collector);
    setError("");
    setEditing(true);
  };

  const cancelEditing = () => {
    setForm(collector);
    setError("");
    setEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const phone = normalizePhone(form.phone);
    if (phone && !isValidPhone(phone)) {
      setError("Enter a valid Sri Lankan mobile number (e.g. +94702691992).");
      setSaving(false);
      return;
    }

    try {
      await updateCollector(user.uid, {
        name: form.name,
        phone,
        village: form.village,
        address: form.address,
        vehicleNumber: form.vehicleNumber,
        whatsappEnabled: !!form.whatsappEnabled,
        notifyOnDeviceOffline: !!form.notifyOnDeviceOffline,
      });

      const updated = {
        ...collector,
        ...form,
        phone,
      };
      setCollector(updated);
      setForm(updated);
      setEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError(err?.message || "Couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Profile</h1>

        {collector && !editing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-semibold"
          >
            <FiEdit2 /> Edit
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded-xl p-6">
        {loading ? (
          <Loading label="Loading profile..." />
        ) : !collector ? (
          <p className="text-gray-500">
            Your account isn't linked to a collector record yet. Ask the dairy hub owner to
            check your collector profile.
          </p>
        ) : editing ? (
          <form onSubmit={handleSave} className="space-y-5 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">WhatsApp Phone</label>
                <input
                  type="text"
                  value={form.phone || ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+94702691992"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Used for milk test WhatsApp alerts. Include country code +94.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Village</label>
                <input
                  type="text"
                  value={form.village || ""}
                  onChange={(e) => setForm({ ...form, village: e.target.value })}
                  className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={form.address || ""}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Vehicle Number</label>
                <input
                  type="text"
                  value={form.vehicleNumber || ""}
                  onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                  className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="border-t pt-5 space-y-3">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <FiBell /> Notification Settings
              </h3>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.whatsappEnabled !== false}
                  onChange={(e) => setForm({ ...form, whatsappEnabled: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">
                  Receive WhatsApp for my milk tests (Fresh, Warning, Spoiled)
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.notifyOnDeviceOffline !== false}
                  onChange={(e) =>
                    setForm({ ...form, notifyOnDeviceOffline: e.target.checked })
                  }
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">
                  Notify me when the device goes offline while I am using it
                </span>
              </label>
            </div>

            {error && <div className="rounded-lg bg-red-100 text-red-700 p-3 text-sm">{error}</div>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold"
              >
                <FiSave /> {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={cancelEditing}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-lg font-semibold"
              >
                <FiX /> Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5 max-w-2xl">
              {FIELD_ROWS.map(({ key, label, icon: Icon, mono }) => (
                <div key={key} className="flex items-center gap-4">
                  <Icon className="text-blue-600 shrink-0" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className={`font-semibold ${mono ? "font-mono" : ""}`}>
                      {(key === "email" ? user?.email : collector[key]) || "-"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t max-w-2xl space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium">WhatsApp milk alerts:</span>{" "}
                {collector.whatsappEnabled !== false ? "Enabled" : "Disabled"}
              </p>
              <p>
                <span className="font-medium">Device offline alerts:</span>{" "}
                {collector.notifyOnDeviceOffline !== false ? "Enabled" : "Disabled"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
