// Generic stat card used across owner pages (Collectors count, Reports totals, etc.)
export default function SummaryCard({ label, value, colorClass = "text-blue-600", icon }) {
  return (
    <div className="bg-white rounded-xl shadow p-6 flex items-center justify-between">
      <div>
        <h3 className="text-gray-500">{label}</h3>
        <p className={`text-3xl font-bold mt-1 ${colorClass}`}>{value}</p>
      </div>

      {icon && <div className={`text-3xl ${colorClass}`}>{icon}</div>}
    </div>
  );
}
