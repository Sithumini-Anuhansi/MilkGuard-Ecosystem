import GaugeCard from "./GaugeCard";
import { DEFAULT_THRESHOLDS } from "../../services/settingsService";

// Gas sensor reads ppm of volatile compounds; higher readings indicate spoilage.
export default function GasGauge({
  value,
  warningGas = DEFAULT_THRESHOLDS.warningGas,
  spoiledGas = DEFAULT_THRESHOLDS.spoiledGas,
}) {
  const color =
    value < warningGas
      ? { colorClass: "text-green-600", strokeColor: "#16a34a" }
      : value < spoiledGas
      ? { colorClass: "text-orange-500", strokeColor: "#f97316" }
      : { colorClass: "text-red-600", strokeColor: "#dc2626" };

  return (
    <GaugeCard
      label="Gas Level"
      value={value}
      unit="ppm"
      min={0}
      max={1000}
      {...color}
    />
  );
}
