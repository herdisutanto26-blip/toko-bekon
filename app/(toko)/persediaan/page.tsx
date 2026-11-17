"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { db, rpc, semua } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatRp, pesanError, todayIso } from "@/lib/format";

type Barang = {
  id: string;
  nama: string;
  kode_sku: string | null;
  stok: number;
  harga_beli: number;
  satuan: { nama: string } | { nama: string }[] | null;
};

type BarisForm = { kunci: string; produkId: string; cari: string; qty: string };
type Jenis = "masuk" | "keluar";

type ItemNota = {
  produk_id: string;
  qty: number;
  nilai: number;
  produk: { nama: string; kode_sku: string | null } | { nama: string; kode_sku: string | null }[] | null;
};

type Nota = {
  id: string;
  nomor: string;
  tanggal: string;
  jenis: Jenis;
  keterangan: string | null;
  dicatat_oleh: string | null;
  penyesuaian_stok_item: ItemNota[] | ItemNota | null;
};

function namaSatuan(rel: Barang["satuan"]) {
  const row = Array.isArray(rel) ? rel[0] : rel;
  return row?.nama ?? "";
}

function namaProduk(rel: ItemNota["produk"]) {
  const row = Array.isArray(rel) ? rel[0] : rel;
  return row?.nama ?? "Barang";
}

function daftarItem(rel: Nota["penyesuaian_stok_item"]) {
  return Array.isArray(rel) ? rel : rel ? [rel] : [];
}

function barisKosong(): BarisForm {
  return { kunci: crypto.randomUUID(), produkId: "", cari: "", qty: "" };
}

export default function PersediaanPage() {
  const { user } = useAuth();
  const [barang, setBarang] = useState<Barang[]>([]);
  const [nota, setNota] = useState<Nota[]>([]);
  const [cari, setCari] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [jenis, setJenis] = useState<Jenis | null>(null);
  const [ubahId, setUbahId] = useState("");
  const [nomorUbah, setNomorUbah] = useState("");
  const [tanggal, setTanggal] = useState(todayIso());
  const [keterangan, setKeterangan] = useState("");
  const [baris, setBaris] = useState<BarisForm[]>([barisKosong()]);
  const [menyimpan, setMenyimpan] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function muat() {
    setMemuat(true);
    setError("");
    const produk = await semua<Barang>((dari, sampai) =>
      db()
        .from("produk")
        .select("id,nama,kode_sku,stok,harga_beli,satuan(nama)")
        .eq("aktif", true)
        .order("nama")
        .range(dari, sampai)
    );
    setBarang(produk);
    const riwayat = await db()
      .from("penyesuaian_stok")
      .select("id,nomor,tanggal,jenis,keterangan,dicatat_oleh,penyesuaian_stok_item(produk_id,qty,nilai,produk(nama,kode_sku))")
      .order("tanggal", { ascending: false })
      .order("nomor", { ascending: false })
      .limit(30);
    setMemuat(false);
    if (riwayat.error) {
      setNota([]);
      setError(pesanError(riwayat.error.message));
      return;
    }
    setNota((riwayat.data ?? []) as Nota[]);
  }

  useEffect(() => {
    if (jenis) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [jenis, ubahId]);

  useEffect(() => {
    muat().catch((err: unknown) => {
      setMemuat(false);
      setError(err instanceof Error ? err.message : "Gagal memuat persediaan");
    });
  }, []);

  const tampil = useMemo(() => {
    const kata = cari.trim().toLowerCase();
    if (!kata) return barang;
    return barang.filter((item) =>
      item.nama.toLowerCase().includes(kata) || (item.kode_sku ?? "").toLowerCase().includes(kata)
    );
  }, [barang, cari]);

  const nilai = barang.reduce((s, item) => s + Number(item.stok) * Number(item.harga_beli), 0);

  function buka(mode: Jenis) {
    setJenis(mode);
    setUbahId("");
    setNomorUbah("");
    setTanggal(todayIso());
    setKeterangan("");
    setBaris([barisKosong()]);
    setError("");
    setInfo("");
  }

  function bukaUbah(item: Nota) {
    const rinci = daftarItem(item.penyesuaian_stok_item);
    setJenis(item.jenis);
    setUbahId(item.id);
    setNomorUbah(item.nomor);
    setTanggal(item.tanggal);
    setKeterangan(item.keterangan ?? "");
    setBaris(rinci.length > 0 ? rinci.map((baris) => {
      const produk = Array.isArray(baris.produk) ? baris.produk[0] : baris.produk;
      return {
        kunci: crypto.randomUUID(),
        produkId: baris.produk_id,
        cari: `${produk?.kode_sku ?? ""} ${produk?.nama ?? ""}`.trim(),
        qty: String(Number(baris.qty)),
      };
    }) : [barisKosong()]);
    setError("");
    setInfo("");
  }

  function pilihBarang(kunci: string, produkId: string) {
    const item = barang.find((row) => row.id === produkId);
    setBaris((sekarang) => sekarang.map((row) => row.kunci === kunci
      ? { ...row, produkId, cari: item ? `${item.kode_sku ?? ""} ${item.nama}`.trim() : row.cari }
      : row));
  }

  async function simpan() {
    if (!jenis) return;
    const isi = baris
      .map((row) => ({ produk_id: row.produkId, qty: Number(row.qty) }))
      .filter((row) => row.produk_id);
    if (isi.length === 0) {
      setError("Pilih minimal satu barang");
      return;
    }
    if (isi.some((row) => !Number.isFinite(row.qty) || row.qty <= 0)) {
      setError("Jumlah tiap barang harus lebih dari nol");
      return;
    }
    const unik = new Set(isi.map((row) => row.produk_id));
    if (unik.size !== isi.length) {
      setError("Satu barang cukup ditulis sekali");
      return;
    }
    setMenyimpan(true);
    setError("");
    try {
      const nomor = ubahId
        ? await rpc("ubah_penyesuaian_stok", {
          id: ubahId,
          tanggal,
          keterangan: keterangan.trim(),
          dicatat_oleh: user?.nama ?? "",
          baris: isi,
        })
        : await rpc("catat_penyesuaian_stok", {
          jenis,
          tanggal,
          keterangan: keterangan.trim(),
          dicatat_oleh: user?.nama ?? "",
          baris: isi,
        });
      setInfo(ubahId
        ? `${nomor} diperbarui. Stok dan nilai persediaan mengikuti perubahan itu.`
        : `${nomor} tersimpan. Nilai persediaan di neraca mengikuti stok yang baru.`);
      setJenis(null);
      setUbahId("");
      await muat();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan penyesuaian");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Persediaan</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Stok gudang dan penyesuaian cek fisik. Item masuk menambah stok, item keluar mengurangi stok. Nilainya ikut berubah di Neraca.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => buka("masuk")} className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700">
            Item masuk
          </button>
          <button type="button" onClick={() => buka("keluar")} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
            Item keluar
          </button>
        </div>
      </div>

      <p className="mb-4 text-sm font-semibold text-gray-900">Nilai persediaan {formatRp(nilai)}</p>
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {info && <p className="mb-4 text-sm text-green-700">{info}</p>}

      {jenis && (
        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            simpan();
          }}
          className="mb-6 max-w-3xl rounded-xl border border-gray-200 bg-white p-4"
        >
          <p className="mb-3 font-semibold text-gray-900">
            {ubahId ? `Ubah ${nomorUbah}` : jenis === "masuk" ? "Item masuk (IM)" : "Item keluar (IK)"}
          </p>
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-gray-700">
              Tanggal
              <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            </label>
            <label className="text-sm text-gray-700">
              Keterangan
              <input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Cek fisik gudang" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            </label>
          </div>
          <div className="space-y-3">
            {baris.map((row) => {
              const item = barang.find((produk) => produk.id === row.produkId);
              const saran = row.cari.trim().length < 2
                ? []
                : barang.filter((produk) => {
                  const kata = row.cari.trim().toLowerCase();
                  return produk.nama.toLowerCase().includes(kata) || (produk.kode_sku ?? "").toLowerCase().includes(kata);
                }).slice(0, 8);
              const jumlah = Number(row.qty);
              const rupiah = item && Number.isFinite(jumlah) ? jumlah * Number(item.harga_beli) : 0;
              return (
                <div key={row.kunci} className="grid gap-2 sm:grid-cols-[1fr_8rem_9rem_auto]">
                  <div>
                    <input
                      value={row.cari}
                      onChange={(e) => setBaris((sekarang) => sekarang.map((itemBaris) => itemBaris.kunci === row.kunci ? { ...itemBaris, cari: e.target.value, produkId: "" } : itemBaris))}
                      placeholder="Cari nama atau SKU"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    {saran.length > 0 && !row.produkId && (
                      <div className="mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white">
                        {saran.map((produk) => (
                          <button
                            key={produk.id}
                            type="button"
                            onClick={() => pilihBarang(row.kunci, produk.id)}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-orange-50"
                          >
                            <span className="font-medium text-gray-900">{produk.nama}</span>
                            <span className="ml-2 text-gray-500">{produk.kode_sku} · stok {Number(produk.stok)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={row.qty}
                    onChange={(e) => setBaris((sekarang) => sekarang.map((itemBaris) => itemBaris.kunci === row.kunci ? { ...itemBaris, qty: e.target.value } : itemBaris))}
                    placeholder="Qty"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <p className="self-center text-sm text-gray-700">{item ? formatRp(rupiah) : ""}</p>
                  <button
                    type="button"
                    onClick={() => setBaris((sekarang) => sekarang.length === 1 ? [barisKosong()] : sekarang.filter((itemBaris) => itemBaris.kunci !== row.kunci))}
                    className="text-sm text-gray-500 hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={() => setBaris((sekarang) => [...sekarang, barisKosong()])} className="mt-3 text-sm font-medium text-orange-700 hover:underline">
            Tambah barang
          </button>
          <div className="mt-4 flex gap-2">
            <button disabled={menyimpan} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">
              {menyimpan ? "Menyimpan..." : "Simpan"}
            </button>
            <button type="button" onClick={() => { setJenis(null); setUbahId(""); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-800">
              Batal
            </button>
          </div>
        </form>
      )}

      <input
        value={cari}
        onChange={(e) => setCari(e.target.value)}
        placeholder="Cari stok: nama atau SKU"
        className="mb-4 w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />

      {memuat ? (
        <p className="text-sm text-gray-500">Memuat...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Satuan</th>
                <th className="px-4 py-3 text-right">Stok</th>
                <th className="px-4 py-3 text-right">Harga beli</th>
                <th className="px-4 py-3 text-right">Nilai</th>
              </tr>
            </thead>
            <tbody>
              {tampil.slice(0, 200).map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-700">{item.kode_sku ?? "-"}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.nama}</td>
                  <td className="px-4 py-3 text-gray-700">{namaSatuan(item.satuan) || "-"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(item.stok)}</td>
                  <td className="px-4 py-3 text-right">{formatRp(Number(item.harga_beli))}</td>
                  <td className="px-4 py-3 text-right">{formatRp(Number(item.stok) * Number(item.harga_beli))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!memuat && tampil.length > 200 && (
        <p className="mt-2 text-sm text-gray-500">Menampilkan 200 dari {tampil.length} barang. Persempit pencarian untuk melihat yang lain. Nilai di atas tetap menghitung semua stok.</p>
      )}

      <h2 className="mb-3 mt-8 font-semibold text-gray-800">Riwayat penyesuaian</h2>
      {nota.length === 0 ? (
        <p className="text-sm text-gray-500">Belum ada item masuk atau item keluar.</p>
      ) : (
        <div className="max-w-3xl space-y-3">
          {nota.map((item) => {
            const rinci = daftarItem(item.penyesuaian_stok_item);
            const total = rinci.reduce((s, baris) => s + Number(baris.nilai), 0);
            return (
              <section
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => bukaUbah(item)}
                onKeyDown={(e) => { if (e.key === "Enter") bukaUbah(item); }}
                className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-gray-900">{item.nomor}</p>
                  <p className="text-sm text-gray-600">{item.tanggal} · {item.jenis === "masuk" ? "Item masuk" : "Item keluar"}</p>
                </div>
                {item.keterangan && <p className="mt-1 text-sm text-gray-700">{item.keterangan}</p>}
                <ul className="mt-2 space-y-1 text-sm text-gray-800">
                  {rinci.map((baris, index) => (
                    <li key={`${item.id}-${index}`}>{namaProduk(baris.produk)} · {Number(baris.qty)} · {formatRp(Number(baris.nilai))}</li>
                  ))}
                </ul>
                <p className="mt-2 text-sm font-semibold text-gray-900">{item.jenis === "masuk" ? "Nilai masuk" : "Nilai keluar"} {formatRp(total)}</p>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
