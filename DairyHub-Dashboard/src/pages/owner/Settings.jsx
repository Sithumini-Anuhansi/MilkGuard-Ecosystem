import { useEffect, useState } from "react";
import { FiSave } from "react-icons/fi";

import Loading from "../../components/common/Loading";
import { getSettings, updateSettings } from "../../services/settingsService";
import { isWhatsAppConfigured } from "../../services/whatsappService";

const THRESHOLD_FIELDS = [
  { key: "freshPHMin", label: "Fresh pH — Min", step: "0.1" },
  { key: "freshPHMax", label: "Fresh pH — Max", step: "0.1" },
  { key: "warningGas", label: "Warning Gas (ppm)", step: "1" },
  { key: "spoiledGas", label: "Spoiled Gas (ppm)", step: "1" },
  { key: "warningTemp", label: "Warning Temperature (°C)", step: "0.1" },
  { key: "spoiledTemp", label: "Spoiled Temperature (°C)", step: "0.1" },
];

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch((err) => console.error("Failed to load settings:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleNumberChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: parseFloat(value) }));
  };

  const handleTextChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(settings);
      setSavedAt(new Date());
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <div className="bg-white shadow rounded-xl p-6 max-w-2xl">
        <h2 className="font-semibold text-gray-700 mb-1">Quality Thresholds</h2>
        <p className="text-sm text-gray-500 mb-6">
          These values drive the Fresh / Warning / Spoiled classification shown across
          the dashboard, gauges, and reports.
        </p>

        {loading || !settings ? (
          <Loading label="Loading settings..." />
        ) : (
          <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {THRESHOLD_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium mb-1">{field.label}</label>
                  <input
                    type="number"
                    step={field.step}
                    value={settings[field.key]}
                    onChange={(e) => handleNumberChange(field.key, e.target.value)}
                    className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>

            <div className="border-t pt-6 space-y-4">
              <h2 className="font-semibold text-gray-700">WhatsApp Notifications</h2>

              <div
                className={`rounded-lg px-4 py-3 text-sm ${
                  isWhatsAppConfigured()
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-amber-50 text-amber-900 border border-amber-200"
                }`}
              >
                {isWhatsAppConfigured() ? (
                  <span>WhatsApp proxy connected.</span>
                ) : (
                  <span>
                    Set <code className="text-xs">VITE_WHATSAPP_PROXY_URL</code> and{" "}
                    <code className="text-xs">VITE_WHATSAPP_PROXY_SECRET</code> in{" "}
                    <code className="text-xs">.env</code>.
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Owner WhatsApp Phone</label>
                <input
                  type="text"
                  value={settings.ownerPhone || ""}
                  onChange={(e) => handleTextChange("ownerPhone", e.target.value)}
                  className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+94771234567"
                />
              </div>

              <div className="space-y-3">
                {[
                  { key: "notifyOwnerWarning", label: "Owner WhatsApp on Warning" },
                  { key: "notifyOwnerSpoiled", label: "Owner WhatsApp on Spoiled milk" },
                  { key: "notifyOwnerDevice", label: "Owner WhatsApp when device goes offline" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!settings[key]}
                      onChange={() => handleToggle(key)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white px-5 py-3 rounded-lg font-semibold"
              >
                <FiSave /> {saving ? "Saving..." : "Save Settings"}
              </button>

              {savedAt && (
                <span className="text-sm text-gray-500">
                  Saved at {savedAt.toLocaleTimeString()}
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
