"use client";

import { useEffect, useState } from "react";
import BarangForm from "@/components/BarangForm";
import SaringTanggal from "@/components/SaringTanggal";
import { Daftar } from "../penjualan/page";
import { db } from "@/lib/api";
import { pesanError, sisaTagihan } from "@/lib/format";

type Row = {
  id: string;
  nomor_po: string;
  tanggal: string;
  total: number;
  dibayar: number;
  status_bayar: string;
  supplier: { nama: string } | null;
  retur_pembelian: { total: number }[];
};

const KOLOM = "id,nomor_po,tanggal,total,dibayar,status_bayar,supplier(nama),retur_pembelian(total)";

function teksAman(kata: string) {
  return kata.trim().toLowerCase().replace(/[%_,().*\\"]/g, " ").replace(/\s+/g, " ").trim();
}

function dasarPembelian(dari: string, sampai: string) {
  let q = db().from("pembelian").select(KOLOM);
  if (dari) q = q.gte("tanggal", dari);
  if (sampai) q = q.lte("tanggal", sampai);
  return q.order("tanggal", { ascending: false }).order("id");
}

async function ambilPembelian(kata: string, dari: string, sampai: string) {
  const cari = teksAman(kata);
  const saring = Boolean(dari || sampai);
  if (!cari) {
    const { data, error } = await dasarPembelian(dari, sampai).limit(saring ? 500 : 40);
    if (error) throw new Error(pesanError(error.message));
    const rows = (data ?? []) as unknown as Row[];
    return { rows, jumlah: rows.length };
  }
  const { data: pihak, error: errPihak } = await db().from("supplier").select("id").ilike("nama", `%${cari}%`).limit(200);
  if (errPihak) throw new Error(pesanError(errPihak.message));
  const ids = ((pihak ?? []) as { id: string }[]).map((p) => p.id);
  const bagian = [`nomor_po.ilike."%${cari}%"`];
  if (ids.length) bagian.push(`supplier_id.in.(${ids.join(",")})`);
  const { data, error, count } = await dasarPembelian(dari, sampai)
    .or(bagian.join(","))
    .limit(500);
  if (error) throw new Error(pesanError(error.message));
  const rows = (data ?? []) as unknown as Row[];
  return { rows, jumlah: count ?? rows.length };
}

export default function PembelianPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [jumlah, setJumlah] = useState(0);
  const [cari, setCari] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");
  const [tambah, setTambah] = useState(false);
  const [pesan, setPesan] = useState("");
  const [segar, setSegar] = useState(0);
  const [ubahId, setUbahId] = useState<string | null>(null);
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");

  useEffect(() => {
    let batal = false;
    const timer = setTimeout(() => {
      setMemuat(true);
      ambilPembelian(cari, dari, sampai)
        .then((hasil) => {
          if (batal) return;
          setRows(hasil.rows);
          setJumlah(hasil.jumlah);
          setError("");
        })
        .catch((err: Error) => {
          if (!batal) setError(err.message);
        })
        .finally(() => {
          if (!batal) setMemuat(false);
        });
    }, cari.trim() ? 300 : 0);
    return () => {
      batal = true;
      clearTimeout(timer);
    };
  }, [cari, dari, sampai, segar]);

  const kata = cari.trim().toLowerCase();
  const daftar = rows.map((r) => ({
          id: r.id,
          href: `/pembelian/${r.id}`,
          nomor: r.nomor_po,
          tanggal: r.tanggal,
          pihak: r.supplier?.nama ?? "-",
          total: r.total,
          sisa: sisaTagihan(r.total, r.dibayar, (r.retur_pembelian ?? []).reduce((s, x) => s + Number(x.total), 0)),
          status: r.status_bayar,
        }));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Pembelian</h1>
        <button
          type="button"
          onClick={() => { setPesan(""); setUbahId(null); setTambah(true); }}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
        >
          Tambah
        </button>
      </div>
      {pesan && <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Tersimpan: {pesan}</p>}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <input
          type="text"
          placeholder="Cari supplier..."
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <SaringTanggal dari={dari} sampai={sampai} onDari={setDari} onSampai={setSampai} />
      </div>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {memuat ? (
        <p className="text-sm text-gray-500 mb-4">Memuat data...</p>
      ) : (
        <>
          {(kata || dari || sampai) && <p className="text-xs text-gray-400 mb-2">{jumlah} nota{jumlah >= 500 ? ", menampilkan 500 pertama" : ""}</p>}
          <Daftar
            kosong={kata || dari || sampai ? "Tidak ada pembelian pada saringan ini" : "Belum ada pembelian"}
            rows={daftar}
            onPilih={(id) => { setPesan(""); setTambah(false); setUbahId(id); }}
          />
        </>
      )}
      {tambah && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="font-semibold text-gray-900">Pembelian baru</h2>
              <button type="button" onClick={() => setTambah(false)} className="inline-flex h-10 w-10 items-center justify-center text-2xl leading-none text-gray-900" aria-label="Tutup">&times;</button>
            </div>
            <div className="overflow-y-auto px-5 py-5">
              <BarangForm
                mode="beli"
                tanpaKartu
                onBatal={() => setTambah(false)}
                onTersimpan={(hasil) => {
                  setTambah(false);
                  setPesan(hasil.nomor);
                  setSegar((n) => n + 1);
                }}
              />
            </div>
          </div>
        </div>
      )}
      {ubahId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="font-semibold text-gray-900">Ubah pembelian</h2>
              <button type="button" onClick={() => setUbahId(null)} className="inline-flex h-10 w-10 items-center justify-center text-2xl leading-none text-gray-900" aria-label="Tutup">&times;</button>
            </div>
            <div className="overflow-y-auto px-5 py-5">
              <BarangForm
                key={ubahId}
                mode="beli"
                tanpaKartu
                notaId={ubahId}
                onBatal={() => setUbahId(null)}
                onTersimpan={(hasil) => {
                  setUbahId(null);
                  setPesan(hasil.nomor);
                  setSegar((n) => n + 1);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
