import { FiWifi, FiWifiOff } from "react-icons/fi";

import useDeviceStatus from "../../hooks/useDeviceStatus";
import LiveAlertBanner from "./LiveAlertBanner";

const STATUS_CARD_STYLES = {
  Spoiled: "bg-red-50 text-red-800 border-red-200",
  Warning: "bg-orange-50 text-orange-800 border-orange-200",
  Fresh: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Unknown: "bg-sky-50 text-sky-800 border-sky-200",
};

function statusCardStyle(status) {
  return STATUS_CARD_STYLES[status] || "bg-sky-50 text-sky-700 border-sky-200";
}

const CARD_BASE =
  "rounded-xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/80 shadow-sm p-4";

export default function LiveDeviceState({ latestStatus, currentCollector }) {
  const { online, lastSeen, data: deviceStatus } = useDeviceStatus();

  const lastSeenLabel = lastSeen
    ? new Date(lastSeen).toLocaleString()
    : "No data yet";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Active collector */}
        <div className={CARD_BASE}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
              Active Collector
            </p>
            {currentCollector?.name && (
              <span className="shrink-0 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                Identified
              </span>
            )}
          </div>
          {currentCollector?.name ? (
            <>
              <p className="font-semibold text-gray-800 mt-1.5 leading-tight">
                {currentCollector.name}
              </p>
              <p className="text-xs font-mono text-blue-400/90 mt-0.5">
                {currentCollector.rfidUID || "—"}
              </p>
            </>
          ) : (
            <p className="text-sm text-blue-400/80 mt-1.5">No collector scanned yet</p>
          )}
        </div>

        {/* Latest milk status */}
        <div
          className={`rounded-xl border p-4 shadow-sm ${statusCardStyle(latestStatus?.status)}`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
            Latest Result
          </p>
          {latestStatus?.message ? (
            <>
              <p className="font-semibold mt-1 leading-tight">
                {latestStatus.status || "Status"}
              </p>
              <p className="text-xs mt-0.5 opacity-90 line-clamp-2">{latestStatus.message}</p>
            </>
          ) : (
            <p className="text-sm opacity-70 mt-1.5">Waiting for a milk test...</p>
          )}
        </div>

        {/* Device connectivity */}
        <div className={CARD_BASE}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
                Device
              </p>
              <p className="font-semibold text-gray-800 mt-1.5 leading-tight truncate">
                {deviceStatus?.deviceId || "ESP32 Device"}
              </p>
              <p className="text-xs text-blue-400/90 mt-0.5 truncate">Last seen: {lastSeenLabel}</p>
            </div>
            <span
              className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                online
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {online ? <FiWifi size={14} /> : <FiWifiOff size={14} />}
              {online ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      <LiveAlertBanner />
    </div>
  );
}
