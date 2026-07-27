import GaugeCard from "./GaugeCard";
import { DEFAULT_THRESHOLDS } from "../../services/settingsService";

// Raw milk pH within [freshPHMin, freshPHMax] is fresh; outside it, spoilage risk rises.
export default function PHGauge({
  value,
  freshPHMin = DEFAULT_THRESHOLDS.freshPHMin,
  freshPHMax = DEFAULT_THRESHOLDS.freshPHMax,
}) {
  const color =
    value >= freshPHMin && value <= freshPHMax
      ? { colorClass: "text-green-600", strokeColor: "#16a34a" }
      : value >= freshPHMin - 0.4 && value < freshPHMax + 0.4
      ? { colorClass: "text-orange-500", strokeColor: "#f97316" }
      : { colorClass: "text-red-600", strokeColor: "#dc2626" };

  return (
    <GaugeCard
      label="pH Level"
      value={value}
      unit="pH"
      min={0}
      max={14}
      {...color}
    />
  );
}
