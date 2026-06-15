"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { KategoriProduk, Satuan } from "@/lib/types";

const KATEGORI_DEFAULT = [
  { nama: "Semen & Pasir", keterangan: "Semen, pasir, kerikil, agregat" },
  { nama: "Besi & Baja", keterangan: "Besi beton, baja ringan, hollow, wire mesh" },
  { nama: "Bata & Batako", keterangan: "Bata merah, batako, hebel" },
  { nama: "Cat & Pelapis", keterangan: "Cat tembok, cat kayu, waterproofing, plamir" },
  { nama: "Pipa & Sanitasi", keterangan: "Pipa PVC, fitting, kloset, wastafel, kran" },
  { nama: "Keramik & Granit", keterangan: "Keramik lantai, keramik dinding, granit" },
  { nama: "Kayu & Triplek", keterangan: "Kayu balok, papan, triplek, multiplek, GRC" },
  { nama: "Atap & Rangka", keterangan: "Genteng, spandek, galvalum, baja ringan" },
  { nama: "Listrik & Kabel", keterangan: "Kabel, stop kontak, saklar, MCB, fitting" },
  { nama: "Alat & Perkakas", keterangan: "Palu, gergaji, sekop, cangkul, meteran" },
  { nama: "Kunci & Engsel", keterangan: "Kunci pintu, engsel, handle, gerendel" },
  { nama: "Lem & Kimia", keterangan: "Lem kayu, lem keramik, silikon, cat anti bocor" },
];

const SATUAN_DEFAULT = [
  "pcs", "sak", "kg", "ton",
  "m", "m²", "m³",
  "lembar", "batang", "roll", "dus", "liter", "set",
];

export default function MasterPage() {
  const [tab, setTab] = useState<"kategori" | "satuan">("kategori");
  const [kategoriList, setKategoriList] = useState<KategoriProduk[]>([]);
  const [satuanList, setSatuanList] = useState<Satuan[]>([]);
  const [loading, setLoading] = useState(true);

  // form kategori
  const [namaKategori, setNamaKategori] = useState("");
  const [ketKategori, setKetKategori] = useState("");
  const [editKategori, setEditKategori] = useState<KategoriProduk | null>(null);

  // form satuan
  const [namaSatuan, setNamaSatuan] = useState("");
  const [editSatuan, setEditSatuan] = useState<Satuan | null>(null);

  const [msg, setMsg] = useState("");
  const [seeding, setSeeding] = useState(false);

  async function fetchAll() {
    setLoading(true);
    const toko = supabase.schema("toko");
    const [{ data: k }, { data: s }] = await Promise.all([
      toko.from("kategori_produk").select("*").order("nama"),
      toko.from("satuan").select("*").order("nama"),
    ]);
    setKategoriList(k ?? []);
    setSatuanList(s ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(""), 3000);
  }

  // ── KATEGORI ──
  async function simpanKategori() {
    if (!namaKategori.trim()) return;
    const toko = supabase.schema("toko");
    if (editKategori) {
      await toko.from("kategori_produk").update({ nama: namaKategori.trim(), keterangan: ketKategori || null }).eq("id", editKategori.id);
    } else {
      await toko.from("kategori_produk").insert({ nama: namaKategori.trim(), keterangan: ketKategori || null });
    }
    setNamaKategori(""); setKetKategori(""); setEditKategori(null);
    flash(editKategori ? "Kategori diperbarui" : "Kategori ditambahkan");
    fetchAll();
  }

  async function hapusKategori(id: string) {
    if (!confirm("Hapus kategori ini?")) return;
    await supabase.schema("toko").from("kategori_produk").delete().eq("id", id);
    flash("Kategori dihapus");
    fetchAll();
  }

  // ── SATUAN ──
  async function simpanSatuan() {
    if (!namaSatuan.trim()) return;
    const toko = supabase.schema("toko");
    if (editSatuan) {
      await toko.from("satuan").update({ nama: namaSatuan.trim() }).eq("id", editSatuan.id);
    } else {
      await toko.from("satuan").insert({ nama: namaSatuan.trim() });
    }
    setNamaSatuan(""); setEditSatuan(null);
    flash(editSatuan ? "Satuan diperbarui" : "Satuan ditambahkan");
    fetchAll();
  }

  async function hapusSatuan(id: string) {
    if (!confirm("Hapus satuan ini?")) return;
    await supabase.schema("toko").from("satuan").delete().eq("id", id);
    flash("Satuan dihapus");
    fetchAll();
  }

  // ── SEED DATA AWAL ──
  async function seedData() {
    if (!confirm("Isi data kategori & satuan standar? Data yang sudah ada tidak akan ditimpa.")) return;
    setSeeding(true);
    const toko = supabase.schema("toko");

    for (const k of KATEGORI_DEFAULT) {
      await toko.from("kategori_produk").upsert({ nama: k.nama, keterangan: k.keterangan }, { onConflict: "nama", ignoreDuplicates: true });
    }
    for (const s of SATUAN_DEFAULT) {
      await toko.from("satuan").upsert({ nama: s }, { onConflict: "nama", ignoreDuplicates: true });
    }

    setSeeding(false);
    flash("Data awal berhasil diisi!");
    fetchAll();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Master Data</h1>
        <button
          onClick={seedData}
          disabled={seeding}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {seeding ? "Mengisi..." : "Isi Data Awal"}
        </button>
      </div>

      {msg && (
        <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(["kategori", "satuan"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "kategori" ? "Kategori Produk" : "Satuan"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Memuat...</p>
      ) : tab === "kategori" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Form kategori */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-700 mb-4">
              {editKategori ? "Edit Kategori" : "Tambah Kategori"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Kategori *</label>
                <input
                  value={namaKategori}
                  onChange={(e) => setNamaKategori(e.target.value)}
                  placeholder="Contoh: Semen & Pasir"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Keterangan</label>
                <input
                  value={ketKategori}
                  onChange={(e) => setKetKategori(e.target.value)}
                  placeholder="Opsional"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={simpanKategori}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700"
                >
                  {editKategori ? "Update" : "Tambah"}
                </button>
                {editKategori && (
                  <button
                    onClick={() => { setEditKategori(null); setNamaKategori(""); setKetKategori(""); }}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Batal
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* List kategori */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 text-sm font-medium text-gray-600">
              {kategoriList.length} Kategori
            </div>
            {kategoriList.length === 0 ? (
              <p className="p-5 text-sm text-gray-400">Belum ada kategori. Klik "Isi Data Awal" untuk mengisi otomatis.</p>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {kategoriList.map((k) => (
                  <li key={k.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{k.nama}</p>
                      {k.keterangan && <p className="text-xs text-gray-400">{k.keterangan}</p>}
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button
                        onClick={() => { setEditKategori(k); setNamaKategori(k.nama); setKetKategori(k.keterangan ?? ""); }}
                        className="text-xs text-orange-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => hapusKategori(k.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Form satuan */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-700 mb-4">
              {editSatuan ? "Edit Satuan" : "Tambah Satuan"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Satuan *</label>
                <input
                  value={namaSatuan}
                  onChange={(e) => setNamaSatuan(e.target.value)}
                  placeholder="Contoh: pcs, kg, sak, lembar"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <p className="text-xs text-gray-400">
                Gunakan satu satuan untuk satu konsep. Contoh: pakai <strong>pcs</strong> saja, jangan tambah bh/buah/unit yang artinya sama.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={simpanSatuan}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700"
                >
                  {editSatuan ? "Update" : "Tambah"}
                </button>
                {editSatuan && (
                  <button
                    onClick={() => { setEditSatuan(null); setNamaSatuan(""); }}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Batal
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* List satuan */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 text-sm font-medium text-gray-600">
              {satuanList.length} Satuan
            </div>
            {satuanList.length === 0 ? (
              <p className="p-5 text-sm text-gray-400">Belum ada satuan. Klik "Isi Data Awal" untuk mengisi otomatis.</p>
            ) : (
              <div className="p-4 flex flex-wrap gap-2 max-h-96 overflow-y-auto">
                {satuanList.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5"
                  >
                    <span className="text-sm font-medium text-gray-700">{s.nama}</span>
                    <button
                      onClick={() => { setEditSatuan(s); setNamaSatuan(s.nama); }}
                      className="text-orange-500 hover:text-orange-700 text-xs"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => hapusSatuan(s.id)}
                      className="text-red-400 hover:text-red-600 text-xs leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
