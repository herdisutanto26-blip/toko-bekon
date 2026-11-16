"use client";

import { useEffect, useState } from "react";
import { db, semua } from "@/lib/api";
import { formatRp, monthStartIso, sisaTagihan, todayIso } from "@/lib/format";
import { asetTetap, kasBank, kewajibanLain } from "@/lib/saldo-akun";

type Angka = {
  jualUmum: number;
  jualBekon: number;
  returUmum: number;
  returBekon: number;
  hppUmum: number;
  hppBekon: number;
  piutangUmum: number;
  piutangBekon: number;
  hutang: number;
  stok: number;
};

const kosong: Angka = {
  jualUmum: 0,
  jualBekon: 0,
  returUmum: 0,
  returBekon: 0,
  hppUmum: 0,
  hppBekon: 0,
  piutangUmum: 0,
  piutangBekon: 0,
  hutang: 0,
  stok: 0,
};

function milikBekon(rel: { bekon_po_id: string | null } | { bekon_po_id: string | null }[] | null) {
  const row = Array.isArray(rel) ? rel[0] : rel;
  return Boolean(row?.bekon_po_id);
}

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
  const [kasMutasi, setKasMutasi] = useState<Record<string, number>>({});
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let batal = false;
    setMemuat(true);
    setError("");
    async function muat() {
      const [nota, retur, item, piutang, hutang, stok, jurnalKas] = await Promise.all([
        semua<{ grand_total: number; bekon_po_id: string | null }>((from, to) =>
          db().from("penjualan").select("grand_total,bekon_po_id").gte("tanggal", dari).lte("tanggal", sampai).order("id").range(from, to)
        ),
        semua<{ total: number; penjualan: { bekon_po_id: string | null } | { bekon_po_id: string | null }[] | null }>((from, to) =>
          db().from("retur_penjualan").select("total,penjualan!inner(bekon_po_id)").gte("tanggal", dari).lte("tanggal", sampai).order("id").range(from, to)
        ),
        semua<{ qty: number; harga_beli: number; penjualan: { bekon_po_id: string | null } | { bekon_po_id: string | null }[] | null }>((from, to) =>
          db()
            .from("penjualan_item")
            .select("qty,harga_beli,penjualan!inner(tanggal,bekon_po_id)")
            .gte("penjualan.tanggal", dari)
            .lte("penjualan.tanggal", sampai)
            .order("id")
            .range(from, to)
        ),
        semua<{ grand_total: number; dibayar: number; bekon_po_id: string | null; retur_penjualan: { total: number }[] | null }>((from, to) =>
          db().from("penjualan").select("grand_total,dibayar,bekon_po_id,retur_penjualan(total)").neq("status_bayar", "lunas").order("id").range(from, to)
        ),
        semua<{ total: number; dibayar: number; retur_pembelian: { total: number }[] | null }>((from, to) =>
          db().from("pembelian").select("total,dibayar,retur_pembelian(total)").neq("status_bayar", "lunas").order("id").range(from, to)
        ),
        semua<{ stok: number; harga_beli: number }>((from, to) =>
          db().from("produk").select("stok,harga_beli").eq("aktif", true).order("id").range(from, to)
        ),
        semua<{ kode: string; debit: number; kredit: number }>((from, to) =>
          db().from("jurnal_baris").select("kode,debit,kredit").in("kode", kasBank.map((a) => a.kode)).order("id").range(from, to)
        ),
      ]);
      if (batal) return;
      const sisa = (r: { grand_total: number; dibayar: number; retur_penjualan: { total: number }[] | null }) =>
        sisaTagihan(r.grand_total, r.dibayar, jumlah((r.retur_penjualan ?? []).map((x) => x.total)));
      setAngka({
        jualUmum: jumlah(nota.filter((r) => !r.bekon_po_id).map((r) => r.grand_total)),
        jualBekon: jumlah(nota.filter((r) => r.bekon_po_id).map((r) => r.grand_total)),
        returUmum: jumlah(retur.filter((r) => !milikBekon(r.penjualan)).map((r) => r.total)),
        returBekon: jumlah(retur.filter((r) => milikBekon(r.penjualan)).map((r) => r.total)),
        hppUmum: jumlah(item.filter((r) => !milikBekon(r.penjualan)).map((r) => Number(r.qty) * Number(r.harga_beli))),
        hppBekon: jumlah(item.filter((r) => milikBekon(r.penjualan)).map((r) => Number(r.qty) * Number(r.harga_beli))),
        piutangUmum: jumlah(piutang.filter((r) => !r.bekon_po_id).map(sisa)),
        piutangBekon: jumlah(piutang.filter((r) => r.bekon_po_id).map(sisa)),
        hutang: jumlah(hutang.map((r) => sisaTagihan(r.total, r.dibayar, jumlah((r.retur_pembelian ?? []).map((x) => x.total))))),
        stok: jumlah(stok.map((r) => Number(r.stok) * Number(r.harga_beli))),
      });
      const mutasi: Record<string, number> = {};
      for (const baris of jurnalKas) {
        mutasi[baris.kode] = (mutasi[baris.kode] ?? 0) + Number(baris.debit) - Number(baris.kredit);
      }
      setKasMutasi(mutasi);
    }
    muat()
      .catch((err: unknown) => {
        if (!batal) {
          setAngka(kosong);
          setKasMutasi({});
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

  const jual = angka.jualUmum + angka.jualBekon;
  const returJual = angka.returUmum + angka.returBekon;
  const hpp = angka.hppUmum + angka.hppBekon;
  const piutang = angka.piutangUmum + angka.piutangBekon;
  const bersih = jual - returJual;
  const labaKotor = bersih - hpp;
  const saldoKas = (kode: string, saldo: number) => saldo + (kasMutasi[kode] ?? 0);
  const totalKas = kasBank.reduce((s, a) => s + saldoKas(a.kode, a.saldo), 0);
  const totalTetap = asetTetap.reduce((s, a) => s + a.saldo, 0);
  const totalKewajibanLain = kewajibanLain.reduce((s, a) => s + a.saldo, 0);
  const aset = totalKas + piutang + angka.stok + totalTetap;
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
            <Baris label="Penjualan umum" nilai={angka.jualUmum} />
            <Baris label="Penjualan Bekon" nilai={angka.jualBekon} />
            <Baris label="Penjualan" nilai={jual} tebal garis />
            <Baris label="Retur penjualan umum" nilai={angka.returUmum} />
            <Baris label="Retur penjualan Bekon" nilai={angka.returBekon} />
            <Baris label="Retur penjualan" nilai={returJual} tebal garis />
            <Baris label="Penjualan bersih" nilai={bersih} tebal garis />
            <Baris label="Harga pokok umum" nilai={angka.hppUmum} />
            <Baris label="Harga pokok Bekon" nilai={angka.hppBekon} />
            <Baris label="Harga pokok penjualan" nilai={hpp} tebal garis />
            <Baris label="Laba kotor" nilai={labaKotor} tebal garis />
          </section>
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-1">Neraca</h2>
            <p className="text-xs text-gray-400 mb-3">Posisi hari ini</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Aset</p>
            {kasBank.map((a) => (
              <Baris key={a.kode} label={a.nama} nilai={saldoKas(a.kode, a.saldo)} />
            ))}
            <Baris label="Jumlah kas dan bank" nilai={totalKas} tebal garis />
            <Baris label="Piutang umum" nilai={angka.piutangUmum} />
            <Baris label="Piutang Bekon" nilai={angka.piutangBekon} />
            <Baris label="Piutang usaha" nilai={piutang} tebal garis />
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
        Rugi laba mengikuti tanggal di atas. Piutang dan hutang dihitung dari nota. Kas kasir, Bank BCA, dan Bank BSI memakai saldo sampai 7 November 2026, lalu ditambah jurnal pelunasan yang dicatat setelahnya. Setoran dimuka adalah uang masuk Bank BCA yang lawannya akun pembayaran dimuka. Ekuitas menyeimbangkan sisa akun modal.
      </p>
    </div>
  );
}
