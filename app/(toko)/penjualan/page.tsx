"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BarangForm from "@/components/BarangForm";
import { db } from "@/lib/api";
import { formatRp, sisaTagihan } from "@/lib/format";

type Row = {
  id: string;
  nomor_nota: string;
  tanggal: string;
  grand_total: number;
  dibayar: number;
  status_bayar: string;
  pelanggan: { nama: string } | null;
  retur_penjualan: { total: number }[];
};

export default function PenjualanPage() {
  const [rows, setRows] = useState<Row[]>([]);

  function muat() {
    db()
      .from("penjualan")
      .select("id,nomor_nota,tanggal,grand_total,dibayar,status_bayar,pelanggan(nama),retur_penjualan(total)")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setRows((data ?? []) as unknown as Row[]));
  }

  useEffect(() => { muat(); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Penjualan</h1>
      <BarangForm mode="jual" />
      <Daftar
        kosong="Belum ada nota penjualan"
        rows={rows.map((r) => ({
          id: r.id,
          href: `/penjualan/${r.id}`,
          nomor: r.nomor_nota,
          tanggal: r.tanggal,
          pihak: r.pelanggan?.nama ?? "Umum",
          total: r.grand_total,
          sisa: sisaTagihan(r.grand_total, r.dibayar, (r.retur_penjualan ?? []).reduce((s, x) => s + Number(x.total), 0)),
          status: r.status_bayar,
        }))}
      />
    </div>
  );
}

export function Daftar({
  rows,
  kosong,
}: {
  kosong: string;
  rows: { id: string; href: string; nomor: string; tanggal: string; pihak: string; total: number; sisa: number; status: string }[];
}) {
  if (rows.length === 0) {
    return <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">{kosong}</div>;
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {["Nomor", "Tanggal", "Pihak", "Total", "Sisa", "Status"].map((h) => (
              <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3"><Link href={r.href} className="text-orange-700 font-medium">{r.nomor}</Link></td>
              <td className="px-4 py-3">{r.tanggal}</td>
              <td className="px-4 py-3">{r.pihak}</td>
              <td className="px-4 py-3">{formatRp(r.total)}</td>
              <td className="px-4 py-3">{formatRp(r.sisa)}</td>
              <td className="px-4 py-3 capitalize">{r.status.replace("_", " ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
