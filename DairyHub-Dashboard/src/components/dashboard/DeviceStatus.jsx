import { FiWifi, FiWifiOff } from "react-icons/fi";

import useDeviceStatus from "../../hooks/useDeviceStatus";

export default function DeviceStatus() {
  const { online, lastSeen, data: status } = useDeviceStatus();

  const lastSeenLabel = lastSeen
    ? new Date(lastSeen).toLocaleString()
    : "No data yet";

  return (
    <div className="bg-white rounded-xl shadow p-6 flex items-center justify-between">
      <div>
        <h3 className="text-gray-500 font-medium">
          {status?.deviceId || "ESP32 Device"}
        </h3>
        <p className="text-sm text-gray-400 mt-1">Last seen: {lastSeenLabel}</p>
        {status?.firmwareVersion && (
          <p className="text-xs text-gray-400">Firmware v{status.firmwareVersion}</p>
        )}
        {typeof status?.wifiStrength === "number" && (
          <p className="text-xs text-gray-400">WiFi: {status.wifiStrength} dBm</p>
        )}
      </div>

      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${
          online ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}
      >
        {online ? <FiWifi /> : <FiWifiOff />}
        {online ? "Online" : "Offline"}
      </div>
    </div>
  );
}
