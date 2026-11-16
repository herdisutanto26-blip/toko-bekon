"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Merek } from "@/components/Merek";
import { db } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { labelProyek, sisaTagihan } from "@/lib/format";
import { supabase } from "@/lib/supabase";

type Nota = {
  nomor_nota: string;
  tanggal: string;
  total: number;
  grand_total: number;
  diskon: number;
  dibayar: number;
  status_bayar: string;
  jatuh_tempo: string | null;
  catatan: string | null;
  dicatat_oleh: string | null;
  created_at: string;
  bekon_po_id: string | null;
  kode_proyek: string | null;
  nama_proyek: string | null;
  nama_pemilik: string | null;
  pelanggan: { nama: string; telepon: string | null } | null;
  penjualan_item: { qty: number; satuan: string | null; harga_satuan: number; subtotal: number; produk: { nama: string } | null }[];
  retur_penjualan: { total: number }[];
};

type Kirim = { alamat: string | null; cara: string | null; tanggal: string | null };

type Profil = {
  alamat: string | null;
  telepon: string | null;
  ucapan: string | null;
  catatan: string | null;
  instagram: string | null;
};

function tanggalPendek(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

function jamNota(dibuat: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dibuat));
}

function tanggalPanjang(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

function angka(n: number) {
  return Math.round(n || 0).toLocaleString("id-ID");
}

function jumlah(n: number) {
  return Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 3 });
}

function Garis() {
  return <div className="my-1.5 border-t border-dashed border-gray-500" />;
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-1">
      <span className="w-[4.6rem] shrink-0">{k}</span>
      <span className="shrink-0">:</span>
      <span className="min-w-0 flex-1 break-words">{v}</span>
    </div>
  );
}

function Kanan({ k, v, tebal }: { k: string; v: string; tebal?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${tebal ? "font-bold" : ""}`}>
      <span>{k}</span>
      <span className="shrink-0">{v}</span>
    </div>
  );
}

function labelBayar(kode: string | null, nama: string | null) {
  if (kode === "1-1110") return "Kasir";
  if (kode === "1-1120") return "Transfer BCA";
  if (kode === "1-1130") return "Transfer BSI";
  return nama?.trim() || "";
}

export default function NotaJualPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [nota, setNota] = useState<Nota | null>(null);
  const [uang, setUang] = useState<number | null>(null);
  const [kirim, setKirim] = useState<Kirim | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [cara, setCara] = useState("");
  const [siapCetak, setSiapCetak] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const nilai = q.get("uang");
    if (nilai != null && nilai !== "" && Number.isFinite(Number(nilai))) setUang(Number(nilai));
    db()
      .from("penjualan")
      .select("nomor_nota,tanggal,total,grand_total,diskon,dibayar,status_bayar,jatuh_tempo,catatan,dicatat_oleh,created_at,bekon_po_id,kode_proyek,nama_proyek,nama_pemilik,pelanggan(nama,telepon),penjualan_item(qty,satuan,harga_satuan,subtotal,produk(nama)),retur_penjualan(total)")
      .eq("id", id)
      .maybeSingle()
      .then(async ({ data }) => {
        const row = data as unknown as Nota | null;
        setNota(row);
        try {
          const tugas: PromiseLike<void>[] = [];
          tugas.push(
            db()
              .from("profil")
              .select("alamat,telepon,ucapan,catatan,instagram")
              .eq("id", 1)
              .maybeSingle()
              .then(({ data: profilData }) => setProfil((profilData as Profil | null) ?? null))
          );
          if (row?.bekon_po_id) {
            tugas.push(
              supabase.rpc("kirim_po_toko_bekon", { p_po_id: row.bekon_po_id }).then(({ data: kirimData }) => {
                const baris = (Array.isArray(kirimData) ? kirimData[0] : kirimData) as Kirim | null;
                setKirim(baris ?? null);
              })
            );
          }
          if (row) {
            tugas.push(
              db()
                .from("pelunasan_piutang")
                .select("jurnal_id")
                .eq("penjualan_id", id)
                .order("created_at")
                .limit(1)
                .then(async ({ data: bayar }) => {
                  const jurnalId = (bayar?.[0] as { jurnal_id: string | null } | undefined)?.jurnal_id;
                  if (!jurnalId) return;
                  const { data: baris } = await db()
                    .from("jurnal_baris")
                    .select("kode,nama")
                    .eq("jurnal_id", jurnalId)
                    .gt("debit", 0)
                    .limit(1);
                  const akun = baris?.[0] as { kode: string | null; nama: string | null } | undefined;
                  if (akun) setCara(labelBayar(akun.kode, akun.nama));
                })
            );
          }
          await Promise.all(tugas);
        } finally {
          setSiapCetak(true);
        }
      });
  }, [id]);

  useEffect(() => {
    if (!nota || !siapCetak) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("cetak") !== "1") return;
    const timer = window.setTimeout(() => {
      window.print();
      q.delete("cetak");
      const sisaQuery = q.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${sisaQuery ? `?${sisaQuery}` : ""}`);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [nota, siapCetak]);

  if (!nota) return <p className="text-sm text-gray-500">Memuat nota...</p>;
  const retur = nota.retur_penjualan.reduce((s, r) => s + Number(r.total), 0);
  const sisa = sisaTagihan(nota.grand_total, nota.dibayar, retur);
  const proyek = labelProyek(nota.kode_proyek, nota.nama_pemilik);
  const telepon = nota.pelanggan?.telepon?.trim();
  const namaPelanggan = nota.bekon_po_id ? "Bekon" : (nota.pelanggan?.nama ?? "Umum");
  const kasir = (nota.bekon_po_id ? user?.nama : nota.dicatat_oleh)?.trim();
  const caraBayar = uang != null ? "Kasir" : cara;
  const subtotal = Number(nota.total) || nota.penjualan_item.reduce((s, item) => s + Number(item.subtotal), 0);
  const jumlahJenis = jumlah(nota.penjualan_item.length);
  const totalQty = jumlah(nota.penjualan_item.reduce((s, item) => s + Number(item.qty), 0));
  const ucapan = (profil?.ucapan ?? "Terima kasih telah berbelanja!").trim();
  const ig = profil?.instagram?.trim();

  return (
    <div>
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 2mm; }
          html, body { width: 80mm !important; margin: 0 !important; background: #fff !important; }
          .nota-pos {
            width: 72mm !important;
            max-width: 72mm !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            font-size: 11px !important;
            line-height: 1.35 !important;
          }
        }
      `}</style>
      <button onClick={() => window.print()} className="no-print mb-1 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm">
        Cetak nota
      </button>
      <p className="no-print mb-4 text-xs text-gray-500">Kertas printer POS 80 mm. Alamat, telepon, dan teks bawah diisi di menu Data toko.</p>
      <div className="nota-pos mx-auto w-[72mm] max-w-full bg-white border border-gray-200 p-3 font-mono text-[11px] leading-snug">
        <div className="mb-1 flex justify-center">
          <Merek logo="h-8 w-auto" nama="text-sm" />
        </div>
        {profil?.alamat?.trim() && <p className="whitespace-pre-line break-words text-center">{profil.alamat.trim()}</p>}
        {profil?.telepon?.trim() && <p className="text-center">WA/Telp: {profil.telepon.trim()}</p>}
        <Garis />
        <Meta k="No. Nota" v={nota.nomor_nota} />
        <Meta k="Tanggal" v={`${tanggalPendek(nota.tanggal)} ${jamNota(nota.created_at)}`} />
        {kasir && <Meta k="Kasir" v={kasir} />}
        <Meta k="Pelanggan" v={namaPelanggan} />
        {telepon && <Meta k="HP" v={telepon} />}
        {nota.bekon_po_id && proyek && <Meta k="Proyek" v={proyek} />}
        {(kirim?.cara || kirim?.tanggal) && (
          <Meta
            k={kirim.cara === "diambil" ? "Diambil" : "Dikirim"}
            v={kirim.tanggal ? tanggalPanjang(kirim.tanggal) : "-"}
          />
        )}
        <Garis />
        {nota.penjualan_item.map((item, i) => (
          <div key={i} className="mb-1">
            <p className="break-words">{item.produk?.nama}</p>
            <div className="flex justify-between gap-2 pl-2">
              <span>{jumlah(item.qty)}{item.satuan ? ` ${item.satuan}` : ""} x {angka(item.harga_satuan)}</span>
              <span className="shrink-0">{angka(item.subtotal)}</span>
            </div>
          </div>
        ))}
        <Garis />
        <p className="flex gap-4">
          <span>brg = {jumlahJenis}</span>
          <span>qty = {totalQty}</span>
        </p>
        {subtotal !== Number(nota.grand_total) && <Kanan k="Subtotal" v={angka(subtotal)} />}
        {Number(nota.diskon) > 0 && <Kanan k="Diskon" v={angka(nota.diskon)} />}
        {retur > 0 && <Kanan k="Retur" v={angka(retur)} />}
        <Garis />
        <Kanan k="TOTAL" v={angka(nota.grand_total)} tebal />
        {(uang != null || Number(nota.dibayar) > 0) && (
          <Kanan k={caraBayar ? `Bayar (${caraBayar})` : "Bayar"} v={angka(uang ?? nota.dibayar)} />
        )}
        {uang != null && <Kanan k="Kembali" v={angka(Math.max(0, uang - nota.grand_total))} />}
        {nota.jatuh_tempo && <Kanan k="Jatuh tempo" v={tanggalPendek(nota.jatuh_tempo)} />}
        {sisa > 0 && <Kanan k="Sisa" v={angka(sisa)} />}
        {nota.catatan && (
          <>
            <Garis />
            <p className="break-words">{nota.catatan}</p>
          </>
        )}
        {(ucapan || profil?.catatan?.trim() || ig) && (
          <>
            <Garis />
            {ucapan && <p className="text-center">{ucapan}</p>}
            {profil?.catatan?.trim() && <p className="mt-1 whitespace-pre-line break-words text-center">{profil.catatan.trim()}</p>}
            {ig && <p className="mt-1 text-center">IG: {ig.startsWith("@") ? ig : `@${ig}`}</p>}
          </>
        )}
      </div>
    </div>
  );
}
