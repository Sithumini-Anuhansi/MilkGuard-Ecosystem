import GaugeCard from "./GaugeCard";
import { DEFAULT_THRESHOLDS } from "../../services/settingsService";

// Milk should stay cool; anything past the warning/spoiled temps accelerates spoilage.
export default function TemperatureGauge({
  value,
  warningTemp = DEFAULT_THRESHOLDS.warningTemp,
  spoiledTemp = DEFAULT_THRESHOLDS.spoiledTemp,
}) {
  const color =
    value < warningTemp
      ? { colorClass: "text-green-600", strokeColor: "#16a34a" }
      : value < spoiledTemp
      ? { colorClass: "text-orange-500", strokeColor: "#f97316" }
      : { colorClass: "text-red-600", strokeColor: "#dc2626" };

  return (
    <GaugeCard
      label="Temperature"
      value={value}
      unit="°C"
      min={0}
      max={50}
      {...color}
    />
  );
}
