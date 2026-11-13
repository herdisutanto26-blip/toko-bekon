"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/api";
import { pesanError } from "@/lib/format";
import { acakSoal, labelPaket, soalUjian, type PaketUji, type SoalUjian } from "@/lib/soal-ujian";

type Undangan = {
  id: string;
  nama: string;
  tahap: string;
  lowongan?: { judul: string; paket_uji: PaketUji } | { judul: string; paket_uji: PaketUji }[] | null;
};

function posisiDari(row: Undangan) {
  if (!row.lowongan) return null;
  return Array.isArray(row.lowongan) ? row.lowongan[0] : row.lowongan;
}

export default function UjianTautanPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [undangan, setUndangan] = useState<Undangan | null>(null);
  const [sudah, setSudah] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [jawaban, setJawaban] = useState<Record<string, number>>({});
  const [terkirim, setTerkirim] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);

  useEffect(() => {
    let batal = false;
    async function muat() {
      const { data, error: err } = await db()
        .from("pelamar")
        .select("id,nama,tahap,lowongan(judul,paket_uji)")
        .eq("token_tes", token)
        .maybeSingle();
      if (batal) return;
      if (err) {
        setError(pesanError(err.message));
        setLoading(false);
        return;
      }
      if (!data) {
        setLoading(false);
        return;
      }
      const row = data as Undangan;
      const hasil = await db().from("hasil_ujian").select("id").eq("pelamar_id", row.id).limit(1).maybeSingle();
      if (batal) return;
      setUndangan(row);
      setSudah(Boolean(hasil.data));
      setLoading(false);
    }
    muat();
    return () => {
      batal = true;
    };
  }, [token]);

  const posisi = undangan ? posisiDari(undangan) : null;
  const paket = posisi?.paket_uji && posisi.paket_uji in soalUjian ? posisi.paket_uji : null;
  const soal = useMemo(() => (paket ? acakSoal(soalUjian[paket]) : []), [paket]);
  const terisi = soal.filter((s) => jawaban[s.id] !== undefined).length;

  async function kirim() {
    if (!undangan || !paket) return;
    if (terisi < soal.length) {
      const ok = window.confirm(`Masih ada ${soal.length - terisi} soal kosong. Kirim sekarang?`);
      if (!ok) return;
    }
    const skor = soal.filter((s) => jawaban[s.id] === s.benar).length;
    setMenyimpan(true);
    setError("");
    const { error: err } = await db().from("hasil_ujian").insert({
      pengguna_id: null,
      pelamar_id: undangan.id,
      nama: undangan.nama,
      peran: paket,
      paket,
      skor,
      total: soal.length,
      jawaban,
    });
    setMenyimpan(false);
    if (err) {
      setError(pesanError(err.message));
      return;
    }
    setTerkirim(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) return <p className="p-8 text-sm text-gray-500">Memuat soal...</p>;

  if (!undangan || !paket) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-2 px-6">
        <h1 className="text-2xl font-bold text-gray-900">{error ? "Tes belum bisa dibuka" : "Tautan tidak berlaku"}</h1>
        <p className="text-sm text-gray-600">{error || "Minta tautan tes yang baru ke toko."}</p>
      </div>
    );
  }

  if (sudah || terkirim) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-3 px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">Toko Bekon</p>
        <h1 className="text-2xl font-bold text-gray-900">Terima kasih, {undangan.nama}</h1>
        <p className="text-sm text-gray-600">Jawaban sudah terkirim. Hasilnya dilihat oleh toko.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">Tes rekrutmen · Toko Bekon</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">{labelPaket[paket]}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {undangan.nama} · {posisi?.judul}. Jawab semua soal lalu kirim. Halaman ini tidak memakai akun toko.
        </p>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
      <ol className="space-y-4">
        {soal.map((s, i) => (
          <SoalCard
            key={s.id}
            nomor={i + 1}
            soal={s}
            dipilih={jawaban[s.id]}
            onPilih={(idx) => setJawaban((prev) => ({ ...prev, [s.id]: idx }))}
          />
        ))}
      </ol>
      <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white/95 px-4 py-3 shadow-sm">
        <p className="text-sm text-gray-600">Terisi {terisi} dari {soal.length} soal</p>
        <button
          type="button"
          onClick={kirim}
          disabled={menyimpan}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
        >
          {menyimpan ? "Mengirim..." : "Kirim jawaban"}
        </button>
      </div>
    </div>
  );
}

function SoalCard({
  nomor,
  soal,
  dipilih,
  onPilih,
}: {
  nomor: number;
  soal: SoalUjian;
  dipilih?: number;
  onPilih: (idx: number) => void;
}) {
  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-5">
      <p className="text-sm font-medium text-gray-900">
        <span className="text-orange-600 mr-2">{nomor}.</span>
        {soal.pertanyaan}
      </p>
      <div className="mt-3 space-y-2">
        {soal.opsi.map((teks, idx) => {
          const aktif = dipilih === idx;
          return (
            <label
              key={idx}
              className={`flex items-start gap-3 rounded-xl border px-3 py-2 text-sm cursor-pointer ${
                aktif ? "border-orange-400 bg-orange-50 text-orange-900" : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <input type="radio" name={soal.id} className="mt-1" checked={aktif} onChange={() => onPilih(idx)} />
              <span>{teks}</span>
            </label>
          );
        })}
      </div>
    </li>
  );
}
