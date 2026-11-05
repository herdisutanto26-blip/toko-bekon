"use client";

import { useEffect, useState } from "react";
import BarangForm from "@/components/BarangForm";
import { Daftar } from "../penjualan/page";
import { db } from "@/lib/api";
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

  useEffect(() => {
    db()
      .from("pembelian")
      .select("id,nomor_po,tanggal,total,dibayar,status_bayar,supplier(nama),retur_pembelian(total)")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setRows((data ?? []) as unknown as Row[]));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Pembelian</h1>
      <BarangForm mode="beli" />
      <Daftar
        kosong="Belum ada pembelian"
        rows={rows.map((r) => ({
          id: r.id,
          href: `/pembelian/${r.id}`,
          nomor: r.nomor_po,
          tanggal: r.tanggal,
          pihak: r.supplier?.nama ?? "-",
          total: r.total,
          sisa: sisaTagihan(r.total, r.dibayar, (r.retur_pembelian ?? []).reduce((s, x) => s + Number(x.total), 0)),
          status: r.status_bayar,
        }))}
      />
    </div>
  );
}
