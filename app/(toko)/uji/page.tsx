"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/api";
import { pesanError } from "@/lib/format";
import {
  acakSoal,
  labelPaket,
  paketDariPeran,
  soalUjian,
  type SoalUjian,
} from "@/lib/soal-ujian";

export default function UjiPage() {
  const { user } = useAuth();
  const paket = paketDariPeran(user?.peran ?? "");
  const soal = useMemo(() => (paket ? acakSoal(soalUjian[paket]) : []), [paket]);
  const [jawaban, setJawaban] = useState<Record<string, number>>({});
  const [terkirim, setTerkirim] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [error, setError] = useState("");

  if (!paket) {
    return <p className="text-sm text-gray-500">Halaman ujian hanya untuk akun uji.</p>;
  }

  if (terkirim) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-3">
        <h1 className="text-2xl font-bold text-gray-900">Terima kasih</h1>
        <p className="text-sm text-gray-600">Jawaban Anda sudah terkirim.</p>
      </div>
    );
  }

  const judul = labelPaket[paket];
  const total = soal.length;
  const terisi = soal.filter((s) => jawaban[s.id] !== undefined).length;

  async function kirim() {
    if (terisi < total) {
      const ok = window.confirm(`Masih ada ${total - terisi} soal kosong. Kirim sekarang?`);
      if (!ok) return;
    }
    if (!user) return;

    const skor = soal.filter((s) => jawaban[s.id] === s.benar).length;
    setMenyimpan(true);
    setError("");
    const { error: err } = await db()
      .from("hasil_ujian")
      .insert({
        pengguna_id: user.id === "latihan" ? null : user.id,
        nama: user.nama,
        peran: user.peran,
        paket,
        skor,
        total,
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">Mode ujian</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">{judul}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Jawab semua soal lalu kirim. Skor akhir hanya tampil di menu Admin.
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

      <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <p className="text-sm text-gray-600">
          Terisi {terisi} dari {total} soal
        </p>
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
                aktif
                  ? "border-orange-400 bg-orange-50 text-orange-900"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name={soal.id}
                className="mt-1"
                checked={aktif}
                onChange={() => onPilih(idx)}
              />
              <span>{teks}</span>
            </label>
          );
        })}
      </div>
    </li>
  );
}
