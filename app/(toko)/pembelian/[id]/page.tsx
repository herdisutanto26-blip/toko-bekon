"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/api";
import { formatRp, sisaTagihan } from "@/lib/format";

type Nota = {
  nomor_po: string;
  tanggal: string;
  total: number;
  dibayar: number;
  status_bayar: string;
  catatan: string | null;
  supplier: { nama: string } | null;
  pembelian_item: { qty: number; harga_satuan: number; subtotal: number; produk: { nama: string } | null }[];
  retur_pembelian: { total: number }[];
};

export default function NotaBeliPage() {
  const { id } = useParams<{ id: string }>();
  const [nota, setNota] = useState<Nota | null>(null);

  useEffect(() => {
    db()
      .from("pembelian")
      .select("nomor_po,tanggal,total,dibayar,status_bayar,catatan,supplier(nama),pembelian_item(qty,harga_satuan,subtotal,produk(nama)),retur_pembelian(total)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setNota(data as unknown as Nota | null));
  }, [id]);

  if (!nota) return <p className="text-sm text-gray-500">Memuat nota...</p>;
  const retur = nota.retur_pembelian.reduce((s, r) => s + Number(r.total), 0);

  return (
    <div className="max-w-xl bg-white border border-gray-200 rounded-xl p-6">
      <h1 className="text-xl font-bold text-gray-800">{nota.nomor_po}</h1>
      <p className="text-sm text-gray-500 mb-4">{nota.tanggal} · {nota.supplier?.nama}</p>
      <table className="w-full text-sm mb-4">
        <tbody>
          {nota.pembelian_item.map((item, i) => (
            <tr key={i} className="border-t border-gray-100">
              <td className="py-2">{item.produk?.nama}</td>
              <td className="text-right">{item.qty} × {formatRp(item.harga_satuan)}</td>
              <td className="text-right">{formatRp(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="font-semibold">Total {formatRp(nota.total)}</p>
      <p className="text-sm">Retur {formatRp(retur)}</p>
      <p className="text-sm">Sisa hutang {formatRp(sisaTagihan(nota.total, nota.dibayar, retur))} · {nota.status_bayar.replace("_", " ")}</p>
    </div>
  );
}
