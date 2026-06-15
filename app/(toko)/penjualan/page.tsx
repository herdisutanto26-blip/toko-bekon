export default function PenjualanPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Penjualan</h1>
        <button className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700">
          + Nota Baru
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
        Belum ada transaksi penjualan
      </div>
    </div>
  );
}
