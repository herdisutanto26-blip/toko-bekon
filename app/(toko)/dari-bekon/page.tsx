"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatRp, labelProyek, pesanError } from "@/lib/format";
import { supabase } from "@/lib/supabase";

type Baris = {
  nama: string;
  satuan: string;
  satuan_asal?: string | null;
  qty: number;
  harga: number;
  stok: number;
  cukup: boolean;
  pesan: string | null;
};

type Po = {
  po_id: string;
  nomor_po: string;
  nomor_pengajuan: string | null;
  kode_proyek: string | null;
  nama_proyek: string | null;
  nama_pemilik: string | null;
  tanggal: string;
  total: number;
  siap: boolean;
  baris: Baris[];
};

function kelompok<T>(rows: T[], kode: (row: T) => string | null) {
  const urutan: string[] = [];
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const kunci = kode(row)?.trim() || "Tanpa proyek";
    const ada = map.get(kunci);
    if (ada) ada.push(row);
    else {
      urutan.push(kunci);
      map.set(kunci, [row]);
    }
  }
  return urutan.map((kunci) => ({ kunci, rows: map.get(kunci) ?? [] }));
}

function sebagaiBaris(nilai: unknown): Baris[] {
  const data = typeof nilai === "string" ? JSON.parse(nilai) : nilai;
  return Array.isArray(data) ? (data as Baris[]) : [];
}

export default function DariBekonPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Po[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");
  const [sukses, setSukses] = useState("");
  const [sibuk, setSibuk] = useState("");
  const [bukaId, setBukaId] = useState("");

  function muat() {
    setMemuat(true);
    supabase.rpc("daftar_pesanan_toko_bekon").then(({ data, error: err }) => {
      if (err) setError(pesanError(err.message));
      else {
        setRows(((data ?? []) as Po[]).map((po) => ({ ...po, baris: sebagaiBaris(po.baris) })));
        setError("");
      }
      setMemuat(false);
    });
  }

  useEffect(() => { muat(); }, []);

  function lihat(poId: string) {
    setBukaId((sekarang) => (sekarang === poId ? "" : poId));
  }

  async function sahkan(po: Po) {
    if (!window.confirm(`Catat ${po.nomor_po} ke penjualan Bekon? Stok akan berkurang dan piutang tercatat.`)) return;
    setSibuk(po.po_id);
    setError("");
    setSukses("");
    const { data, error: err } = await supabase.rpc("sahkan_pesanan_toko_bekon", { p_po_id: po.po_id, p_kasir: user?.nama ?? "" });
    if (err) {
      setError(pesanError(err.message));
      setSibuk("");
      return;
    }
    const { data: jadi } = await db().from("penjualan").select("nomor_nota").eq("id", data).maybeSingle();
    setSukses(jadi?.nomor_nota ? `Nota ${jadi.nomor_nota} tercatat untuk ${po.nomor_po}.` : `Nota untuk ${po.nomor_po} tercatat.`);
    setSibuk("");
    muat();
  }

  async function kembalikan(po: Po) {
    if (!window.confirm(`Kembalikan ${po.nomor_po} ke Bekon? PO kembali ke isi pesanan supaya jumlahnya disesuaikan dengan stok.`)) return;
    setSibuk(po.po_id);
    setError("");
    setSukses("");
    const { error: err } = await supabase.rpc("kembalikan_pesanan_toko_bekon", { p_po_id: po.po_id });
    if (err) {
      setError(pesanError(err.message));
      setSibuk("");
      return;
    }
    setSukses(`${po.nomor_po} dikembalikan ke Bekon beserta stok yang tersedia.`);
    setSibuk("");
    muat();
  }

  const antrian = kelompok(rows, (po) => po.kode_proyek);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Dari Bekon</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-2xl">
        Pesanan yang sudah disetujui dan masuk cetak dan kirim. Cek isinya dan stoknya.
        Kalau sesuai, satu klik mencatat penjualan Bekon. Kalau stok kurang, kembalikan ke Bekon.
      </p>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {sukses && (
        <p className="text-sm text-green-700 mb-3">
          {sukses}{" "}
          <Link href="/penjualan?buku=bekon" className="underline">Lihat penjualan Bekon</Link>
        </p>
      )}

      {memuat ? (
        <p className="text-sm text-gray-500">Memuat data...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 mb-8">Belum ada pesanan yang menunggu pengecekan.</p>
      ) : (
        <div className="space-y-6 mb-10">
          {antrian.map((grup) => (
            <section key={grup.kunci}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h3 className="font-semibold text-gray-900">
                  {labelProyek(grup.kunci === "Tanpa proyek" ? "" : grup.kunci, grup.rows[0]?.nama_pemilik) || "Tanpa proyek"}
                </h3>
                <p className="text-sm text-gray-500">
                  {grup.rows.length} pesanan · {formatRp(grup.rows.reduce((s, po) => s + Number(po.total), 0))}
                </p>
              </div>
              <div className="space-y-3">
                {grup.rows.map((po) => (
                  <div key={po.po_id} className="border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-start justify-between gap-4 p-4">
                      <button type="button" onClick={() => lihat(po.po_id)} className="min-w-0 text-left">
                        <p className="font-semibold text-gray-800">{po.nomor_po}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {[po.nomor_pengajuan, po.tanggal].filter(Boolean).join(" · ")}
                        </p>
                        <p className="text-sm text-merek-biru-tua mt-2">
                          {bukaId === po.po_id ? "Tutup isi" : `Lihat isi · ${po.baris.length} barang`}
                        </p>
                        <p className="text-sm font-medium text-gray-800 mt-1">{formatRp(Number(po.total))}</p>
                      </button>
                      <div className="flex shrink-0 flex-col gap-2">
                        <button
                          type="button"
                          disabled={!po.siap || sibuk === po.po_id}
                          onClick={() => sahkan(po)}
                          className="bg-orange-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                        >
                          {sibuk === po.po_id ? "Memproses..." : "Masuk penjualan"}
                        </button>
                        {!po.siap && (
                          <button
                            type="button"
                            disabled={sibuk === po.po_id}
                            onClick={() => kembalikan(po)}
                            className="border border-gray-300 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                          >
                            Kembalikan ke Bekon
                          </button>
                        )}
                      </div>
                    </div>
                    {bukaId === po.po_id && (
                      <div className="border-t border-gray-100 px-4 pb-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-gray-500">
                              <th className="py-2 font-medium">Barang</th>
                              <th className="py-2 font-medium text-right">Jumlah</th>
                              <th className="py-2 font-medium text-right">Harga</th>
                              <th className="py-2 font-medium text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {po.baris.map((baris, i) => (
                              <tr key={`${po.po_id}-${i}`} className="border-t border-gray-100">
                                <td className="py-2 pr-3">
                                  <p className={baris.cukup ? "text-gray-800" : "text-red-700"}>{baris.nama}</p>
                                  {!baris.cukup && baris.pesan && <p className="text-xs text-red-600 mt-0.5">{baris.pesan}</p>}
                                  {baris.satuan_asal && (
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      Satuan pesanan {baris.satuan_asal}, dipakai satuan katalog {baris.satuan}. Jumlah tetap.
                                    </p>
                                  )}
                                  {baris.cukup && <p className="text-xs text-gray-500 mt-0.5">Stok muat {Number(baris.stok)} {baris.satuan}</p>}
                                </td>
                                <td className="py-2 text-right whitespace-nowrap">{Number(baris.qty)} {baris.satuan}</td>
                                <td className="py-2 text-right whitespace-nowrap">{formatRp(Number(baris.harga))}</td>
                                <td className="py-2 text-right whitespace-nowrap">{formatRp(Number(baris.qty) * Number(baris.harga))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
