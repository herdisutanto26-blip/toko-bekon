"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/api";
import { pesanError } from "@/lib/format";
import { labelPeran } from "@/lib/menu";
import { JABATAN_TOKO } from "@/lib/sdm";

type Karyawan = {
  id: string;
  nama: string;
  telepon: string | null;
  jabatan: string;
  tanggal_masuk: string | null;
  status: "aktif" | "nonaktif";
  keterangan: string | null;
  pengguna?: { username: string; peran: string } | { username: string; peran: string }[] | null;
};

const input = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm";

function akunDari(row: Karyawan) {
  if (!row.pengguna) return null;
  return Array.isArray(row.pengguna) ? row.pengguna[0] : row.pengguna;
}

export default function KaryawanPage() {
  const [rows, setRows] = useState<Karyawan[]>([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cari, setCari] = useState("");
  const [nama, setNama] = useState("");
  const [telepon, setTelepon] = useState("");
  const [jabatan, setJabatan] = useState("Kasir");
  const [tanggal, setTanggal] = useState("");
  const [keterangan, setKeterangan] = useState("");

  function muat() {
    db()
      .from("karyawan")
      .select("id,nama,telepon,jabatan,tanggal_masuk,status,keterangan,pengguna(username,peran)")
      .order("nama")
      .then(({ data, error: err }) => {
        if (err) {
          setError(pesanError(err.message));
          return;
        }
        setError("");
        setRows((data ?? []) as Karyawan[]);
      });
  }

  useEffect(() => {
    muat();
  }, []);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim() || !jabatan.trim()) return;
    const { error: err } = await db().from("karyawan").insert({
      nama: nama.trim(),
      telepon: telepon.trim() || null,
      jabatan: jabatan.trim(),
      tanggal_masuk: tanggal || null,
      keterangan: keterangan.trim() || null,
      status: "aktif",
    });
    if (err) {
      setError(pesanError(err.message));
      return;
    }
    setNama("");
    setTelepon("");
    setKeterangan("");
    setInfo("Karyawan ditambahkan.");
    muat();
  }

  async function gantiStatus(row: Karyawan) {
    const berikut = row.status === "aktif" ? "nonaktif" : "aktif";
    const { error: err } = await db().from("karyawan").update({ status: berikut }).eq("id", row.id);
    if (err) {
      setError(pesanError(err.message));
      return;
    }
    muat();
  }

  const kata = cari.trim().toLowerCase();
  const tampil = kata
    ? rows.filter((r) =>
        r.nama.toLowerCase().includes(kata) ||
        r.jabatan.toLowerCase().includes(kata) ||
        (r.telepon ?? "").toLowerCase().includes(kata)
      )
    : rows;

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Karyawan</h1>
      <p className="text-sm text-gray-500 mb-6">
        Data orang yang sudah bekerja di toko. Akun aplikasi dibuat dari menu Rekrutmen atau Akses & Akun.
      </p>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {info && <p className="text-sm text-green-700 mb-3">{info}</p>}

      <form onSubmit={simpan} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 grid grid-cols-1 md:grid-cols-6 gap-3">
        <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama" className={input} />
        <input value={telepon} onChange={(e) => setTelepon(e.target.value)} placeholder="Telepon" className={input} />
        <input value={jabatan} onChange={(e) => setJabatan(e.target.value)} list="jabatan-toko" placeholder="Jabatan" className={input} />
        <datalist id="jabatan-toko">
          {JABATAN_TOKO.map((j) => (
            <option key={j} value={j} />
          ))}
        </datalist>
        <input value={tanggal} onChange={(e) => setTanggal(e.target.value)} type="date" className={input} />
        <input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Catatan" className={input} />
        <button className="bg-orange-600 text-white rounded-lg text-sm font-medium">Simpan</button>
      </form>

      <input
        value={cari}
        onChange={(e) => setCari(e.target.value)}
        placeholder="Cari nama, jabatan, atau telepon..."
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72 mb-4"
      />

      {tampil.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          {rows.length === 0 ? "Belum ada karyawan" : "Tidak ada yang cocok"}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Nama", "Jabatan", "Telepon", "Masuk", "Akun", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tampil.map((row) => {
                const akun = akunDari(row);
                return (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {row.nama}
                      {row.status === "nonaktif" && <span className="ml-2 text-xs text-gray-400">Nonaktif</span>}
                    </td>
                    <td className="px-4 py-3">{row.jabatan}</td>
                    <td className="px-4 py-3 text-gray-600">{row.telepon || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{row.tanggal_masuk || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {akun ? `${akun.username} · ${labelPeran(akun.peran)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => gantiStatus(row)} className="text-orange-700 hover:underline">
                        {row.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
                      </button>
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
