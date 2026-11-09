"use client";

import { useEffect, useState } from "react";
import { db, rpc, semua } from "@/lib/api";
import { formatRp, sisaTagihan, todayIso } from "@/lib/format";
import { useAuth } from "@/lib/auth";

type Row = {
  id: string;
  nomor: string;
  tanggal: string;
  pihak: string;
  grand: number;
  dibayar: number;
  retur: number;
};

export default function Tagihan({ mode }: { mode: "piutang" | "hutang" }) {
  const piutang = mode === "piutang";
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [jumlah, setJumlah] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [memuat, setMemuat] = useState(true);
  const bolehBayar = user?.peran === "admin" || user?.peran === "akunting";

  function muat() {
    const table = piutang ? "penjualan" : "pembelian";
    const nomor = piutang ? "nomor_nota" : "nomor_po";
    const pihak = piutang ? "pelanggan(nama)" : "supplier(nama)";
    const retur = piutang ? "retur_penjualan(total)" : "retur_pembelian(total)";
    const uang = piutang ? "grand_total" : "total";
    setMemuat(true);
    semua<Record<string, unknown>>((dari, sampai) =>
      db()
        .from(table)
        .select(`id,${nomor},tanggal,${uang},dibayar,${pihak},${retur}`)
        .neq("status_bayar", "lunas")
        .order("tanggal", { ascending: false })
        .range(dari, sampai)
    )
      .then((data) => {
        const list = data.map((r) => {
          const returRows = (r[piutang ? "retur_penjualan" : "retur_pembelian"] as { total: number }[] | null) ?? [];
          const pihakRow = (r[piutang ? "pelanggan" : "supplier"] as { nama: string } | null);
          return {
            id: r.id as string,
            nomor: r[nomor] as string,
            tanggal: r.tanggal as string,
            pihak: pihakRow?.nama ?? (piutang ? "Umum" : "-"),
            grand: Number(r[uang]),
            dibayar: Number(r.dibayar),
            retur: returRows.reduce((s, x) => s + Number(x.total), 0),
          };
        }).filter((r) => sisaTagihan(r.grand, r.dibayar, r.retur) > 0);
        setRows(list);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat tagihan"))
      .finally(() => setMemuat(false));
  }

  useEffect(() => { muat(); }, [piutang]);

  async function bayar(row: Row) {
    setError("");
    try {
      await rpc(piutang ? "catat_pelunasan_piutang" : "catat_pelunasan_hutang", {
        penjualan_id: piutang ? row.id : undefined,
        pembelian_id: piutang ? undefined : row.id,
        tanggal: todayIso(),
        jumlah: Number(jumlah[row.id] || sisaTagihan(row.grand, row.dibayar, row.retur)),
        dicatat_oleh: user?.nama ?? "",
      });
      muat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mencatat pelunasan");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{piutang ? "Piutang" : "Hutang"}</h1>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {memuat ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Memuat data...</div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          {piutang ? "Belum ada piutang" : "Belum ada hutang"}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Nota", "Tanggal", piutang ? "Pelanggan" : "Supplier", "Sisa", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => {
                const sisa = sisaTagihan(r.grand, r.dibayar, r.retur);
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3">{r.nomor}</td>
                    <td className="px-4 py-3">{r.tanggal}</td>
                    <td className="px-4 py-3">{r.pihak}</td>
                    <td className="px-4 py-3">{formatRp(sisa)}</td>
                    <td className="px-4 py-3 text-right">
                      {bolehBayar && (
                        <span className="inline-flex gap-2">
                          <input
                            value={jumlah[r.id] ?? ""}
                            placeholder={String(sisa)}
                            onChange={(e) => setJumlah((q) => ({ ...q, [r.id]: e.target.value }))}
                            className="w-28 border border-gray-300 rounded-lg px-2 py-1"
                          />
                          <button onClick={() => bayar(r)} disabled={user?.latihan} className="text-orange-700 disabled:opacity-40">
                            Lunasi
                          </button>
                        </span>
                      )}
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
