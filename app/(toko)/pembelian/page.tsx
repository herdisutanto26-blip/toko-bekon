"use client";

import { useEffect, useState } from "react";
import BarangForm from "@/components/BarangForm";
import { Daftar } from "../penjualan/page";
import { db, semua } from "@/lib/api";
import { sisaTagihan } from "@/lib/format";

type Row = {
  id: string;
  nomor_po: string;
  tanggal: string;
  total: number;
  dibayar: number;
  status_bayar: string;
  supplier: { nama: string } | null;
  retur_pembelian: { total: number }[];
};

export default function PembelianPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [cari, setCari] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    semua<Row>((dari, sampai) =>
      db()
        .from("pembelian")
        .select("id,nomor_po,tanggal,total,dibayar,status_bayar,supplier(nama),retur_pembelian(total)")
        .order("tanggal", { ascending: false })
        .order("id")
        .range(dari, sampai)
    )
      .then((data) => { setRows(data); setError(""); })
      .catch((err: Error) => setError(err.message))
      .finally(() => setMemuat(false));
  }, []);

  const kata = cari.trim().toLowerCase();
  const cocok = kata ? rows.filter((r) => (r.supplier?.nama ?? "").toLowerCase().includes(kata)) : rows.slice(0, 40);
  const daftar = cocok.slice(0, 200).map((r) => ({
          id: r.id,
          href: `/pembelian/${r.id}`,
          nomor: r.nomor_po,
          tanggal: r.tanggal,
          pihak: r.supplier?.nama ?? "-",
          total: r.total,
          sisa: sisaTagihan(r.total, r.dibayar, (r.retur_pembelian ?? []).reduce((s, x) => s + Number(x.total), 0)),
          status: r.status_bayar,
        }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Pembelian</h1>
      <BarangForm mode="beli" />
      <input
        type="text"
        placeholder="Cari supplier..."
        value={cari}
        onChange={(e) => setCari(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {memuat ? (
        <p className="text-sm text-gray-500 mb-4">Memuat data...</p>
      ) : (
        <>
          {kata && <p className="text-xs text-gray-400 mb-2">{cocok.length} nota untuk supplier ini{cocok.length > 200 ? ", menampilkan 200 pertama" : ""}</p>}
          <Daftar kosong={kata ? "Tidak ada supplier yang cocok" : "Belum ada pembelian"} rows={daftar} />
        </>
      )}
    </div>
  );
}
