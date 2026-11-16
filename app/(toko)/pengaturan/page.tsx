"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Profil = {
  alamat: string;
  telepon: string;
  ucapan: string;
  catatan: string;
  instagram: string;
};

const kosong: Profil = { alamat: "", telepon: "", ucapan: "", catatan: "", instagram: "" };

export default function PengaturanTokoPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<Profil>(kosong);
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    db()
      .from("profil")
      .select("alamat,telepon,ucapan,catatan,instagram")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else if (data) {
          const row = data as Profil;
          setForm({
            alamat: row.alamat ?? "",
            telepon: row.telepon ?? "",
            ucapan: row.ucapan ?? "",
            catatan: row.catatan ?? "",
            instagram: row.instagram ?? "",
          });
        }
        setMemuat(false);
      });
  }, []);

  function isi(kunci: keyof Profil, nilai: string) {
    setForm((prev) => ({ ...prev, [kunci]: nilai }));
  }

  async function simpan() {
    setMenyimpan(true);
    setError("");
    setPesan("");
    const { error: err } = await db().from("profil").upsert({
      id: 1,
      alamat: form.alamat.trim() || null,
      telepon: form.telepon.trim() || null,
      ucapan: form.ucapan.trim() || null,
      catatan: form.catatan.trim() || null,
      instagram: form.instagram.trim() || null,
    });
    setMenyimpan(false);
    if (err) setError(err.message);
    else setPesan("Tersimpan. Nota berikutnya memakai data ini.");
  }

  if (memuat) return <p className="text-sm text-gray-500">Memuat data toko...</p>;

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-2xl font-bold text-gray-800">Data toko</h1>
      <p className="mb-4 text-sm text-gray-600">
        Ini yang tercetak di kepala dan kaki nota. Kosongkan kalau belum mau ditampilkan.
      </p>
      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <label className="block text-sm">
          Alamat toko
          <textarea value={form.alamat} onChange={(e) => isi("alamat", e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          WA / telepon
          <input value={form.telepon} onChange={(e) => isi("telepon", e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          Ucapan
          <input value={form.ucapan} onChange={(e) => isi("ucapan", e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          Catatan bawah
          <textarea value={form.catatan} onChange={(e) => isi("catatan", e.target.value)} rows={3} placeholder="Misalnya aturan penukaran barang" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          Instagram
          <input value={form.instagram} onChange={(e) => isi("instagram", e.target.value)} placeholder="@tokobekon" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {pesan && <p className="text-sm text-green-700">{pesan}</p>}
        <button type="button" onClick={simpan} disabled={menyimpan || user?.latihan} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          Simpan
        </button>
      </div>
    </div>
  );
}
