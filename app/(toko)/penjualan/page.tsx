"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BarangForm from "@/components/BarangForm";
import { PilihBuku, type Buku } from "@/components/PilihBuku";
import { db, semua } from "@/lib/api";
import { formatRp, labelProyek, sisaTagihan } from "@/lib/format";

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

export default function PenjualanPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [buku, setBuku] = useState<Buku>("umum");
  const [cari, setCari] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");
  const [tambah, setTambah] = useState(false);
  const [ubahId, setUbahId] = useState<string | null>(null);
  const [pesan, setPesan] = useState("");

  function muat() {
    setMemuat(true);
    semua<Row>((dari, sampai) =>
      db()
        .from("penjualan")
        .select("id,nomor_nota,tanggal,grand_total,dibayar,status_bayar,bekon_po_id,kode_proyek,nama_proyek,nama_pemilik,pelanggan(nama),retur_penjualan(total)")
        .order("tanggal", { ascending: false })
        .order("id")
        .range(dari, sampai)
    )
      .then((data) => { setRows(data); setError(""); })
      .catch((err: Error) => setError(err.message))
      .finally(() => setMemuat(false));
  }

  useEffect(() => { muat(); }, []);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("buku") === "bekon") setBuku("bekon");
  }, []);

  const milik = rows.filter((r) => (buku === "bekon" ? Boolean(r.bekon_po_id) : !r.bekon_po_id));
  const kata = cari.trim().toLowerCase();
  const cocok = kata
    ? milik.filter((r) => {
        const proyek = `${r.kode_proyek ?? ""} ${r.nama_pemilik ?? ""}`.toLowerCase();
        return (r.pelanggan?.nama ?? "umum").toLowerCase().includes(kata) || r.nomor_nota.toLowerCase().includes(kata) || proyek.includes(kata);
      })
    : buku === "umum"
      ? milik.slice(0, 40)
      : milik;
  const daftar = cocok.slice(0, 200).map((r) => ({
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
      <PilihBuku nilai={buku} onPilih={(nilai) => { setBuku(nilai); setCari(""); setTambah(false); setUbahId(null); }} />
      {buku === "bekon" && (
        <p className="mb-4 text-sm text-gray-500">
          Nota Bekon dibuat dari pesanan yang ditarik di menu Dari Bekon, lalu dikelompokkan per proyek.
        </p>
      )}
      {pesan && <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Tersimpan: {pesan}</p>}
      <input
        type="text"
        placeholder={buku === "bekon" ? "Cari nota atau proyek..." : "Cari pelanggan..."}
        value={cari}
        onChange={(e) => setCari(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {memuat ? (
        <p className="text-sm text-gray-500 mb-4">Memuat data...</p>
      ) : (
        <>
          {kata && <p className="text-xs text-gray-400 mb-2">{cocok.length} nota{cocok.length > 200 ? ", menampilkan 200 pertama" : ""}</p>}
          {buku === "bekon" ? (
            <DaftarBekon rows={cocok.slice(0, 200)} />
          ) : (
            <Daftar
              kosong={kata ? "Tidak ada pelanggan yang cocok" : "Belum ada nota penjualan umum"}
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
      {ubahId && buku === "umum" && (
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

function DaftarBekon({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Belum ada nota penjualan Bekon</div>;
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
                  <Link key={row.id} href={`/penjualan/${row.id}`} className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm first:border-t-0 hover:bg-gray-50">
                    <span>
                      <span className="font-medium text-merek-biru-tua">{row.nomor_nota}</span>
                      <span className="ml-2 text-gray-500">{row.tanggal}</span>
                    </span>
                    <span className="text-gray-800">{formatRp(row.grand_total)} · sisa {formatRp(sisaNota)}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
