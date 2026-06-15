"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Produk, KategoriProduk, Satuan } from "@/lib/types";

async function generateSKU(kategoriId: string, kategoriList: KategoriProduk[]): Promise<string> {
  const kategori = kategoriList.find((k) => k.id === kategoriId);
  const prefix = kategori
    ? "BKN-" + kategori.nama.substring(0, 3).toUpperCase().replace(/\s/g, "")
    : "BKN-PRD";

  // hitung berapa produk dengan prefix ini sudah ada
  const { count } = await supabase
    .schema("toko")
    .from("produk")
    .select("id", { count: "exact", head: true })
    .ilike("kode_sku", `${prefix}%`);

  const nomor = String((count ?? 0) + 1).padStart(3, "0");
  return `${prefix}-${nomor}`;
}

type Props = {
  editData: Produk | null;
  kategoriList: KategoriProduk[];
  satuanList: Satuan[];
  onClose: () => void;
  onSaved: () => void;
};

export default function ProdukModal({ editData, kategoriList, satuanList, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    kode_sku: editData?.kode_sku ?? "",
    nama: editData?.nama ?? "",
    kategori_id: editData?.kategori_id ?? "",
    satuan_id: editData?.satuan_id ?? "",
    harga_beli: editData?.harga_beli ?? 0,
    harga_jual: editData?.harga_jual ?? 0,
    stok_minimum: editData?.stok_minimum ?? 0,
    punya_varian: editData?.punya_varian ?? false,
    keterangan: editData?.keterangan ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [generatingSku, setGeneratingSku] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerateSKU() {
    if (!form.kategori_id) { setError("Pilih kategori dulu sebelum generate SKU"); return; }
    setGeneratingSku(true);
    setError("");
    const sku = await generateSKU(form.kategori_id, kategoriList);
    set("kode_sku", sku);
    setGeneratingSku(false);
  }

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.nama.trim()) { setError("Nama produk wajib diisi"); return; }
    setSaving(true);
    setError("");

    const payload = {
      kode_sku: form.kode_sku || null,
      nama: form.nama.trim(),
      kategori_id: form.kategori_id || null,
      satuan_id: form.satuan_id || null,
      harga_beli: Number(form.harga_beli),
      harga_jual: Number(form.harga_jual),
      stok_minimum: Number(form.stok_minimum),
      punya_varian: form.punya_varian,
      keterangan: form.keterangan || null,
      updated_at: new Date().toISOString(),
    };

    const toko = supabase.schema("toko");
    const { error: err } = editData
      ? await toko.from("produk").update(payload).eq("id", editData.id)
      : await toko.from("produk").insert(payload);

    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">
            {editData ? "Edit Produk" : "Tambah Produk"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nama Produk *</label>
            <input
              value={form.nama}
              onChange={(e) => set("nama", e.target.value)}
              placeholder="Nama produk"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Kode SKU</label>
            <div className="flex gap-2">
              <input
                value={form.kode_sku}
                onChange={(e) => set("kode_sku", e.target.value)}
                placeholder="Kosongkan untuk generate otomatis"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button
                type="button"
                onClick={handleGenerateSKU}
                disabled={generatingSku}
                title="Generate SKU otomatis (pilih kategori dulu)"
                className="px-3 py-2 text-xs font-medium bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 whitespace-nowrap"
              >
                {generatingSku ? "..." : "Generate SKU"}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Pilih kategori dulu, lalu klik Generate SKU</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kategori</label>
              <select
                value={form.kategori_id}
                onChange={(e) => set("kategori_id", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">-- Pilih Kategori --</option>
                {kategoriList.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Satuan</label>
              <select
                value={form.satuan_id}
                onChange={(e) => set("satuan_id", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">-- Pilih Satuan --</option>
                {satuanList.map((s) => (
                  <option key={s.id} value={s.id}>{s.nama}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Harga Beli</label>
              <input
                type="number"
                value={form.harga_beli}
                onChange={(e) => set("harga_beli", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Harga Jual</label>
              <input
                type="number"
                value={form.harga_jual}
                onChange={(e) => set("harga_jual", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stok Minimum</label>
              <input
                type="number"
                value={form.stok_minimum}
                onChange={(e) => set("stok_minimum", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Keterangan</label>
            <textarea
              value={form.keterangan}
              onChange={(e) => set("keterangan", e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.punya_varian}
              onChange={(e) => set("punya_varian", e.target.checked)}
              className="w-4 h-4 accent-orange-600"
            />
            <span className="text-sm text-gray-700">Produk ini punya varian (warna, ukuran, dll)</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
