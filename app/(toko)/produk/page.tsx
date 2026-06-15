"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Produk, KategoriProduk, Satuan } from "@/lib/types";
import ProdukModal from "./ProdukModal";

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function ProdukPage() {
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [kategoriList, setKategoriList] = useState<KategoriProduk[]>([]);
  const [satuanList, setSatuanList] = useState<Satuan[]>([]);
  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<Produk | null>(null);

  async function fetchData() {
    setLoading(true);
    const toko = supabase.schema("toko");
    const [{ data: produk }, { data: kategori }, { data: satuan }] =
      await Promise.all([
        toko.from("produk")
          .select("*, kategori_produk(id,nama), satuan(id,nama)")
          .eq("aktif", true)
          .order("nama"),
        toko.from("kategori_produk").select("*").order("nama"),
        toko.from("satuan").select("*").order("nama"),
      ]);
    setProdukList(produk ?? []);
    setKategoriList(kategori ?? []);
    setSatuanList(satuan ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  const filtered = produkList.filter((p) => {
    const matchSearch = p.nama.toLowerCase().includes(search.toLowerCase()) ||
      (p.kode_sku ?? "").toLowerCase().includes(search.toLowerCase());
    const matchKategori = filterKategori ? p.kategori_id === filterKategori : true;
    return matchSearch && matchKategori;
  });

  function handleTambah() {
    setEditData(null);
    setModalOpen(true);
  }

  function handleEdit(p: Produk) {
    setEditData(p);
    setModalOpen(true);
  }

  async function handleNonaktif(id: string) {
    if (!confirm("Nonaktifkan produk ini?")) return;
    await supabase.schema("toko").from("produk").update({ aktif: false }).eq("id", id);
    fetchData();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Produk</h1>
        <button
          onClick={handleTambah}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700"
        >
          + Tambah Produk
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Cari nama / SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <select
          value={filterKategori}
          onChange={(e) => setFilterKategori(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="">Semua Kategori</option>
          {kategoriList.map((k) => (
            <option key={k.id} value={k.id}>{k.nama}</option>
          ))}
        </select>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Tidak ada produk</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kode SKU</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nama Produk</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Satuan</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Harga Jual</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Varian</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.kode_sku ?? "-"}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.nama}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {(p.kategori_produk as KategoriProduk)?.nama ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {(p.satuan as Satuan)?.nama ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-800">{formatRp(p.harga_jual)}</td>
                  <td className="px-4 py-3 text-center">
                    {p.punya_varian ? (
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">Ya</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleEdit(p)}
                      className="text-orange-600 hover:underline text-xs mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleNonaktif(p.id)}
                      className="text-red-500 hover:underline text-xs"
                    >
                      Nonaktif
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <ProdukModal
          editData={editData}
          kategoriList={kategoriList}
          satuanList={satuanList}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchData(); }}
        />
      )}
    </div>
  );
}
