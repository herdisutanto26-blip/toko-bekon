"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import PesananForm from "@/components/PesananForm";
import { PilihBuku, type Buku } from "@/components/PilihBuku";
import SaringTanggal from "@/components/SaringTanggal";
import { db } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatRp, labelProyek, pesanError } from "@/lib/format";
import { supabase } from "@/lib/supabase";

type So = {
  id: string;
  nomor_so: string;
  tanggal: string;
  total: number;
  pelanggan: { nama: string } | null;
};

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

function kelompok(rows: Po[]) {
  const urutan: string[] = [];
  const map = new Map<string, Po[]>();
  for (const row of rows) {
    const kunci = row.kode_proyek?.trim() || "Tanpa proyek";
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

function Dialog({
  judul,
  onTutup,
  children,
}: {
  judul: string;
  onTutup: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">{judul}</h2>
          <button type="button" onClick={onTutup} className="inline-flex h-10 w-10 items-center justify-center text-2xl leading-none text-gray-900" aria-label="Tutup">×</button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

export default function PesananPage() {
  const { user } = useAuth();
  const [buku, setBuku] = useState<Buku>("umum");
  const [cari, setCari] = useState("");
  const [so, setSo] = useState<So[]>([]);
  const [po, setPo] = useState<Po[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");
  const [sukses, setSukses] = useState("");
  const [sibuk, setSibuk] = useState("");
  const [tambah, setTambah] = useState(false);
  const [ubahId, setUbahId] = useState<string | null>(null);
  const [poBuka, setPoBuka] = useState<Po | null>(null);
  const [segar, setSegar] = useState(0);
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("buku") === "bekon") setBuku("bekon");
  }, []);

  useEffect(() => {
    let batal = false;
    setMemuat(true);
    if (buku === "umum") {
      let q = db()
        .from("pesanan_penjualan")
        .select("id,nomor_so,tanggal,total,pelanggan(nama)")
        .eq("status", "menunggu");
      if (dari) q = q.gte("tanggal", dari);
      if (sampai) q = q.lte("tanggal", sampai);
      q.order("tanggal", { ascending: false })
        .order("id")
        .limit(dari || sampai ? 500 : 200)
        .then(({ data, error: err }) => {
          if (batal) return;
          if (err) setError(pesanError(err.message));
          else {
            setSo((data ?? []) as unknown as So[]);
            setError("");
          }
          setMemuat(false);
        });
    } else {
      supabase.rpc("daftar_pesanan_toko_bekon").then(({ data, error: err }) => {
        if (batal) return;
        if (err) setError(pesanError(err.message));
        else {
          setPo(((data ?? []) as Po[]).map((row) => ({ ...row, baris: sebagaiBaris(row.baris) })));
          setError("");
        }
        setMemuat(false);
      });
    }
    return () => { batal = true; };
  }, [buku, dari, sampai, segar]);

  const kata = cari.trim().toLowerCase();
  const soTampil = kata
    ? so.filter((row) => row.nomor_so.toLowerCase().includes(kata) || (row.pelanggan?.nama ?? "umum").toLowerCase().includes(kata))
    : so;
  const poTampil = po.filter((row) => {
    if (dari && row.tanggal < dari) return false;
    if (sampai && row.tanggal > sampai) return false;
    if (!kata) return true;
    const proyek = `${row.kode_proyek ?? ""} ${row.nama_pemilik ?? ""} ${row.nomor_po}`.toLowerCase();
    return proyek.includes(kata);
  });

  async function sahkan(row: Po) {
    if (!window.confirm(`Catat ${row.nomor_po} ke penjualan Bekon? Stok akan berkurang dan piutang tercatat.`)) return;
    setSibuk(row.po_id);
    setError("");
    setSukses("");
    const { data, error: err } = await supabase.rpc("sahkan_pesanan_toko_bekon", { p_po_id: row.po_id, p_kasir: user?.nama ?? "" });
    if (err) {
      setError(pesanError(err.message));
      setSibuk("");
      return;
    }
    const { data: jadi } = await db().from("penjualan").select("nomor_nota").eq("id", data).maybeSingle();
    setSukses(jadi?.nomor_nota ? `Nota ${jadi.nomor_nota} tercatat untuk ${row.nomor_po}.` : `Nota untuk ${row.nomor_po} tercatat.`);
    setPoBuka(null);
    setSibuk("");
    setSegar((n) => n + 1);
  }

  async function kembalikan(row: Po) {
    if (!window.confirm(`Kembalikan ${row.nomor_po} ke Bekon Pro? PO kembali ke isi pesanan supaya bisa disesuaikan.`)) return;
    setSibuk(row.po_id);
    setError("");
    setSukses("");
    const { error: err } = await supabase.rpc("kembalikan_pesanan_toko_bekon", { p_po_id: row.po_id });
    if (err) {
      setError(pesanError(err.message));
      setSibuk("");
      return;
    }
    setSukses(`${row.nomor_po} dikembalikan ke Bekon Pro.`);
    setPoBuka(null);
    setSibuk("");
    setSegar((n) => n + 1);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Pesanan Penjualan</h1>
        {buku === "umum" && (
          <button
            type="button"
            onClick={() => { setSukses(""); setUbahId(null); setTambah(true); }}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Tambah
          </button>
        )}
      </div>
      <PilihBuku nilai={buku} onPilih={(nilai) => { setBuku(nilai); setCari(""); setDari(""); setSampai(""); setTambah(false); setUbahId(null); setPoBuka(null); }} />
      <p className="mb-4 max-w-2xl text-sm text-gray-500">
        {buku === "bekon"
          ? "Pesanan masuk otomatis dari Bekon Pro. Buka barisnya untuk dicek. Kalau sudah benar, masukkan ke penjualan. Kalau tidak sesuai, kembalikan ke Bekon Pro."
          : "Sales order toko. Nomor SO keluar otomatis saat disimpan. Buka baris untuk diubah, lalu masukkan ke penjualan kalau sudah benar."}
      </p>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {sukses && (
        <p className="mb-3 text-sm text-green-700">
          {sukses}{" "}
          <Link href={buku === "bekon" ? "/penjualan?buku=bekon" : "/penjualan"} className="underline">Lihat penjualan</Link>
        </p>
      )}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <input
          type="text"
          placeholder={buku === "bekon" ? "Cari PO atau proyek..." : "Cari nomor SO atau pelanggan..."}
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <SaringTanggal dari={dari} sampai={sampai} onDari={setDari} onSampai={setSampai} />
      </div>
      {memuat ? (
        <p className="text-sm text-gray-500">Memuat data...</p>
      ) : buku === "umum" ? (
        soTampil.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">
            {kata || dari || sampai ? "Tidak ada pesanan pada saringan ini" : "Belum ada sales order yang menunggu"}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {["Nomor SO", "Tanggal", "Pelanggan", "Total"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {soTampil.map((row) => (
                  <tr
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setSukses(""); setTambah(false); setUbahId(row.id); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { setSukses(""); setTambah(false); setUbahId(row.id); } }}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-orange-700">{row.nomor_so}</td>
                    <td className="px-4 py-3">{row.tanggal}</td>
                    <td className="px-4 py-3">{row.pelanggan?.nama ?? "Umum"}</td>
                    <td className="px-4 py-3">{formatRp(Number(row.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : poTampil.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">
          {kata || dari || sampai ? "Tidak ada pesanan pada saringan ini" : "Belum ada pesanan Bekon yang menunggu pengecekan"}
        </div>
      ) : (
        <div className="space-y-6">
          {kelompok(poTampil).map((grup) => (
            <section key={grup.kunci}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2 className="font-semibold text-gray-900">{labelProyek(grup.kunci === "Tanpa proyek" ? "" : grup.kunci, grup.rows[0]?.nama_pemilik) || "Tanpa proyek"}</h2>
                <p className="text-sm text-gray-500">{grup.rows.length} pesanan · {formatRp(grup.rows.reduce((s, row) => s + Number(row.total), 0))}</p>
              </div>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                {grup.rows.map((row) => (
                  <button
                    key={row.po_id}
                    type="button"
                    onClick={() => { setSukses(""); setPoBuka(row); }}
                    className="flex w-full items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-left text-sm first:border-t-0 hover:bg-gray-50"
                  >
                    <span>
                      <span className="font-medium text-merek-biru-tua">{row.nomor_po}</span>
                      <span className="ml-2 text-gray-500">{[row.nomor_pengajuan, row.tanggal].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="text-gray-800">{formatRp(Number(row.total))} · {row.baris.length} barang</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {tambah && buku === "umum" && (
        <Dialog judul="Pesanan baru" onTutup={() => setTambah(false)}>
          <PesananForm
            onBatal={() => setTambah(false)}
            onTersimpan={(hasil) => {
              setTambah(false);
              setSukses(hasil.penjualanId ? `${hasil.nomor} masuk ke penjualan.` : `Tersimpan: ${hasil.nomor}`);
              setSegar((n) => n + 1);
            }}
          />
        </Dialog>
      )}
      {ubahId && buku === "umum" && (
        <Dialog judul="Ubah pesanan" onTutup={() => setUbahId(null)}>
          <PesananForm
            key={ubahId}
            pesananId={ubahId}
            onBatal={() => setUbahId(null)}
            onTersimpan={(hasil) => {
              setUbahId(null);
              setSukses(hasil.penjualanId ? `${hasil.nomor} masuk ke penjualan.` : `Tersimpan: ${hasil.nomor}`);
              setSegar((n) => n + 1);
            }}
          />
        </Dialog>
      )}
      {poBuka && buku === "bekon" && (
        <Dialog judul={poBuka.nomor_po} onTutup={() => setPoBuka(null)}>
          <p className="mb-1 text-sm text-gray-500">{[poBuka.nomor_pengajuan, poBuka.tanggal, labelProyek(poBuka.kode_proyek, poBuka.nama_pemilik)].filter(Boolean).join(" · ")}</p>
          <p className="mb-4 text-sm text-gray-500">Kalau isinya tidak sesuai, kembalikan ke Bekon Pro. Perubahan jumlah dilakukan di sana.</p>
          <table className="mb-4 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="py-2 font-medium">Barang</th>
                <th className="py-2 text-right font-medium">Jumlah</th>
                <th className="py-2 text-right font-medium">Harga</th>
                <th className="py-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {poBuka.baris.map((baris, i) => (
                <tr key={`${poBuka.po_id}-${i}`} className="border-t border-gray-100">
                  <td className="py-2 pr-3">
                    <p className={baris.cukup ? "text-gray-800" : "text-red-700"}>{baris.nama}</p>
                    {!baris.cukup && baris.pesan && <p className="mt-0.5 text-xs text-red-600">{baris.pesan}</p>}
                    {baris.satuan_asal && <p className="mt-0.5 text-xs text-gray-500">Satuan pesanan {baris.satuan_asal}, dipakai satuan katalog {baris.satuan}.</p>}
                    {baris.cukup && <p className="mt-0.5 text-xs text-gray-500">Stok muat {Number(baris.stok)} {baris.satuan}</p>}
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">{Number(baris.qty)} {baris.satuan}</td>
                  <td className="py-2 text-right whitespace-nowrap">{formatRp(Number(baris.harga))}</td>
                  <td className="py-2 text-right whitespace-nowrap">{formatRp(Number(baris.qty) * Number(baris.harga))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold text-gray-800">Total {formatRp(Number(poBuka.total))}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={sibuk === poBuka.po_id}
                onClick={() => kembalikan(poBuka)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Kembalikan ke Bekon
              </button>
              <button
                type="button"
                disabled={!poBuka.siap || sibuk === poBuka.po_id}
                onClick={() => sahkan(poBuka)}
                className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {sibuk === poBuka.po_id ? "Memproses..." : "Masuk penjualan"}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
