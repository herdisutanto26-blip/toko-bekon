"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/api";

type Row = { id: string; nama: string; telepon: string | null; alamat: string | null };

export default function PihakPage({ jenis }: { jenis: "pelanggan" | "supplier" }) {
  const judul = jenis === "pelanggan" ? "Pelanggan" : "Supplier";
  const [rows, setRows] = useState<Row[]>([]);
  const [nama, setNama] = useState("");
  const [telepon, setTelepon] = useState("");
  const [alamat, setAlamat] = useState("");
  const [error, setError] = useState("");

  function muat() {
    db().from(jenis).select("id,nama,telepon,alamat").eq("aktif", true).order("nama").then(({ data, error: err }) => {
      if (err) setError(err.message);
      setRows((data ?? []) as Row[]);
    });
  }

  useEffect(() => { muat(); }, [jenis]);

  async function simpan() {
    if (!nama.trim()) return;
    const { error: err } = await db().from(jenis).insert({ nama: nama.trim(), telepon: telepon || null, alamat: alamat || null });
    if (err) {
      setError(err.message);
      return;
    }
    setNama("");
    setTelepon("");
    setAlamat("");
    muat();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{judul}</h1>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input value={telepon} onChange={(e) => setTelepon(e.target.value)} placeholder="Telepon" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Alamat" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <button onClick={simpan} className="bg-orange-600 text-white rounded-lg text-sm">Simpan</button>
      </div>
      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Belum ada {judul.toLowerCase()}</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Nama", "Telepon", "Alamat"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">{r.nama}</td>
                  <td className="px-4 py-3">{r.telepon ?? "-"}</td>
                  <td className="px-4 py-3">{r.alamat ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
