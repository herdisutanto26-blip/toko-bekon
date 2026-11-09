"use client";

import { useEffect, useState } from "react";
import { db, semua } from "@/lib/api";
import { formatRp, monthStartIso, sisaTagihan, todayIso } from "@/lib/format";
import { asetTetap, kasBank, kewajibanLain } from "@/lib/saldo-akun";

type Angka = {
  jual: number;
  returJual: number;
  hpp: number;
  piutang: number;
  hutang: number;
  stok: number;
};

const kosong: Angka = { jual: 0, returJual: 0, hpp: 0, piutang: 0, hutang: 0, stok: 0 };

function jumlah(nilai: number[]) {
  return nilai.reduce((s, n) => s + Number(n || 0), 0);
}

function Baris({
  label,
  nilai,
  tebal,
  garis,
}: {
  label: string;
  nilai: number;
  tebal?: boolean;
  garis?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-4 py-2 ${garis ? "border-t border-gray-200" : ""} ${tebal ? "font-semibold text-gray-900" : "text-gray-700"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{formatRp(nilai)}</span>
    </div>
  );
}

export default function LaporanPage() {
  const [dari, setDari] = useState(monthStartIso());
  const [sampai, setSampai] = useState(todayIso());
  const [angka, setAngka] = useState<Angka>(kosong);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let batal = false;
    setMemuat(true);
    setError("");
    async function muat() {
      const [nota, retur, item, piutang, hutang, stok] = await Promise.all([
        semua<{ grand_total: number }>((from, to) =>
          db().from("penjualan").select("grand_total").gte("tanggal", dari).lte("tanggal", sampai).order("id").range(from, to)
        ),
        semua<{ total: number }>((from, to) =>
          db().from("retur_penjualan").select("total").gte("tanggal", dari).lte("tanggal", sampai).order("id").range(from, to)
        ),
        semua<{ qty: number; harga_beli: number }>((from, to) =>
          db()
            .from("penjualan_item")
            .select("qty,harga_beli,penjualan!inner(tanggal)")
            .gte("penjualan.tanggal", dari)
            .lte("penjualan.tanggal", sampai)
            .order("id")
            .range(from, to)
        ),
        semua<{ grand_total: number; dibayar: number; retur_penjualan: { total: number }[] | null }>((from, to) =>
          db().from("penjualan").select("grand_total,dibayar,retur_penjualan(total)").neq("status_bayar", "lunas").order("id").range(from, to)
        ),
        semua<{ total: number; dibayar: number; retur_pembelian: { total: number }[] | null }>((from, to) =>
          db().from("pembelian").select("total,dibayar,retur_pembelian(total)").neq("status_bayar", "lunas").order("id").range(from, to)
        ),
        semua<{ stok: number; harga_beli: number }>((from, to) =>
          db().from("produk").select("stok,harga_beli").eq("aktif", true).order("id").range(from, to)
        ),
      ]);
      if (batal) return;
      setAngka({
        jual: jumlah(nota.map((r) => r.grand_total)),
        returJual: jumlah(retur.map((r) => r.total)),
        hpp: jumlah(item.map((r) => Number(r.qty) * Number(r.harga_beli))),
        piutang: jumlah(piutang.map((r) => sisaTagihan(r.grand_total, r.dibayar, jumlah((r.retur_penjualan ?? []).map((x) => x.total))))),
        hutang: jumlah(hutang.map((r) => sisaTagihan(r.total, r.dibayar, jumlah((r.retur_pembelian ?? []).map((x) => x.total))))),
        stok: jumlah(stok.map((r) => Number(r.stok) * Number(r.harga_beli))),
      });
    }
    muat()
      .catch((err: unknown) => {
        if (!batal) {
          setAngka(kosong);
          setError(err instanceof Error ? err.message : "Gagal memuat laporan");
        }
      })
      .finally(() => {
        if (!batal) setMemuat(false);
      });
    return () => {
      batal = true;
    };
  }, [dari, sampai]);

  const bersih = angka.jual - angka.returJual;
  const labaKotor = bersih - angka.hpp;
  const totalKas = kasBank.reduce((s, a) => s + a.saldo, 0);
  const totalTetap = asetTetap.reduce((s, a) => s + a.saldo, 0);
  const totalKewajibanLain = kewajibanLain.reduce((s, a) => s + a.saldo, 0);
  const aset = totalKas + angka.piutang + angka.stok + totalTetap;
  const ekuitas = aset - angka.hutang - totalKewajibanLain;

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
      {memuat && <p className="text-sm text-gray-500 mb-4">Memuat laporan...</p>}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {!memuat && !error && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-1">Rugi laba</h2>
            <p className="text-xs text-gray-400 mb-3">{dari} s/d {sampai}</p>
            <Baris label="Penjualan" nilai={angka.jual} />
            <Baris label="Retur penjualan" nilai={angka.returJual} />
            <Baris label="Penjualan bersih" nilai={bersih} tebal garis />
            <Baris label="Harga pokok penjualan" nilai={angka.hpp} />
            <Baris label="Laba kotor" nilai={labaKotor} tebal garis />
          </section>
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-1">Neraca</h2>
            <p className="text-xs text-gray-400 mb-3">Posisi hari ini</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Aset</p>
            {kasBank.map((a) => (
              <Baris key={a.kode} label={a.nama} nilai={a.saldo} />
            ))}
            <Baris label="Jumlah kas dan bank" nilai={totalKas} tebal garis />
            <Baris label="Piutang usaha" nilai={angka.piutang} />
            <Baris label="Persediaan" nilai={angka.stok} />
            {asetTetap.map((a) => (
              <Baris key={a.kode} label={a.nama} nilai={a.saldo} />
            ))}
            <Baris label="Jumlah aset tetap" nilai={totalTetap} tebal garis />
            <Baris label="Jumlah aset" nilai={aset} tebal garis />
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mt-4">Kewajiban</p>
            <Baris label="Hutang usaha" nilai={angka.hutang} />
            {kewajibanLain.map((a) => (
              <Baris key={a.kode} label={a.nama} nilai={a.saldo} />
            ))}
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mt-4">Ekuitas</p>
            <Baris label="Ekuitas" nilai={ekuitas} />
            <Baris label="Jumlah kewajiban dan ekuitas" nilai={angka.hutang + totalKewajibanLain + ekuitas} tebal garis />
          </section>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-4">
        Rugi laba mengikuti tanggal di atas. Piutang dan hutang dihitung dari nota, dan pelunasannya sudah cocok dengan daftar bayar iPos. Kas kasir dan Bank BCA memasukkan kas masuk, kas keluar, dan pelunasan supplier sampai 7 November 2026 yang belum masuk jurnal. Setoran dimuka adalah uang masuk Bank BCA yang lawannya akun pembayaran dimuka. Ekuitas menyeimbangkan sisa akun modal.
      </p>
    </div>
  );
}
