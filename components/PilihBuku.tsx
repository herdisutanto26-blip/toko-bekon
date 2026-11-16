export type Buku = "umum" | "bekon";

export function PilihBuku({ nilai, onPilih }: { nilai: Buku; onPilih: (buku: Buku) => void }) {
  const tombol: { id: Buku; label: string }[] = [
    { id: "umum", label: "Pelanggan umum" },
    { id: "bekon", label: "Bekon" },
  ];
  return (
    <div className="mb-4 flex gap-2">
      {tombol.map((item) => {
        const aktif = nilai === item.id;
        const warna =
          item.id === "bekon"
            ? aktif
              ? "bg-merek-biru-tua text-white"
              : "border border-gray-200 bg-white text-gray-700"
            : aktif
              ? "bg-gray-900 text-white"
              : "border border-gray-200 bg-white text-gray-700";
        return (
          <button key={item.id} type="button" onClick={() => onPilih(item.id)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${warna}`}>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
