"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/api";
import { formatRp, sisaTagihan, todayIso } from "@/lib/format";

export default function DashboardPage() {
  const [jualHari, setJualHari] = useState(0);
  const [menipis, setMenipis] = useState<{ nama: string; stok: number }[]>([]);
  const [piutang, setPiutang] = useState(0);
  const [hutang, setHutang] = useState(0);
  const [terakhir, setTerakhir] = useState<{ nomor_nota: string; grand_total: number }[]>([]);

  useEffect(() => {
    const hari = todayIso();
    db().from("penjualan").select("grand_total").eq("tanggal", hari).then(({ data }) => {
      setJualHari((data ?? []).reduce((s, r) => s + Number(r.grand_total), 0));
    });
    db().from("penjualan").select("nomor_nota,grand_total").order("created_at", { ascending: false }).limit(5).then(({ data }) => {
      setTerakhir((data ?? []) as { nomor_nota: string; grand_total: number }[]);
    });
    db().from("produk").select("nama,stok,stok_minimum").eq("aktif", true).then(({ data }) => {
      setMenipis(
        ((data ?? []) as { nama: string; stok: number; stok_minimum: number }[])
          .filter((p) => Number(p.stok) <= Number(p.stok_minimum))
          .slice(0, 8)
          .map((p) => ({ nama: p.nama, stok: Number(p.stok) }))
      );
    });
    db().from("penjualan").select("grand_total,dibayar,retur_penjualan(total)").then(({ data }) => {
      setPiutang(
        ((data ?? []) as { grand_total: number; dibayar: number; retur_penjualan: { total: number }[] }[])
          .reduce((s, r) => s + sisaTagihan(r.grand_total, r.dibayar, r.retur_penjualan.reduce((a, x) => a + Number(x.total), 0)), 0)
      );
    });
    db().from("pembelian").select("total,dibayar,retur_pembelian(total)").then(({ data }) => {
      setHutang(
        ((data ?? []) as { total: number; dibayar: number; retur_pembelian: { total: number }[] }[])
          .reduce((s, r) => s + sisaTagihan(r.total, r.dibayar, r.retur_pembelian.reduce((a, x) => a + Number(x.total), 0)), 0)
      );
    });
  }, []);

  const kartu = [
    ["Penjualan hari ini", formatRp(jualHari), "text-green-600"],
    ["Stok menipis", `${menipis.length} produk`, "text-red-600"],
    ["Piutang belum lunas", formatRp(piutang), "text-yellow-600"],
    ["Hutang belum lunas", formatRp(hutang), "text-orange-600"],
  ] as const;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
        {kartu.map(([label, value, color]) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Transaksi terakhir</h2>
          {terakhir.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada data</p>
          ) : (
            <ul className="text-sm space-y-2">
              {terakhir.map((t) => (
                <li key={t.nomor_nota} className="flex justify-between">
                  <span>{t.nomor_nota}</span>
                  <span>{formatRp(t.grand_total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Produk stok menipis</h2>
          {menipis.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada data</p>
          ) : (
            <ul className="text-sm space-y-2">
              {menipis.map((p) => (
                <li key={p.nama} className="flex justify-between">
                  <span>{p.nama}</span>
                  <span>{p.stok}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
