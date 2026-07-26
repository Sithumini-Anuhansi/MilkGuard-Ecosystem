export default function DashboardCards({ summary }) {
  const { totalLiters = 0, fresh = 0, warning = 0, spoiled = 0 } = summary || {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-gray-500">Today's Milk</h3>
        <p className="text-3xl font-bold text-blue-600">{totalLiters} L</p>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-gray-500">Fresh Samples</h3>
        <p className="text-3xl font-bold text-green-600">{fresh}</p>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-gray-500">Warning</h3>
        <p className="text-3xl font-bold text-orange-500">{warning}</p>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-gray-500">Spoiled</h3>
        <p className="text-3xl font-bold text-red-600">{spoiled}</p>
      </div>
    </div>
  );
}
