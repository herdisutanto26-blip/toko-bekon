"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BarangForm from "@/components/BarangForm";
import { PilihBuku, type Buku } from "@/components/PilihBuku";
import SaringTanggal from "@/components/SaringTanggal";
import { db } from "@/lib/api";
import { formatRp, labelProyek, pesanError, sisaTagihan } from "@/lib/format";

type Row = {
  id: string;
  nomor_nota: string;
  tanggal: string;
  grand_total: number;
  dibayar: number;
  status_bayar: string;
  bekon_po_id: string | null;
  kode_proyek: string | null;
  nama_proyek: string | null;
  nama_pemilik: string | null;
  pelanggan: { nama: string } | null;
  retur_penjualan: { total: number }[];
};

const KOLOM = "id,nomor_nota,tanggal,grand_total,dibayar,status_bayar,bekon_po_id,kode_proyek,nama_proyek,nama_pemilik,pelanggan(nama),retur_penjualan(total)";

function teksAman(kata: string) {
  return kata.trim().toLowerCase().replace(/[%_,().*\\"]/g, " ").replace(/\s+/g, " ").trim();
}

function dasarPenjualan(buku: Buku, dari: string, sampai: string) {
  let q = db().from("penjualan").select(KOLOM);
  q = buku === "bekon" ? q.not("bekon_po_id", "is", null) : q.is("bekon_po_id", null);
  if (dari) q = q.gte("tanggal", dari);
  if (sampai) q = q.lte("tanggal", sampai);
  return q.order("tanggal", { ascending: false }).order("id");
}

function potong<T>(daftar: T[], ukuran: number) {
  const hasil: T[][] = [];
  for (let i = 0; i < daftar.length; i += ukuran) hasil.push(daftar.slice(i, i + ukuran));
  return hasil;
}

async function ambilPenjualan(buku: Buku, kata: string, dari: string, sampai: string) {
  const cari = teksAman(kata);
  const saring = Boolean(dari || sampai);
  const batas = cari || saring ? 500 : buku === "bekon" ? 200 : 40;
  if (!cari) {
    const { data, error } = await dasarPenjualan(buku, dari, sampai).limit(batas);
    if (error) throw new Error(pesanError(error.message));
    const rows = (data ?? []) as unknown as Row[];
    return { rows, jumlah: rows.length };
  }

  const { data: pihak, error: errPihak } = await db().from("pelanggan").select("id").ilike("nama", `%${cari}%`).limit(500);
  if (errPihak) throw new Error(pesanError(errPihak.message));
  const ids = ((pihak ?? []) as { id: string }[]).map((p) => p.id);
  const pola = `"%${cari}%"`;
  const teks = ["nomor_nota", "kode_proyek", "nama_pemilik"].map((kolom) => `${kolom}.ilike.${pola}`);
  if ("umum".includes(cari)) teks.push("pelanggan_id.is.null");
  const permintaan = [
    dasarPenjualan(buku, dari, sampai).or(teks.join(",")).limit(batas),
    ...potong(ids, 80).map((bagian) => dasarPenjualan(buku, dari, sampai).in("pelanggan_id", bagian).limit(batas)),
  ];
  const hasil = await Promise.all(permintaan);
  const gabung = new Map<string, Row>();
  let penuh = false;
  for (const bagian of hasil) {
    if (bagian.error) throw new Error(pesanError(bagian.error.message));
    const daftar = (bagian.data ?? []) as unknown as Row[];
    if (daftar.length >= batas) penuh = true;
    for (const row of daftar) gabung.set(row.id, row);
  }
  const rows = [...gabung.values()]
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || a.id.localeCompare(b.id))
    .slice(0, batas);
  return { rows, jumlah: penuh ? batas + 1 : rows.length };
}

export default function PenjualanPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [jumlah, setJumlah] = useState(0);
  const [buku, setBuku] = useState<Buku>("umum");
  const [cari, setCari] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");
  const [tambah, setTambah] = useState(false);
  const [ubahId, setUbahId] = useState<string | null>(null);
  const [pesan, setPesan] = useState("");
  const [segar, setSegar] = useState(0);
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");

  function muat() {
    setSegar((n) => n + 1);
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("buku") === "bekon") setBuku("bekon");
  }, []);

  useEffect(() => {
    let batal = false;
    const timer = setTimeout(() => {
      setMemuat(true);
      ambilPenjualan(buku, cari, dari, sampai)
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
  }, [buku, cari, dari, sampai, segar]);

  const kata = cari.trim().toLowerCase();
  const daftar = rows.map((r) => ({
          id: r.id,
          href: `/penjualan/${r.id}`,
          nomor: r.nomor_nota,
          tanggal: r.tanggal,
          pihak: r.pelanggan?.nama ?? "Umum",
          total: r.grand_total,
          sisa: sisaTagihan(r.grand_total, r.dibayar, (r.retur_penjualan ?? []).reduce((s, x) => s + Number(x.total), 0)),
          status: r.status_bayar,
        }));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Penjualan</h1>
        {buku === "umum" && (
          <button
            type="button"
            onClick={() => { setPesan(""); setTambah(true); }}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Tambah
          </button>
        )}
      </div>
      <PilihBuku nilai={buku} onPilih={(nilai) => { setBuku(nilai); setCari(""); setDari(""); setSampai(""); setTambah(false); setUbahId(null); }} />
      {buku === "bekon" && (
        <p className="mb-4 text-sm text-gray-500">
          Nota Bekon dibuat dari pesanan yang sudah dicek di menu Pesanan Penjualan, lalu dikelompokkan per proyek.
        </p>
      )}
      {pesan && <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Tersimpan: {pesan}</p>}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <input
          type="text"
          placeholder={buku === "bekon" ? "Cari nota atau proyek..." : "Cari pelanggan..."}
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
          {buku === "bekon" ? (
            <DaftarBekon
              rows={rows}
              kosong={kata || dari || sampai ? "Tidak ada nota pada saringan ini" : undefined}
              onPilih={(id) => { setPesan(""); setTambah(false); setUbahId(id); }}
            />
          ) : (
            <Daftar
              kosong={kata || dari || sampai ? "Tidak ada nota pada saringan ini" : "Belum ada nota penjualan umum"}
              rows={daftar}
              onPilih={(id) => { setPesan(""); setTambah(false); setUbahId(id); }}
            />
          )}
        </>
      )}
      {tambah && buku === "umum" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="font-semibold text-gray-900">Nota baru</h2>
              <button type="button" onClick={() => setTambah(false)} className="inline-flex h-10 w-10 items-center justify-center text-2xl leading-none text-gray-900" aria-label="Tutup">&times;</button>
            </div>
            <div className="overflow-y-auto px-5 py-5">
              <BarangForm
                mode="jual"
                tanpaKartu
                onBatal={() => setTambah(false)}
                onTersimpan={(hasil) => {
                  setTambah(false);
                  setPesan(hasil.nomor);
                  muat();
                  if (hasil.cetak) {
                    const q = new URLSearchParams({ cetak: "1" });
                    if (hasil.uang != null) q.set("uang", String(Math.round(hasil.uang)));
                    router.push(`/penjualan/${hasil.id}?${q.toString()}`);
                  }
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
              <h2 className="font-semibold text-gray-900">Ubah nota</h2>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => router.push(`/penjualan/${ubahId}`)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700">
                  Cetak
                </button>
                <button type="button" onClick={() => setUbahId(null)} className="inline-flex h-10 w-10 items-center justify-center text-2xl leading-none text-gray-900" aria-label="Tutup">&times;</button>
              </div>
            </div>
            <div className="overflow-y-auto px-5 py-5">
              <BarangForm
                key={ubahId}
                mode="jual"
                tanpaKartu
                notaId={ubahId}
                onBatal={() => setUbahId(null)}
                onTersimpan={(hasil) => {
                  setUbahId(null);
                  setPesan(hasil.nomor);
                  muat();
                  if (hasil.cetak) {
                    const q = new URLSearchParams({ cetak: "1" });
                    if (hasil.uang != null) q.set("uang", String(Math.round(hasil.uang)));
                    router.push(`/penjualan/${hasil.id}?${q.toString()}`);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Daftar({
  rows,
  kosong,
  onPilih,
}: {
  kosong: string;
  rows: { id: string; href: string; nomor: string; tanggal: string; pihak: string; total: number; sisa: number; status: string }[];
  onPilih?: (id: string) => void;
}) {
  if (rows.length === 0) {
    return <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">{kosong}</div>;
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {["Nomor", "Tanggal", "Pihak", "Total", "Sisa", "Status"].map((h) => (
              <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id} onClick={onPilih ? () => onPilih(r.id) : undefined} className={onPilih ? "cursor-pointer hover:bg-gray-50" : undefined}>
              <td className="px-4 py-3">
                {onPilih ? (
                  <span className="font-medium text-orange-700">{r.nomor}</span>
                ) : (
                  <Link href={r.href} className="font-medium text-orange-700">{r.nomor}</Link>
                )}
              </td>
              <td className="px-4 py-3">{r.tanggal}</td>
              <td className="px-4 py-3">{r.pihak}</td>
              <td className="px-4 py-3">{formatRp(r.total)}</td>
              <td className="px-4 py-3">{formatRp(r.sisa)}</td>
              <td className="px-4 py-3 capitalize">{r.status.replace("_", " ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DaftarBekon({ rows, onPilih, kosong }: { rows: Row[]; onPilih: (id: string) => void; kosong?: string }) {
  if (rows.length === 0) {
    return <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">{kosong ?? "Belum ada nota penjualan Bekon"}</div>;
  }
  const urutan: string[] = [];
  const map = new Map<string, Row[]>();
  for (const row of rows) {
    const kunci = row.kode_proyek?.trim() || "Tanpa proyek";
    const ada = map.get(kunci);
    if (ada) ada.push(row);
    else {
      urutan.push(kunci);
      map.set(kunci, [row]);
    }
  }
  return (
    <div className="space-y-6">
      {urutan.map((kunci) => {
        const grup = map.get(kunci) ?? [];
        const pemilik = grup.find((row) => row.nama_pemilik)?.nama_pemilik;
        const total = grup.reduce((s, row) => s + Number(row.grand_total), 0);
        const sisa = grup.reduce(
          (s, row) => s + sisaTagihan(row.grand_total, row.dibayar, (row.retur_penjualan ?? []).reduce((a, item) => a + Number(item.total), 0)),
          0
        );
        return (
          <section key={kunci}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="font-semibold text-gray-900">{labelProyek(kunci === "Tanpa proyek" ? "" : kunci, pemilik) || "Tanpa proyek"}</h2>
              <p className="text-sm text-gray-500">{grup.length} nota · {formatRp(total)} · sisa {formatRp(sisa)}</p>
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              {grup.map((row) => {
                const sisaNota = sisaTagihan(row.grand_total, row.dibayar, (row.retur_penjualan ?? []).reduce((a, item) => a + Number(item.total), 0));
                return (
                  <button key={row.id} type="button" onClick={() => onPilih(row.id)} className="flex w-full items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-left text-sm first:border-t-0 hover:bg-gray-50">
                    <span>
                      <span className="font-medium text-merek-biru-tua">{row.nomor_nota}</span>
                      <span className="ml-2 text-gray-500">{row.tanggal}</span>
                    </span>
                    <span className="text-gray-800">{formatRp(row.grand_total)} · sisa {formatRp(sisaNota)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
