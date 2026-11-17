"use client";

import { useEffect, useState } from "react";
import { db, rpc, semua } from "@/lib/api";
import { formatRp, todayIso } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import SaringTanggal from "@/components/SaringTanggal";

type Baris = {
  id: string;
  produk_id: string;
  qty: number;
  harga_satuan: number;
  produk: { nama: string } | null;
  sudah: number;
};

type Riwayat = {
  id: string;
  nomor: string;
  tanggal: string;
  total: number;
  nota: string;
  pihak: string;
  asalId: string;
};

export default function ReturPanel({ mode }: { mode: "jual" | "beli" }) {
  const jual = mode === "jual";
  const { user } = useAuth();
  const [nota, setNota] = useState<{ id: string; nomor: string }[]>([]);
  const [notaId, setNotaId] = useState("");
  const [notaAsal, setNotaAsal] = useState("");
  const [baris, setBaris] = useState<Baris[]>([]);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [tanggal, setTanggal] = useState(todayIso());
  const [catatan, setCatatan] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [saving, setSaving] = useState(false);
  const [tambah, setTambah] = useState(false);
  const [returId, setReturId] = useState("");
  const [nomorRetur, setNomorRetur] = useState("");
  const [riwayat, setRiwayat] = useState<Riwayat[]>([]);
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [sunting, setSunting] = useState(0);
  const [qtyAwal, setQtyAwal] = useState<Record<string, string> | null>(null);

  function muatRiwayat() {
    const tabel = jual ? "retur_penjualan" : "retur_pembelian";
    const relasi = jual
      ? "nomor_retur,tanggal,total,penjualan_id,penjualan(nomor_nota,pelanggan(nama))"
      : "nomor_retur,tanggal,total,pembelian_id,pembelian(nomor_po,supplier(nama))";
    semua<Record<string, unknown>>((awal, akhir) => {
      let q = db().from(tabel).select(`id,${relasi}`).order("tanggal", { ascending: false }).order("id");
      if (dari) q = q.gte("tanggal", dari);
      if (sampai) q = q.lte("tanggal", sampai);
      return q.range(awal, akhir);
    })
      .then((data) => setRiwayat(data.map((r) => {
        const asal = jual
          ? (r.penjualan as { nomor_nota?: string; pelanggan?: { nama?: string } | null } | null)
          : (r.pembelian as { nomor_po?: string; supplier?: { nama?: string } | null } | null);
        const pihak = jual
          ? (asal as { pelanggan?: { nama?: string } | null } | null)?.pelanggan?.nama
          : (asal as { supplier?: { nama?: string } | null } | null)?.supplier?.nama;
        const nomorNota = jual
          ? (asal as { nomor_nota?: string } | null)?.nomor_nota
          : (asal as { nomor_po?: string } | null)?.nomor_po;
        return {
          id: String(r.id),
          nomor: String(r.nomor_retur),
          tanggal: String(r.tanggal),
          total: Number(r.total),
          nota: nomorNota ?? "-",
          pihak: pihak ?? "-",
          asalId: String((jual ? r.penjualan_id : r.pembelian_id) ?? ""),
        };
      })))
      .catch((err: Error) => setError(err.message));
  }

  useEffect(() => { muatRiwayat(); }, [jual, dari, sampai]);

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
    const sedang = returId;
    Promise.all([
      db().from(itemTable).select("id,produk_id,qty,harga_satuan,produk(nama)").eq(parent, notaId),
      db().from(returItem).select(`${itemFk},qty,retur_id`),
    ]).then(([items, retur]) => {
      const sudah = new Map<string, number>();
      for (const r of (retur.data ?? []) as Record<string, unknown>[]) {
        if (sedang && String(r.retur_id ?? "") === sedang) continue;
        const id = String(r[itemFk] ?? "");
        sudah.set(id, (sudah.get(id) ?? 0) + Number(r.qty));
      }
      setBaris(
        ((items.data ?? []) as unknown as Omit<Baris, "sudah">[]).map((b) => ({
          ...b,
          sudah: sudah.get(b.id) ?? 0,
        }))
      );
      setQty(qtyAwal ?? {});
    });
  }, [notaId, jual, returId, sunting, qtyAwal]);

  async function simpan() {
    setError("");
    setInfo("");
    setSaving(true);
    try {
      const items = baris
        .map((b) => ({ penjualan_item_id: b.id, pembelian_item_id: b.id, qty: Number(qty[b.id] || 0) }))
        .filter((b) => b.qty > 0);
      if (returId) {
        await rpc(jual ? "ubah_retur_penjualan" : "ubah_retur_pembelian", {
          id: returId,
          tanggal,
          catatan,
          dicatat_oleh: user?.nama ?? "",
          items,
        });
        setInfo("Retur diperbarui. Stok dan sisa tagihan sudah disesuaikan.");
      } else {
        await rpc(jual ? "simpan_retur_penjualan" : "simpan_retur_pembelian", {
          penjualan_id: jual ? notaId : undefined,
          pembelian_id: jual ? undefined : notaId,
          tanggal,
          catatan,
          dicatat_oleh: user?.nama ?? "",
          items,
        });
        setInfo("Retur tersimpan. Stok dan sisa tagihan sudah diperbarui.");
      }
      setNotaId("");
      setCatatan("");
      setReturId("");
      setTambah(false);
      muatRiwayat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan retur");
    } finally {
      setSaving(false);
    }
  }

  function buka() {
    setError("");
    setInfo("");
    setNotaId("");
    setNotaAsal("");
    setBaris([]);
    setQty({});
    setTanggal(todayIso());
    setCatatan("");
    setReturId("");
    setNomorRetur("");
    setQtyAwal(null);
    setTambah(true);
  }

  async function bukaUbah(row: Riwayat) {
    setError("");
    setInfo("");
    const tabel = jual ? "retur_penjualan" : "retur_pembelian";
    const kolom = jual
      ? "id,tanggal,catatan,penjualan_id,retur_penjualan_item(penjualan_item_id,qty)"
      : "id,tanggal,catatan,pembelian_id,retur_pembelian_item(pembelian_item_id,qty)";
    const { data, error: err } = await db().from(tabel).select(kolom).eq("id", row.id).maybeSingle();
    if (err || !data) {
      setError(err?.message || "Retur tidak ditemukan");
      return;
    }
    const isi = data as {
      tanggal: string;
      catatan: string | null;
      penjualan_id?: string;
      pembelian_id?: string;
      retur_penjualan_item?: { penjualan_item_id: string; qty: number }[];
      retur_pembelian_item?: { pembelian_item_id: string; qty: number }[];
    };
    const peta: Record<string, string> = {};
    if (jual) {
      for (const item of isi.retur_penjualan_item ?? []) peta[item.penjualan_item_id] = String(item.qty);
    } else {
      for (const item of isi.retur_pembelian_item ?? []) peta[item.pembelian_item_id] = String(item.qty);
    }
    setQtyAwal(peta);
    setSunting((n) => n + 1);
    setNomorRetur(row.nomor);
    setNotaAsal(row.nota);
    setTanggal(isi.tanggal);
    setCatatan(isi.catatan ?? "");
    setReturId(row.id);
    setNotaId(jual ? isi.penjualan_id ?? row.asalId : isi.pembelian_id ?? row.asalId);
    setTambah(true);
  }

  const daftarNota = notaId && !nota.some((n) => n.id === notaId)
    ? [{ id: notaId, nomor: notaAsal || "Nota asal" }, ...nota]
    : nota;
  const saring = Boolean(dari || sampai);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">{jual ? "Retur Penjualan" : "Retur Pembelian"}</h1>
        <button
          type="button"
          onClick={buka}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
        >
          Tambah
        </button>
      </div>
      {error && !tambah && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}
      {info && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{info}</p>}
      <div className="mb-4">
        <SaringTanggal dari={dari} sampai={sampai} onDari={setDari} onSampai={setSampai} />
      </div>
      {tambah && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="font-semibold text-gray-900">{returId ? `Ubah ${nomorRetur}` : jual ? "Retur penjualan baru" : "Retur pembelian baru"}</h2>
              <button type="button" onClick={() => setTambah(false)} className="inline-flex h-10 w-10 items-center justify-center text-2xl leading-none text-gray-900" aria-label="Tutup">&times;</button>
            </div>
            <div className="overflow-y-auto px-5 py-5">
              {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-gray-600">
                  Nota asal
                  <select value={notaId} onChange={(e) => setNotaId(e.target.value)} disabled={Boolean(returId)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-50">
                    <option value="">Pilih nota</option>
                    {daftarNota.map((n) => (
                      <option key={n.id} value={n.id}>{n.nomor}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-gray-600">
                  Tanggal
                  <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                </label>
              </div>
              {baris.length > 0 && (
                <table className="mb-4 w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2">Barang</th>
                      <th>Qty nota</th>
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
                            className="w-24 rounded-lg border border-gray-300 px-2 py-1"
                            placeholder="0"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <label className="mb-4 block text-sm text-gray-600">
                Catatan
                <input value={catatan} onChange={(e) => setCatatan(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setTambah(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">
                  Batal
                </button>
                <button onClick={simpan} disabled={saving || !notaId || user?.latihan} className="rounded-lg bg-orange-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                  {saving ? "Menyimpan..." : returId ? "Simpan perubahan" : "Simpan retur"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {riwayat.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">
          {saring ? "Tidak ada retur pada tanggal itu" : "Belum ada retur"}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {["Nomor", "Tanggal", "Nota asal", jual ? "Pelanggan" : "Supplier", "Total"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {riwayat.map((r) => (
                <tr key={r.id} onClick={() => bukaUbah(r)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-orange-700">{r.nomor}</td>
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
