"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/api";
import { formatRp, sisaTagihan } from "@/lib/format";

type Nota = {
  nomor_nota: string;
  tanggal: string;
  grand_total: number;
  diskon: number;
  dibayar: number;
  status_bayar: string;
  catatan: string | null;
  pelanggan: { nama: string } | null;
  penjualan_item: { qty: number; harga_satuan: number; subtotal: number; produk: { nama: string } | null }[];
  retur_penjualan: { total: number }[];
};

export default function NotaJualPage() {
  const { id } = useParams<{ id: string }>();
  const [nota, setNota] = useState<Nota | null>(null);

  useEffect(() => {
    db()
      .from("penjualan")
      .select("nomor_nota,tanggal,grand_total,diskon,dibayar,status_bayar,catatan,pelanggan(nama),penjualan_item(qty,harga_satuan,subtotal,produk(nama)),retur_penjualan(total)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setNota(data as unknown as Nota | null));
  }, [id]);

  if (!nota) return <p className="text-sm text-gray-500">Memuat nota...</p>;
  const retur = nota.retur_penjualan.reduce((s, r) => s + Number(r.total), 0);

  return (
    <div className="max-w-xl">
      <button onClick={() => window.print()} className="no-print mb-4 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm">
        Cetak nota
      </button>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h1 className="text-xl font-bold text-orange-600">Toko Bekon</h1>
        <p className="text-sm text-gray-500 mb-4">{nota.nomor_nota} · {nota.tanggal}</p>
        <p className="text-sm mb-4">Pelanggan: {nota.pelanggan?.nama ?? "Umum"}</p>
        <table className="w-full text-sm mb-4">
          <tbody>
            {nota.penjualan_item.map((item, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="py-2">{item.produk?.nama}</td>
                <td className="text-right">{item.qty} × {formatRp(item.harga_satuan)}</td>
                <td className="text-right">{formatRp(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm">Diskon {formatRp(nota.diskon)}</p>
        <p className="text-sm">Retur {formatRp(retur)}</p>
        <p className="font-semibold">Total {formatRp(nota.grand_total)}</p>
        <p className="text-sm">Sisa {formatRp(sisaTagihan(nota.grand_total, nota.dibayar, retur))} · {nota.status_bayar.replace("_", " ")}</p>
        {nota.catatan && <p className="text-sm text-gray-500 mt-2">{nota.catatan}</p>}
      </div>
    </div>
  );
}
