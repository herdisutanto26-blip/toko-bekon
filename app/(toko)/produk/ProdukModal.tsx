"use client";

import { useEffect, useRef, useState } from "react";
import InputUang from "@/components/InputUang";
import { supabase } from "@/lib/supabase";
import type { Produk, ProdukKemasan, KategoriProduk, Satuan } from "@/lib/types";

function huruf(kata: string) {
  return kata
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 2);
}

function kodeDariNama(nama: string) {
  const kata = nama.trim().split(/\s+/).map(huruf).filter((bagian) => bagian.length > 0);
  if (kata.length === 0) return "";
  if (kata.length === 1) {
    const penuh = nama.trim().split(/\s+/)[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    return penuh.slice(0, 4);
  }
  return `${kata[0]}${kata[1]}`;
}

async function buatSku(nama: string) {
  const kode = kodeDariNama(nama);
  if (kode.length < 2) return "";
  const toko = supabase.schema("toko");
  const { count } = await toko.from("produk").select("id", { count: "exact", head: true });
  let nomor = (count ?? 0) + 1;
  for (let i = 0; i < 30; i += 1) {
    const sku = `${kode}.${String(nomor).padStart(4, "0")}`;
    const { data } = await toko.from("produk").select("id").eq("kode_sku", sku).limit(1);
    if (!data?.length) return sku;
    nomor += 1;
  }
  return `${kode}.${nomor}`;
}

function ambilLabel(teks: string, label: string) {
  const re = new RegExp(`\\b${label}\\s*:\\s*([^\\n]+?)(?=\\s*(?:merek|supplier)\\s*:|$)`, "i");
  const ketemu = teks.match(re);
  if (!ketemu || ketemu.index == null) return { nilai: "", sisa: teks };
  const nilai = ketemu[1].replace(/[.\s]+$/, "").trim();
  const sisa = `${teks.slice(0, ketemu.index)} ${teks.slice(ketemu.index + ketemu[0].length)}`.replace(/\s{2,}/g, " ").trim();
  return { nilai, sisa };
}

function pisahCatatan(teks: string) {
  const supplier = ambilLabel(teks, "supplier");
  const merek = ambilLabel(supplier.sisa, "merek");
  const sisa = merek.sisa.replace(/^[.\s]+|[.\s]+$/g, "").trim();
  const ada = Boolean(merek.nilai || supplier.nilai);
  return {
    merek: merek.nilai,
    supplier: supplier.nilai,
    spek: ada ? sisa : "",
    keterangan: ada ? "" : teks.trim(),
  };
}

type Props = {
  editData: Produk | null;
  kategoriList: KategoriProduk[];
  satuanList: Satuan[];
  onClose: () => void;
  onSaved: () => void;
};

function nilaiAwal(editData: Produk | null) {
  const pecah = pisahCatatan(editData?.keterangan ?? "");
  const sudahAda = Boolean(editData?.merek || editData?.spek || editData?.nama_supplier);
  return {
    kode_sku: editData?.kode_sku ?? "",
    nama: editData?.nama ?? "",
    merek: editData?.merek || pecah.merek,
    spek: editData?.spek || pecah.spek,
    nama_supplier: editData?.nama_supplier || pecah.supplier,
    kategori_id: editData?.kategori_id ?? "",
    satuan_id: editData?.satuan_id ?? "",
    harga_beli: editData?.harga_beli ?? 0,
    harga_jual: editData?.harga_jual ?? 0,
    stok_minimum: editData?.stok_minimum ?? 0,
    stok: editData?.stok ?? 0,
    punya_varian: editData?.punya_varian ?? false,
    keterangan: sudahAda ? (editData?.keterangan ?? "") : pecah.keterangan,
  };
}

export default function ProdukModal({ editData, kategoriList, satuanList, onClose, onSaved }: Props) {
  const [form, setForm] = useState(() => nilaiAwal(editData));
  const [supplierPilihan, setSupplierPilihan] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [generatingSku, setGeneratingSku] = useState(false);
  const [error, setError] = useState("");
  const skuOtomatis = useRef(editData?.kode_sku ?? "");
  const skuTerkunci = useRef(Boolean(editData?.kode_sku));

  useEffect(() => {
    supabase.schema("toko").from("supplier").select("nama").eq("aktif", true).order("nama").limit(1000)
      .then(({ data }) => setSupplierPilihan(((data ?? []) as { nama: string }[]).map((row) => row.nama).filter(Boolean)));
  }, []);

  useEffect(() => {
    if (skuTerkunci.current) return;
    let batal = false;
    const timer = setTimeout(() => {
      buatSku(form.nama).then((sku) => {
        if (batal || !sku || skuTerkunci.current) return;
        skuOtomatis.current = sku;
        setForm((sekarang) => ({ ...sekarang, kode_sku: sku }));
      });
    }, 400);
    return () => {
      batal = true;
      clearTimeout(timer);
    };
  }, [form.nama]);

  async function handleGenerateSKU() {
    setGeneratingSku(true);
    setError("");
    const sku = await buatSku(form.nama);
    setGeneratingSku(false);
    if (!sku) { setError("Isi nama produk dulu, minimal dua huruf"); return; }
    skuOtomatis.current = sku;
    skuTerkunci.current = false;
    set("kode_sku", sku);
  }

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.nama.trim()) { setError("Nama produk wajib diisi"); return; }
    setSaving(true);
    setError("");

    const kode = form.kode_sku.trim() || await buatSku(form.nama);
    const payload = {
      kode_sku: kode || null,
      nama: form.nama.trim(),
      merek: form.merek.trim() || null,
      spek: form.spek.trim() || null,
      nama_supplier: form.nama_supplier.trim() || null,
      kategori_id: form.kategori_id || null,
      satuan_id: form.satuan_id || null,
      harga_beli: Number(form.harga_beli),
      harga_jual: Number(form.harga_jual),
      stok_minimum: Number(form.stok_minimum),
      ...(editData ? {} : { stok: Number(form.stok) }),
      punya_varian: form.punya_varian,
      keterangan: form.keterangan.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const toko = supabase.schema("toko");
    const { error: err } = editData
      ? await toko.from("produk").update(payload).eq("id", editData.id)
      : await toko.from("produk").insert(payload);

    setSaving(false);
    if (err) {
      setError(/merek|spek|nama_supplier|schema cache|PGRST204/i.test(err.message)
        ? "Kolom merek, spek, dan supplier belum ada di database. Jalankan file supabase/produk-merek.sql di SQL Editor Supabase, lalu simpan lagi."
        : err.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            {editData ? "Edit Produk" : "Tambah Produk"}
          </h2>
          <button onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center text-2xl leading-none text-gray-900" aria-label="Tutup">&times;</button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto px-5 py-5">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-900">Nama Produk *</label>
            <input
              value={form.nama}
              onChange={(e) => set("nama", e.target.value)}
              placeholder="Nama produk"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-900">Merek</label>
              <input
                value={form.merek}
                onChange={(e) => set("merek", e.target.value)}
                placeholder="aplus"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-900">Supplier</label>
              <input
                value={form.nama_supplier}
                onChange={(e) => set("nama_supplier", e.target.value)}
                list="daftar-supplier"
                placeholder="Nama supplier"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <datalist id="daftar-supplier">
                {supplierPilihan.map((nama) => <option key={nama} value={nama} />)}
              </datalist>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-900">Spek</label>
            <input
              value={form.spek}
              onChange={(e) => set("spek", e.target.value)}
              placeholder="Ukuran, tipe, atau warna"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-900">Kode SKU</label>
            <div className="flex gap-2">
              <input
                value={form.kode_sku}
                onChange={(e) => {
                  skuTerkunci.current = true;
                  set("kode_sku", e.target.value);
                }}
                placeholder="Terisi otomatis dari nama"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button
                type="button"
                onClick={handleGenerateSKU}
                disabled={generatingSku}
                className="px-3 py-2 text-xs font-medium bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 whitespace-nowrap"
              >
                {generatingSku ? "..." : "Buat SKU"}
              </button>
            </div>
            <p className="mt-1 text-sm font-medium text-gray-700">2 huruf kata pertama + 2 huruf kata kedua, titik, lalu nomor urut. Contoh aplus gipsum menjadi apgi.2218</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-900">Kategori</label>
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
              <label className="mb-1 block text-sm font-semibold text-gray-900">Satuan</label>
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

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-900">Harga Beli</label>
              <InputUang
                value={form.harga_beli}
                onChange={(nilai) => set("harga_beli", nilai === "" ? 0 : Number(nilai))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-900">Harga Jual</label>
              <InputUang
                value={form.harga_jual}
                onChange={(nilai) => set("harga_jual", nilai === "" ? 0 : Number(nilai))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-900">Stok Minimum</label>
              <input
                type="number"
                value={form.stok_minimum}
                onChange={(e) => set("stok_minimum", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-900">
                {editData ? "Stok saat ini" : "Stok awal"}
              </label>
              <input
                type="number"
                value={form.stok}
                onChange={(e) => set("stok", e.target.value)}
                readOnly={!!editData}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 read-only:bg-gray-50"
              />
              {editData && <p className="mt-1 text-xs text-gray-500">Perubahan stok dicatat di menu Persediaan.</p>}
            </div>
          </div>

          {(editData?.kemasan?.length ?? 0) > 1 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
              <p className="text-xs font-medium text-orange-950 mb-1">Harga jual per kemasan</p>
              <ul className="text-sm text-gray-800 space-y-0.5">
                {[...(editData?.kemasan ?? [])]
                  .sort((a: ProdukKemasan, b: ProdukKemasan) => {
                    const stok = satuanList.find((s) => s.id === form.satuan_id)?.nama.toLowerCase() ?? "";
                    const rank = (satuan: string) => (satuan.toLowerCase() === stok ? 0 : 1);
                    return rank(a.satuan) - rank(b.satuan) || a.satuan.localeCompare(b.satuan, "id");
                  })
                  .map((k) => (
                    <li key={k.id}>
                      {k.satuan} · Rp {Math.round(Number(k.harga_jual) || 0).toLocaleString("id-ID")}
                      {k.konversi != null && Number(k.konversi) !== 1
                        ? ` · 1 ${k.satuan} = ${Number(k.konversi).toLocaleString("id-ID")} satuan stok`
                        : ""}
                    </li>
                  ))}
              </ul>
              <p className="text-[11px] text-orange-900 mt-1">
                Harga jual di atas adalah harga satuan stok. Stok gudang tetap di satuan itu.
              </p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-900">Keterangan</label>
            <textarea
              value={form.keterangan}
              onChange={(e) => set("keterangan", e.target.value)}
              rows={2}
              placeholder="Catatan lain. Merek, spek, dan supplier diisi di kolomnya sendiri."
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
        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-5 py-4">
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
