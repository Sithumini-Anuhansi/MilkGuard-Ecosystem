// Reusable semi-circle gauge. Renders a single sensor reading with a
// colored arc that reflects how close the value is to its warning/danger zone.

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function polarToCartesian(cx, cy, radius, angleDeg) {
  const angleRad = ((angleDeg - 180) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export default function GaugeCard({
  label,
  value = 0,
  unit = "",
  min = 0,
  max = 100,
  colorClass = "text-blue-600",
  strokeColor = "#2563eb",
}) {
  const safeValue = clamp(Number(value) || 0, min, max);
  const percent = (safeValue - min) / (max - min || 1);
  const sweep = percent * 180;

  const cx = 100;
  const cy = 100;
  const radius = 80;

  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
      <h3 className="text-gray-500 font-medium mb-2">{label}</h3>

      <svg viewBox="0 0 200 110" className="w-full max-w-[220px]">
        {/* Track */}
        <path
          d={describeArc(cx, cy, radius, 0, 180)}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="14"
          strokeLinecap="round"
        />

        {/* Value arc */}
        <path
          d={describeArc(cx, cy, radius, 0, Math.max(sweep, 2))}
          fill="none"
          stroke={strokeColor}
          strokeWidth="14"
          strokeLinecap="round"
        />
      </svg>

      <p className={`text-3xl font-bold -mt-4 ${colorClass}`}>
        {value ?? 0}
        <span className="text-base font-medium text-gray-400 ml-1">{unit}</span>
      </p>

      <div className="flex justify-between w-full max-w-[220px] text-xs text-gray-400 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
