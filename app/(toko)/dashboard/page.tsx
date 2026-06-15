export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
        {[
          { label: "Penjualan Hari Ini", value: "Rp 0", color: "text-green-600" },
          { label: "Stok Menipis", value: "0 produk", color: "text-red-600" },
          { label: "Piutang Belum Lunas", value: "Rp 0", color: "text-yellow-600" },
          { label: "Hutang Belum Lunas", value: "Rp 0", color: "text-orange-600" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">{card.label}</p>
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Transaksi Terakhir</h2>
          <p className="text-sm text-gray-400">Belum ada data</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Produk Stok Menipis</h2>
          <p className="text-sm text-gray-400">Belum ada data</p>
        </div>
      </div>
    </div>
  );
}
