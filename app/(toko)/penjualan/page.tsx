"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BarangForm from "@/components/BarangForm";
import { db, semua } from "@/lib/api";
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
  const [cari, setCari] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");

  function muat() {
    setMemuat(true);
    semua<Row>((dari, sampai) =>
      db()
        .from("penjualan")
        .select("id,nomor_nota,tanggal,grand_total,dibayar,status_bayar,pelanggan(nama),retur_penjualan(total)")
        .order("tanggal", { ascending: false })
        .order("id")
        .range(dari, sampai)
    )
      .then((data) => { setRows(data); setError(""); })
      .catch((err: Error) => setError(err.message))
      .finally(() => setMemuat(false));
  }

  useEffect(() => { muat(); }, []);

  const kata = cari.trim().toLowerCase();
  const cocok = kata ? rows.filter((r) => (r.pelanggan?.nama ?? "umum").toLowerCase().includes(kata)) : rows.slice(0, 40);
  const daftar = cocok.slice(0, 200).map((r) => ({
          id: r.id,
          href: `/penjualan/${r.id}`,
          nomor: r.nomor_nota,
          tanggal: r.tanggal,
          pihak: r.pelanggan?.nama ?? "Umum",
          total: r.grand_total,
          sisa: sisaTagihan(r.grand_total, r.dibayar, (r.retur_penjualan ?? []).reduce((s, x) => s + Number(x.total), 0)),
          status: r.status_bayar,
        }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Penjualan</h1>
      <BarangForm mode="jual" />
      <input
        type="text"
        placeholder="Cari pelanggan..."
        value={cari}
        onChange={(e) => setCari(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {memuat ? (
        <p className="text-sm text-gray-500 mb-4">Memuat data...</p>
      ) : (
        <>
          {kata && <p className="text-xs text-gray-400 mb-2">{cocok.length} nota untuk pelanggan ini{cocok.length > 200 ? ", menampilkan 200 pertama" : ""}</p>}
          <Daftar kosong={kata ? "Tidak ada pelanggan yang cocok" : "Belum ada nota penjualan"} rows={daftar} />
        </>
      )}
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
