"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/api";
import { formatRp, monthStartIso, sisaTagihan, todayIso } from "@/lib/format";

type ItemJual = { qty: number; harga_satuan: number; harga_beli: number; subtotal: number };
type ItemRetur = { qty: number; harga_satuan: number; harga_beli: number; subtotal: number };

export default function LaporanPage() {
  const [dari, setDari] = useState(monthStartIso());
  const [sampai, setSampai] = useState(todayIso());
  const [jual, setJual] = useState(0);
  const [returJual, setReturJual] = useState(0);
  const [beli, setBeli] = useState(0);
  const [returBeli, setReturBeli] = useState(0);
  const [laba, setLaba] = useState(0);
  const [piutang, setPiutang] = useState(0);
  const [hutang, setHutang] = useState(0);
  const [nilaiStok, setNilaiStok] = useState(0);

  useEffect(() => {
    async function muat() {
      const [pj, rj, pb, rb, semuaJual, semuaBeli, stok] = await Promise.all([
        db().from("penjualan").select("grand_total,penjualan_item(qty,harga_satuan,harga_beli,subtotal)").gte("tanggal", dari).lte("tanggal", sampai),
        db().from("retur_penjualan").select("total,retur_penjualan_item(qty,harga_satuan,harga_beli,subtotal)").gte("tanggal", dari).lte("tanggal", sampai),
        db().from("pembelian").select("total").gte("tanggal", dari).lte("tanggal", sampai),
        db().from("retur_pembelian").select("total").gte("tanggal", dari).lte("tanggal", sampai),
        db().from("penjualan").select("grand_total,dibayar,retur_penjualan(total)"),
        db().from("pembelian").select("total,dibayar,retur_pembelian(total)"),
        db().from("produk").select("stok,harga_beli").eq("aktif", true),
      ]);

      const jualRows = (pj.data ?? []) as { grand_total: number; penjualan_item: ItemJual[] }[];
      const returRows = (rj.data ?? []) as { total: number; retur_penjualan_item: ItemRetur[] }[];
      setJual(jualRows.reduce((s, r) => s + Number(r.grand_total), 0));
      setReturJual(returRows.reduce((s, r) => s + Number(r.total), 0));
      setBeli((pb.data ?? []).reduce((s, r) => s + Number(r.total), 0));
      setReturBeli((rb.data ?? []).reduce((s, r) => s + Number(r.total), 0));

      const labaJual = jualRows.reduce(
        (s, r) => s + r.penjualan_item.reduce((a, i) => a + (Number(i.harga_satuan) - Number(i.harga_beli)) * Number(i.qty), 0),
        0
      );
      const labaRetur = returRows.reduce(
        (s, r) => s + r.retur_penjualan_item.reduce((a, i) => a + (Number(i.harga_satuan) - Number(i.harga_beli)) * Number(i.qty), 0),
        0
      );
      setLaba(labaJual - labaRetur);

      setPiutang(
        ((semuaJual.data ?? []) as { grand_total: number; dibayar: number; retur_penjualan: { total: number }[] }[])
          .reduce((s, r) => s + sisaTagihan(r.grand_total, r.dibayar, r.retur_penjualan.reduce((a, x) => a + Number(x.total), 0)), 0)
      );
      setHutang(
        ((semuaBeli.data ?? []) as { total: number; dibayar: number; retur_pembelian: { total: number }[] }[])
          .reduce((s, r) => s + sisaTagihan(r.total, r.dibayar, r.retur_pembelian.reduce((a, x) => a + Number(x.total), 0)), 0)
      );
      setNilaiStok(((stok.data ?? []) as { stok: number; harga_beli: number }[]).reduce((s, p) => s + Number(p.stok) * Number(p.harga_beli), 0));
    }
    void muat();
  }, [dari, sampai]);

  const kartu = [
    ["Penjualan", jual],
    ["Retur penjualan", returJual],
    ["Pembelian", beli],
    ["Retur pembelian", returBeli],
    ["Laba kotor", laba],
    ["Piutang belum lunas", piutang],
    ["Hutang belum lunas", hutang],
    ["Nilai stok", nilaiStok],
  ] as const;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Laporan keuangan</h1>
      <div className="flex gap-3 mb-6">
        <label className="text-sm text-gray-600">
          Dari
          <input type="date" value={dari} onChange={(e) => setDari(e.target.value)} className="mt-1 block border border-gray-300 rounded-lg px-3 py-2" />
        </label>
        <label className="text-sm text-gray-600">
          Sampai
          <input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} className="mt-1 block border border-gray-300 rounded-lg px-3 py-2" />
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {kartu.map(([label, nilai]) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-gray-800">{formatRp(nilai)}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-4">
        Penjualan, retur, pembelian, dan laba mengikuti tanggal di atas. Piutang, hutang, dan nilai stok adalah posisi saat ini.
      </p>
    </div>
  );
}
