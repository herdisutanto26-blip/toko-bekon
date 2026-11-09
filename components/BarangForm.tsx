"use client";

import { useEffect, useMemo, useState } from "react";
import { db, rpc, semua } from "@/lib/api";
import { formatRp, todayIso } from "@/lib/format";
import { useAuth } from "@/lib/auth";

type ProdukRingkas = {
  id: string;
  nama: string;
  kode_sku: string | null;
  harga_jual: number;
  harga_beli: number;
  stok: number;
};

type Baris = { key: string; produk_id: string; qty: string; harga: string };

type Pihak = { id: string; nama: string };

export default function BarangForm({
  mode,
}: {
  mode: "jual" | "beli";
}) {
  const { user } = useAuth();
  const jual = mode === "jual";
  const [produk, setProduk] = useState<ProdukRingkas[]>([]);
  const [pihak, setPihak] = useState<Pihak[]>([]);
  const [pihakId, setPihakId] = useState("");
  const [tanggal, setTanggal] = useState(todayIso());
  const [catatan, setCatatan] = useState("");
  const [diskon, setDiskon] = useState("0");
  const [dibayar, setDibayar] = useState("");
  const [baris, setBaris] = useState<Baris[]>([{ key: "1", produk_id: "", qty: "1", harga: "" }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [nomor, setNomor] = useState("");

  useEffect(() => {
    semua<ProdukRingkas>((dari, sampai) =>
      db()
        .from("produk")
        .select("id,nama,kode_sku,harga_jual,harga_beli,stok")
        .eq("aktif", true)
        .order("nama")
        .range(dari, sampai)
    ).then(setProduk);
    const table = jual ? "pelanggan" : "supplier";
    semua<Pihak>((dari, sampai) =>
      db().from(table).select("id,nama").eq("aktif", true).order("nama").range(dari, sampai)
    ).then(setPihak);
  }, [jual]);

  const total = useMemo(() => {
    return baris.reduce((sum, b) => sum + Number(b.qty || 0) * Number(b.harga || 0), 0);
  }, [baris]);
  const grand = Math.max(0, total - Number(diskon || 0));

  function pilihProduk(key: string, id: string) {
    const item = produk.find((p) => p.id === id);
    setBaris((rows) =>
      rows.map((r) =>
        r.key === key
          ? { ...r, produk_id: id, harga: item ? String(jual ? item.harga_jual : item.harga_beli) : r.harga }
          : r
      )
    );
  }

  async function simpan() {
    setError("");
    if (!jual && !pihakId) {
      setError("Supplier wajib diisi");
      return;
    }
    const items = baris
      .filter((b) => b.produk_id && Number(b.qty) > 0)
      .map((b) => ({ produk_id: b.produk_id, qty: Number(b.qty), harga_satuan: Number(b.harga || 0) }));
    if (items.length === 0) {
      setError("Isi minimal satu barang");
      return;
    }
    setSaving(true);
    try {
      const id = await rpc(jual ? "simpan_penjualan" : "simpan_pembelian", {
        tanggal,
        pelanggan_id: jual ? pihakId : undefined,
        supplier_id: jual ? undefined : pihakId,
        catatan,
        diskon: Number(diskon || 0),
        dibayar: dibayar === "" ? grand : Number(dibayar),
        dicatat_oleh: user?.nama ?? "",
        items,
      });
      const table = jual ? "penjualan" : "pembelian";
      const col = jual ? "nomor_nota" : "nomor_po";
      const { data } = await db().from(table).select(col).eq("id", id).maybeSingle();
      const row = data as Record<string, string> | null;
      setNomor(row?.[col] ?? "tersimpan");
      setBaris([{ key: String(Date.now()), produk_id: "", qty: "1", harga: "" }]);
      setCatatan("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
      <h2 className="font-semibold text-gray-800 mb-4">{jual ? "Nota baru" : "Pembelian baru"}</h2>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}
      {nomor && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">Tersimpan: {nomor}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <label className="text-sm text-gray-600">
          Tanggal
          <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
        </label>
        <label className="text-sm text-gray-600 md:col-span-2">
          {jual ? "Pelanggan (kosongkan jika umum)" : "Supplier"}
          <select value={pihakId} onChange={(e) => setPihakId(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
            <option value="">{jual ? "— Umum —" : "— Pilih supplier —"}</option>
            {pihak.map((p) => (
              <option key={p.id} value={p.id}>{p.nama}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="space-y-2 mb-4">
        {baris.map((b) => {
          const item = produk.find((p) => p.id === b.produk_id);
          return (
            <div key={b.key} className="grid grid-cols-12 gap-2">
              <select value={b.produk_id} onChange={(e) => pilihProduk(b.key, e.target.value)} className="col-span-6 border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Pilih barang</option>
                {produk.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} {p.kode_sku ? `(${p.kode_sku})` : ""} — stok {p.stok}
                  </option>
                ))}
              </select>
              <input value={b.qty} onChange={(e) => setBaris((rows) => rows.map((r) => r.key === b.key ? { ...r, qty: e.target.value } : r))} className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Qty" />
              <input value={b.harga} onChange={(e) => setBaris((rows) => rows.map((r) => r.key === b.key ? { ...r, harga: e.target.value } : r))} className="col-span-3 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Harga" />
              <button type="button" onClick={() => setBaris((rows) => rows.filter((r) => r.key !== b.key))} className="col-span-1 text-gray-400">×</button>
              {item && jual && Number(b.qty) > item.stok && (
                <p className="col-span-12 text-xs text-red-600">Stok {item.nama} tinggal {item.stok}</p>
              )}
            </div>
          );
        })}
        <button type="button" onClick={() => setBaris((rows) => [...rows, { key: String(Date.now()), produk_id: "", qty: "1", harga: "" }])} className="text-sm text-orange-700">
          + Baris
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {jual && (
          <label className="text-sm text-gray-600">
            Diskon
            <input value={diskon} onChange={(e) => setDiskon(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
          </label>
        )}
        <label className="text-sm text-gray-600">
          Dibayar sekarang (kosong = lunas)
          <input value={dibayar} onChange={(e) => setDibayar(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
        </label>
        <label className="text-sm text-gray-600 md:col-span-3">
          Catatan
          <input value={catatan} onChange={(e) => setCatatan(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
        </label>
      </div>
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-800">Total {formatRp(grand)}</p>
        <button onClick={simpan} disabled={saving || user?.latihan} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </div>
  );
}
