"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/api";
import { labelPaket, type PaketUji } from "@/lib/soal-ujian";

type Hasil = {
  id: string;
  nama: string;
  peran: string;
  paket: string;
  skor: number;
  total: number;
  created_at: string;
};

export default function HasilUjianPage() {
  const [rows, setRows] = useState<Hasil[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db()
      .from("hasil_ujian")
      .select("id,nama,peran,paket,skor,total,created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error: err }) => {
        setLoading(false);
        if (err) {
          setError(err.message);
          return;
        }
        setRows((data ?? []) as Hasil[]);
      });
  }, []);

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hasil ujian</h1>
        <p className="text-sm text-gray-500 mt-1">Skor peserta hanya tampil di sini (Admin).</p>
      </div>

      {loading && <p className="text-sm text-gray-500">Memuat...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-gray-500">Belum ada hasil ujian.</p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Waktu</th>
                <th className="px-4 py-3 font-semibold">Nama</th>
                <th className="px-4 py-3 font-semibold">Paket</th>
                <th className="px-4 py-3 font-semibold">Skor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const persen = Math.round((r.skor / r.total) * 100);
                const paketLabel =
                  r.paket in labelPaket ? labelPaket[r.paket as PaketUji] : r.paket;
                return (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.nama}</td>
                    <td className="px-4 py-3 text-gray-600">{paketLabel}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-orange-700">
                        {r.skor}/{r.total}
                      </span>
                      <span className="text-gray-500 ml-2">({persen}%)</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
