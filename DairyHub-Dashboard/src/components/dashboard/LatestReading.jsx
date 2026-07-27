import PHGauge from "../dashboard/PHGauge";
import GasGauge from "../dashboard/GasGauge";
import TemperatureGauge from "../dashboard/TemperatureGauge";

export default function LatestReading({ milkData, settings }) {
  return (
    <div className="bg-blue-200 shadow rounded-xl p-6">
      <h2 className="text-xl font-bold mb-5">Latest Milk Test</h2>

      {/* Main Info */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        <div>
          <p className="text-gray-500">Collector</p>
          <p className="font-semibold">{milkData?.collectorName || "-"}</p>
        </div>

        <div>
          <p className="text-gray-500">RFID</p>
          <p className="font-semibold">{milkData?.rfidUID || "-"}</p>
        </div>

        <div>
          <p className="text-gray-500">Quantity</p>
          <p className="font-semibold">{milkData?.quantity || 0} L</p>
        </div>
      </div>

      {/* Sensor Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 border-t border-gray-100 bg-blue-100">
        <PHGauge
          value={milkData?.pH}
          freshPHMin={settings?.freshPHMin}
          freshPHMax={settings?.freshPHMax}
        />
        <GasGauge
          value={milkData?.gas}
          warningGas={settings?.warningGas}
          spoiledGas={settings?.spoiledGas}
        />
        <TemperatureGauge
          value={milkData?.temperature}
          warningTemp={settings?.warningTemp}
          spoiledTemp={settings?.spoiledTemp}
        />
      </div>
    </div>
  );
}