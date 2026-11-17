"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { semua } from "@/lib/api";
import type { Produk, ProdukKemasan, KategoriProduk, Satuan } from "@/lib/types";
import ProdukModal from "./ProdukModal";

type BarisProduk = Produk & { supplierNama: string };

type BarisBeli = {
  produk_id: string;
  pembelian: { supplier: { nama: string } | null } | null;
};

function namaSupplier(peta: Map<string, Set<string>>, id: string) {
  const daftar = [...(peta.get(id) ?? [])].filter((nama) => nama.trim().toLowerCase() !== "tanpa supplier");
  if (daftar.length === 0) return "-";
  return daftar.sort((a, b) => a.localeCompare(b, "id")).join(", ");
}

function formatRp(n: number) {
  return "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
}

function kemasanUrut(p: Produk): ProdukKemasan[] {
  const daftar = p.kemasan ?? [];
  const stok = (p.satuan as Satuan | undefined)?.nama?.toLowerCase() ?? "";
  return [...daftar].sort((a, b) => {
    const au = a.satuan.toLowerCase() === stok ? 0 : 1;
    const bu = b.satuan.toLowerCase() === stok ? 0 : 1;
    return au - bu || a.satuan.localeCompare(b.satuan, "id");
  });
}

export default function ProdukPage() {
  const [produkList, setProdukList] = useState<BarisProduk[]>([]);
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
    const [produk, { data: kategori }, { data: satuan }, kemasan, beli] = await Promise.all([
      semua<Produk>((dari, sampai) =>
        toko
          .from("produk")
          .select("*, kategori_produk(id,nama), satuan(id,nama)")
          .eq("aktif", true)
          .order("nama")
          .range(dari, sampai)
      ),
      toko.from("kategori_produk").select("*").order("nama"),
      toko.from("satuan").select("*").order("nama"),
      semua<ProdukKemasan>((dari, sampai) =>
        toko
          .from("produk_kemasan")
          .select("id, produk_id, satuan, harga_jual, konversi")
          .order("produk_id")
          .range(dari, sampai)
      ).catch(() => [] as ProdukKemasan[]),
      semua<BarisBeli>((dari, sampai) =>
        toko
          .from("pembelian_item")
          .select("produk_id,pembelian(supplier(nama))")
          .order("id")
          .range(dari, sampai)
      ).catch(() => [] as BarisBeli[]),
    ]);
    const grup = new Map<string, ProdukKemasan[]>();
    for (const baris of kemasan) {
      const daftar = grup.get(baris.produk_id) ?? [];
      daftar.push(baris);
      grup.set(baris.produk_id, daftar);
    }
    const petaSupplier = new Map<string, Set<string>>();
    for (const baris of beli) {
      const nama = baris.pembelian?.supplier?.nama?.trim();
      if (!nama) continue;
      const ada = petaSupplier.get(baris.produk_id) ?? new Set<string>();
      ada.add(nama);
      petaSupplier.set(baris.produk_id, ada);
    }
    setProdukList(produk.map((p) => ({
      ...p,
      kemasan: grup.get(p.id) ?? [],
      supplierNama: (p.nama_supplier ?? "").trim() || namaSupplier(petaSupplier, p.id),
    })));
    setKategoriList(kategori ?? []);
    setSatuanList(satuan ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  const filtered = produkList.filter((p) => {
    const kata = search.toLowerCase();
    const matchSearch = p.nama.toLowerCase().includes(kata) ||
      (p.kode_sku ?? "").toLowerCase().includes(kata) ||
      p.supplierNama.toLowerCase().includes(kata) ||
      (p.merek ?? "").toLowerCase().includes(kata) ||
      (p.spek ?? "").toLowerCase().includes(kata);
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
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Produk</h1>
        <button
          onClick={handleTambah}
          className="rounded-lg bg-orange-600 px-4 py-3 text-base font-semibold text-white hover:bg-orange-700 sm:py-2 sm:text-sm"
        >
          + Tambah Produk
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Cari nama, SKU, atau supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 sm:w-64"
        />
        <select
          value={filterKategori}
          onChange={(e) => setFilterKategori(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 sm:w-auto"
        >
          <option value="">Semua Kategori</option>
          {kategoriList.map((k) => (
            <option key={k.id} value={k.id}>{k.nama}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-base font-medium text-gray-800">Memuat data...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-base font-medium text-gray-800">Tidak ada produk</div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filtered.map((p) => {
              const kemasan = kemasanUrut(p);
              const satuan = kemasan.length > 1
                ? kemasan.map((k) => k.satuan).join(", ")
                : (p.satuan as Satuan)?.nama ?? "-";
              return (
                <article key={p.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-bold leading-snug text-gray-900">{p.nama}</p>
                      {(p.merek || p.spek) && (
                        <p className="mt-1 text-sm font-medium text-gray-800">{[p.merek, p.spek].filter(Boolean).join(" · ")}</p>
                      )}
                      <p className="mt-1 text-sm font-semibold text-gray-800">{p.kode_sku ?? "-"}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-800">
                    {(p.kategori_produk as KategoriProduk)?.nama ?? "-"} · {satuan}
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-800">Supplier {p.supplierNama}</p>
                  <div className="mt-2 text-sm font-semibold text-gray-900">
                    {kemasan.length > 1 ? (
                      <div className="space-y-1">
                        {kemasan.map((k) => (
                          <p key={k.id}>{k.satuan} · {formatRp(k.harga_jual)}</p>
                        ))}
                      </div>
                    ) : (
                      <p>{formatRp(p.harga_jual)}</p>
                    )}
                  </div>
                  {p.punya_varian && (
                    <p className="mt-2 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">Punya varian</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleEdit(p)}
                      className="flex-1 rounded-lg border border-orange-200 bg-orange-50 py-2.5 text-sm font-semibold text-orange-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleNonaktif(p.id)}
                      className="flex-1 rounded-lg border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700"
                    >
                      Nonaktif
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Kode SKU</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Nama Produk</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Supplier</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Kategori</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Satuan</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900">Harga Jual</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">Varian</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => {
                  const kemasan = kemasanUrut(p);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm font-medium text-gray-800">{p.kode_sku ?? "-"}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {p.nama}
                        {(p.merek || p.spek) && (
                          <p className="mt-0.5 text-xs font-medium text-gray-600">{[p.merek, p.spek].filter(Boolean).join(" · ")}</p>
                        )}
                      </td>
                      <td className="max-w-[16rem] px-4 py-3 text-gray-800">{p.supplierNama}</td>
                      <td className="px-4 py-3 text-gray-800">
                        {(p.kategori_produk as KategoriProduk)?.nama ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-800">
                        {kemasan.length > 1
                          ? kemasan.map((k) => k.satuan).join(", ")
                          : (p.satuan as Satuan)?.nama ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {kemasan.length > 1 ? (
                          <div className="space-y-0.5">
                            {kemasan.map((k) => (
                              <div key={k.id}>
                                {k.satuan} · {formatRp(k.harga_jual)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          formatRp(p.harga_jual)
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.punya_varian ? (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">Ya</span>
                        ) : (
                          <span className="text-gray-700">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleEdit(p)}
                          className="mr-3 text-sm font-semibold text-orange-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleNonaktif(p.id)}
                          className="text-sm font-semibold text-red-700 hover:underline"
                        >
                          Nonaktif
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

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
