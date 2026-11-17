import { db, semua } from "@/lib/api";
import { sisaTagihan } from "@/lib/format";
import { asetTetap, kasBank, kewajibanLain, type SaldoAkun } from "@/lib/saldo-akun";

export { asetTetap, kasBank, kewajibanLain };
export type { SaldoAkun };

export const kodePersediaan = "1-1320";

export const akunTagihan: SaldoAkun[] = [
  { kode: "1-1300", nama: "Piutang umum", saldo: 0 },
  { kode: "1-1310", nama: "Piutang Bekon", saldo: 0 },
  { kode: "2-2100", nama: "Hutang usaha", saldo: 0 },
];

export function labelJenis(jenis: string) {
  if (jenis === "pelunasan_piutang") return "Pelunasan piutang";
  if (jenis === "pelunasan_hutang") return "Pelunasan hutang";
  return jenis;
}

export function namaAkun(kode: string) {
  return (
    kasBank.find((a) => a.kode === kode)?.nama ??
    akunTagihan.find((a) => a.kode === kode)?.nama ??
    asetTetap.find((a) => a.kode === kode)?.nama ??
    kewajibanLain.find((a) => a.kode === kode)?.nama ??
    kode
  );
}

export function jenisAkun(kode: string): "kas" | "tagihan" | "tetap" | "kewajiban" | "lain" {
  if (kasBank.some((a) => a.kode === kode)) return "kas";
  if (akunTagihan.some((a) => a.kode === kode)) return "tagihan";
  if (asetTetap.some((a) => a.kode === kode)) return "tetap";
  if (kewajibanLain.some((a) => a.kode === kode)) return "kewajiban";
  return "lain";
}

export type BarisJurnal = {
  kode: string;
  nama: string;
  debit: number;
  kredit: number;
  urutan: number;
};

export type EntriJurnal = {
  id: string;
  nomor: string;
  tanggal: string;
  jenis: string;
  keterangan: string | null;
  dicatat_oleh: string | null;
  baris: BarisJurnal[];
};

export type Mutasi = {
  tanggal: string;
  nomor: string;
  keterangan: string | null;
  debit: number;
  kredit: number;
};

type MentahJurnal = {
  id: string;
  nomor: string;
  tanggal: string;
  jenis: string;
  keterangan: string | null;
  dicatat_oleh: string | null;
  jurnal_baris: BarisJurnal[] | BarisJurnal | null;
};

function daftarBaris(rel: BarisJurnal[] | BarisJurnal | null | undefined) {
  const list = Array.isArray(rel) ? rel : rel ? [rel] : [];
  return [...list].sort((a, b) => Number(a.urutan) - Number(b.urutan));
}

export async function muatJurnal(dari?: string, sampai?: string) {
  const rows = await semua<MentahJurnal>((from, to) => {
    let q = db()
      .from("jurnal")
      .select("id,nomor,tanggal,jenis,keterangan,dicatat_oleh,jurnal_baris(kode,nama,debit,kredit,urutan)")
      .order("id", { ascending: true });
    if (dari) q = q.gte("tanggal", dari);
    if (sampai) q = q.lte("tanggal", sampai);
    return q.range(from, to);
  });
  return rows
    .map((row) => ({
      id: row.id,
      nomor: row.nomor,
      tanggal: row.tanggal,
      jenis: row.jenis,
      keterangan: row.keterangan,
      dicatat_oleh: row.dicatat_oleh,
      baris: daftarBaris(row.jurnal_baris).map((b) => ({
        kode: b.kode,
        nama: b.nama,
        debit: Number(b.debit) || 0,
        kredit: Number(b.kredit) || 0,
        urutan: Number(b.urutan) || 0,
      })),
    }))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.nomor.localeCompare(b.nomor));
}

export function mutasiAkun(entri: EntriJurnal[], kode: string, dari?: string, sampai?: string) {
  const hasil: Mutasi[] = [];
  for (const entriJurnal of entri) {
    if (dari && entriJurnal.tanggal < dari) continue;
    if (sampai && entriJurnal.tanggal > sampai) continue;
    for (const baris of entriJurnal.baris) {
      if (baris.kode !== kode) continue;
      hasil.push({
        tanggal: entriJurnal.tanggal,
        nomor: entriJurnal.nomor,
        keterangan: entriJurnal.keterangan,
        debit: baris.debit,
        kredit: baris.kredit,
      });
    }
  }
  return hasil;
}

export function jumlahMutasi(baris: Mutasi[]) {
  return baris.reduce((s, b) => s + b.debit - b.kredit, 0);
}

export type AngkaRugi = {
  jualUmum: number;
  jualBekon: number;
  returUmum: number;
  returBekon: number;
  hppUmum: number;
  hppBekon: number;
};

export type AngkaNeraca = {
  piutangUmum: number;
  piutangBekon: number;
  hutang: number;
  stok: number;
  kasMutasi: Record<string, number>;
};

function milikBekon(rel: { bekon_po_id: string | null } | { bekon_po_id: string | null }[] | null) {
  const row = Array.isArray(rel) ? rel[0] : rel;
  return Boolean(row?.bekon_po_id);
}

function jumlah(nilai: number[]) {
  return nilai.reduce((s, n) => s + Number(n || 0), 0);
}

export async function muatRugiLaba(dari: string, sampai: string): Promise<AngkaRugi> {
  const [nota, retur, item] = await Promise.all([
    semua<{ grand_total: number; bekon_po_id: string | null }>((from, to) =>
      db().from("penjualan").select("grand_total,bekon_po_id").gte("tanggal", dari).lte("tanggal", sampai).order("id").range(from, to)
    ),
    semua<{ total: number; penjualan: { bekon_po_id: string | null } | { bekon_po_id: string | null }[] | null }>((from, to) =>
      db().from("retur_penjualan").select("total,penjualan!inner(bekon_po_id)").gte("tanggal", dari).lte("tanggal", sampai).order("id").range(from, to)
    ),
    semua<{ qty: number; harga_beli: number; penjualan: { bekon_po_id: string | null } | { bekon_po_id: string | null }[] | null }>((from, to) =>
      db()
        .from("penjualan_item")
        .select("qty,harga_beli,penjualan!inner(tanggal,bekon_po_id)")
        .gte("penjualan.tanggal", dari)
        .lte("penjualan.tanggal", sampai)
        .order("id")
        .range(from, to)
    ),
  ]);
  return {
    jualUmum: jumlah(nota.filter((r) => !r.bekon_po_id).map((r) => r.grand_total)),
    jualBekon: jumlah(nota.filter((r) => r.bekon_po_id).map((r) => r.grand_total)),
    returUmum: jumlah(retur.filter((r) => !milikBekon(r.penjualan)).map((r) => r.total)),
    returBekon: jumlah(retur.filter((r) => milikBekon(r.penjualan)).map((r) => r.total)),
    hppUmum: jumlah(item.filter((r) => !milikBekon(r.penjualan)).map((r) => Number(r.qty) * Number(r.harga_beli))),
    hppBekon: jumlah(item.filter((r) => milikBekon(r.penjualan)).map((r) => Number(r.qty) * Number(r.harga_beli))),
  };
}

export async function nilaiPersediaan() {
  const stok = await semua<{ stok: number; harga_beli: number }>((from, to) =>
    db().from("produk").select("stok,harga_beli").eq("aktif", true).order("id").range(from, to)
  );
  return stok.reduce((s, row) => s + Number(row.stok) * Number(row.harga_beli), 0);
}

export async function muatNeraca(): Promise<AngkaNeraca> {
  const [piutang, hutang, stok, jurnalKas] = await Promise.all([
    semua<{ grand_total: number; dibayar: number; bekon_po_id: string | null; retur_penjualan: { total: number }[] | null }>((from, to) =>
      db().from("penjualan").select("grand_total,dibayar,bekon_po_id,retur_penjualan(total)").neq("status_bayar", "lunas").order("id").range(from, to)
    ),
    semua<{ total: number; dibayar: number; retur_pembelian: { total: number }[] | null }>((from, to) =>
      db().from("pembelian").select("total,dibayar,retur_pembelian(total)").neq("status_bayar", "lunas").order("id").range(from, to)
    ),
    semua<{ stok: number; harga_beli: number }>((from, to) =>
      db().from("produk").select("stok,harga_beli").eq("aktif", true).order("id").range(from, to)
    ),
    semua<{ kode: string; debit: number; kredit: number }>((from, to) =>
      db().from("jurnal_baris").select("kode,debit,kredit").in("kode", kasBank.map((a) => a.kode)).order("id").range(from, to)
    ),
  ]);
  const sisa = (r: { grand_total: number; dibayar: number; retur_penjualan: { total: number }[] | null }) =>
    sisaTagihan(r.grand_total, r.dibayar, jumlah((r.retur_penjualan ?? []).map((x) => x.total)));
  const kasMutasi: Record<string, number> = {};
  for (const baris of jurnalKas) {
    kasMutasi[baris.kode] = (kasMutasi[baris.kode] ?? 0) + Number(baris.debit) - Number(baris.kredit);
  }
  return {
    piutangUmum: jumlah(piutang.filter((r) => !r.bekon_po_id).map(sisa)),
    piutangBekon: jumlah(piutang.filter((r) => r.bekon_po_id).map(sisa)),
    hutang: jumlah(hutang.map((r) => sisaTagihan(r.total, r.dibayar, jumlah((r.retur_pembelian ?? []).map((x) => x.total))))),
    stok: jumlah(stok.map((r) => Number(r.stok) * Number(r.harga_beli))),
    kasMutasi,
  };
}

export function saldoKas(kode: string, saldoAwal: number, kasMutasi: Record<string, number>) {
  return saldoAwal + (kasMutasi[kode] ?? 0);
}
