"use client";

import { useEffect, useState } from "react";
import { db, rpc, semua } from "@/lib/api";
import { formatRp, todayIso } from "@/lib/format";
import { useAuth } from "@/lib/auth";

type Baris = {
  id: string;
  produk_id: string;
  qty: number;
  harga_satuan: number;
  produk: { nama: string } | null;
  sudah: number;
};

export default function ReturPanel({ mode }: { mode: "jual" | "beli" }) {
  const jual = mode === "jual";
  const { user } = useAuth();
  const [nota, setNota] = useState<{ id: string; nomor: string }[]>([]);
  const [notaId, setNotaId] = useState("");
  const [baris, setBaris] = useState<Baris[]>([]);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [tanggal, setTanggal] = useState(todayIso());
  const [catatan, setCatatan] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [saving, setSaving] = useState(false);
  const [riwayat, setRiwayat] = useState<{ id: string; nomor: string; tanggal: string; total: number; nota: string; pihak: string }[]>([]);

  function muatRiwayat() {
    const tabel = jual ? "retur_penjualan" : "retur_pembelian";
    const relasi = jual
      ? "nomor_retur,tanggal,total,penjualan(nomor_nota,pelanggan(nama))"
      : "nomor_retur,tanggal,total,pembelian(nomor_po,supplier(nama))";
    semua<Record<string, unknown>>((dari, sampai) =>
      db().from(tabel).select(`id,${relasi}`).order("tanggal", { ascending: false }).order("id").range(dari, sampai)
    )
      .then((data) => setRiwayat(data.map((r) => {
        const nota = jual
          ? (r.penjualan as { nomor_nota?: string; pelanggan?: { nama?: string } | null } | null)
          : (r.pembelian as { nomor_po?: string; supplier?: { nama?: string } | null } | null);
        const pihak = jual
          ? (nota as { pelanggan?: { nama?: string } | null } | null)?.pelanggan?.nama
          : (nota as { supplier?: { nama?: string } | null } | null)?.supplier?.nama;
        const nomorNota = jual
          ? (nota as { nomor_nota?: string } | null)?.nomor_nota
          : (nota as { nomor_po?: string } | null)?.nomor_po;
        return {
          id: String(r.id),
          nomor: String(r.nomor_retur),
          tanggal: String(r.tanggal),
          total: Number(r.total),
          nota: nomorNota ?? "-",
          pihak: pihak ?? "-",
        };
      })))
      .catch((err: Error) => setError(err.message));
  }

  useEffect(() => { muatRiwayat(); }, [jual]);

  useEffect(() => {
    const table = jual ? "penjualan" : "pembelian";
    const col = jual ? "nomor_nota" : "nomor_po";
    db()
      .from(table)
      .select(`id,${col}`)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        const rows = (data ?? []) as Record<string, string>[];
        setNota(rows.map((r) => ({ id: r.id, nomor: r[col] })));
      });
  }, [jual]);

  useEffect(() => {
    if (!notaId) {
      setBaris([]);
      return;
    }
    const itemTable = jual ? "penjualan_item" : "pembelian_item";
    const parent = jual ? "penjualan_id" : "pembelian_id";
    const returItem = jual ? "retur_penjualan_item" : "retur_pembelian_item";
    const itemFk = jual ? "penjualan_item_id" : "pembelian_item_id";
    Promise.all([
      db().from(itemTable).select("id,produk_id,qty,harga_satuan,produk(nama)").eq(parent, notaId),
      db().from(returItem).select(`${itemFk},qty`),
    ]).then(([items, retur]) => {
      const sudah = new Map<string, number>();
      for (const r of (retur.data ?? []) as Record<string, unknown>[]) {
        const id = String(r[itemFk] ?? "");
        sudah.set(id, (sudah.get(id) ?? 0) + Number(r.qty));
      }
      setBaris(
        ((items.data ?? []) as unknown as Omit<Baris, "sudah">[]).map((b) => ({
          ...b,
          sudah: sudah.get(b.id) ?? 0,
        }))
      );
      setQty({});
    });
  }, [notaId, jual]);

  async function simpan() {
    setError("");
    setInfo("");
    setSaving(true);
    try {
      const items = baris
        .map((b) => ({ penjualan_item_id: b.id, pembelian_item_id: b.id, qty: Number(qty[b.id] || 0) }))
        .filter((b) => b.qty > 0);
      await rpc(jual ? "simpan_retur_penjualan" : "simpan_retur_pembelian", {
        penjualan_id: jual ? notaId : undefined,
        pembelian_id: jual ? undefined : notaId,
        tanggal,
        catatan,
        dicatat_oleh: user?.nama ?? "",
        items,
      });
      setInfo("Retur tersimpan. Stok dan sisa tagihan sudah diperbarui.");
      setNotaId("");
      muatRiwayat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan retur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{jual ? "Retur Penjualan" : "Retur Pembelian"}</h1>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}
      {info && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{info}</p>}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <label className="text-sm text-gray-600">
            Nota asal
            <select value={notaId} onChange={(e) => setNotaId(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
              <option value="">Pilih nota</option>
              {nota.map((n) => (
                <option key={n.id} value={n.id}>{n.nomor}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-600">
            Tanggal
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
          </label>
        </div>
        {baris.length > 0 && (
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2">Barang</th>
                <th>Terjual</th>
                <th>Sudah retur</th>
                <th>Harga</th>
                <th>Qty retur</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => (
                <tr key={b.id} className="border-t border-gray-100">
                  <td className="py-2">{b.produk?.nama ?? "-"}</td>
                  <td>{b.qty}</td>
                  <td>{b.sudah}</td>
                  <td>{formatRp(b.harga_satuan)}</td>
                  <td>
                    <input
                      value={qty[b.id] ?? ""}
                      onChange={(e) => setQty((q) => ({ ...q, [b.id]: e.target.value }))}
                      className="w-24 border border-gray-300 rounded-lg px-2 py-1"
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <label className="text-sm text-gray-600 block mb-4">
          Catatan
          <input value={catatan} onChange={(e) => setCatatan(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
        </label>
        <button onClick={simpan} disabled={saving || !notaId || user?.latihan} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
          {saving ? "Menyimpan..." : "Simpan retur"}
        </button>
      </div>
      <h2 className="font-semibold text-gray-800 mt-8 mb-3">Riwayat retur</h2>
      {riwayat.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Belum ada retur</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Nomor", "Tanggal", "Nota asal", jual ? "Pelanggan" : "Supplier", "Total"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {riwayat.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">{r.nomor}</td>
                  <td className="px-4 py-3">{r.tanggal}</td>
                  <td className="px-4 py-3">{r.nota}</td>
                  <td className="px-4 py-3">{r.pihak}</td>
                  <td className="px-4 py-3">{formatRp(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
