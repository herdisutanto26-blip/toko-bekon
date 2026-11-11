"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/lib/api";
import { formatRp, pesanError } from "@/lib/format";
import { supabase } from "@/lib/supabase";

type Po = {
  po_id: string;
  nomor_po: string;
  nomor_pengajuan: string | null;
  kode_proyek: string | null;
  tanggal: string;
  total: number;
  barang: string | null;
};

export default function DariBekonPage() {
  const [rows, setRows] = useState<Po[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");
  const [sukses, setSukses] = useState("");
  const [tarikId, setTarikId] = useState("");

  function muat() {
    setMemuat(true);
    supabase.rpc("daftar_po_toko_bekon").then(({ data, error: err }) => {
      if (err) setError(pesanError(err.message));
      else {
        setRows((data ?? []) as Po[]);
        setError("");
      }
      setMemuat(false);
    });
  }

  useEffect(() => { muat(); }, []);

  async function tarik(po: Po) {
    setTarikId(po.po_id);
    setError("");
    setSukses("");
    const { data, error: err } = await supabase.rpc("sinkron_penjualan_toko_bekon", { p_po_id: po.po_id });
    if (err) {
      setError(pesanError(err.message));
      setTarikId("");
      return;
    }
    const { data: nota } = await db().from("penjualan").select("nomor_nota").eq("id", data).maybeSingle();
    setSukses(nota?.nomor_nota ? `Nota ${nota.nomor_nota} sudah dibuat untuk ${po.nomor_po}.` : `Nota untuk ${po.nomor_po} sudah dibuat.`);
    setTarikId("");
    muat();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Dari Bekon</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-2xl">
        PO yang supplier-nya Toko Bekon dan sudah berstatus Sudah jurnal. Tarik sekali untuk membuat nota penjualan, mengurangi stok, dan mencatat piutang ke Bekon Pro.
        Nama barang di PO harus sama dengan nama di katalog toko.
      </p>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {sukses && (
        <p className="text-sm text-green-700 mb-3">
          {sukses}{" "}
          <Link href="/penjualan" className="underline">Lihat penjualan</Link>
        </p>
      )}
      {memuat ? (
        <p className="text-sm text-gray-500">Memuat data...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">Belum ada PO Toko Bekon yang sudah dijurnal dan belum ditarik.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((po) => (
            <div key={po.po_id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-800">{po.nomor_po}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {[po.nomor_pengajuan, po.kode_proyek, po.tanggal].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-sm text-gray-700 mt-2">{po.barang || "Tidak ada barang"}</p>
                  <p className="text-sm font-medium text-gray-800 mt-1">{formatRp(Number(po.total))}</p>
                </div>
                <button
                  type="button"
                  disabled={tarikId === po.po_id}
                  onClick={() => tarik(po)}
                  className="shrink-0 bg-orange-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {tarikId === po.po_id ? "Menarik..." : "Tarik jadi nota"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
