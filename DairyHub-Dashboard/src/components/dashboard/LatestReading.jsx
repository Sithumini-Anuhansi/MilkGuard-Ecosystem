import PHGauge from "../dashboard/PHGauge";
import GasGauge from "../dashboard/GasGauge";
import TemperatureGauge from "../dashboard/TemperatureGauge";

const STATUS_STYLES = {
  Fresh: "text-green-600",
  Warning: "text-orange-500",
  Spoiled: "text-red-600",
  Unknown: "text-gray-500",
};

export default function LatestReading({ milkData, settings }) {
  if (!milkData) {
    return (
      <div className="bg-blue-200 shadow rounded-xl p-6">
        <h2 className="text-xl font-bold mb-2">Latest Milk Test</h2>
        <p className="text-gray-500">Waiting for a live reading from the device...</p>
      </div>
    );
  }

  return (
    <div className="bg-blue-200 shadow rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold">Latest Milk Test</h2>
        {milkData.testId && (
          <span className="text-xs font-mono text-gray-600 bg-white/60 px-2 py-1 rounded">
            {milkData.testId}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
        <div>
          <p className="text-gray-500">Collector</p>
          <p className="font-semibold">{milkData.collectorName || "-"}</p>
        </div>

        <div>
          <p className="text-gray-500">RFID</p>
          <p className="font-semibold font-mono text-sm">{milkData.rfidUID || "-"}</p>
        </div>

        <div>
          <p className="text-gray-500">Quantity</p>
          <p className="font-semibold">{Number(milkData.quantity) || 0} L</p>
        </div>

        <div>
          <p className="text-gray-500">Status</p>
          <p className={`font-bold ${STATUS_STYLES[milkData.status] || "text-gray-600"}`}>
            {milkData.status || "-"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 border-t border-gray-100 bg-blue-100">
        <PHGauge
          value={milkData.pH}
          freshPHMin={settings?.freshPHMin}
          freshPHMax={settings?.freshPHMax}
        />
        <GasGauge
          value={milkData.gas}
          warningGas={settings?.warningGas}
          spoiledGas={settings?.spoiledGas}
        />
        <TemperatureGauge
          value={milkData.temperature}
          warningTemp={settings?.warningTemp}
          spoiledTemp={settings?.spoiledTemp}
        />
      </div>
    </div>
  );
}
