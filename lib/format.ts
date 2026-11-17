export function formatRp(n: number) {
  return "Rp " + Math.round(n || 0).toLocaleString("id-ID");
}

export function parseUang(teks: string) {
  const bersih = teks.trim();
  if (/^-?\d+(\.\d+)?$/.test(bersih)) {
    const n = Math.round(Number(bersih));
    if (!Number.isFinite(n) || n < 0) return "";
    return String(n);
  }
  return bersih.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

export function teksUang(nilai: string | number | null | undefined) {
  if (nilai === "" || nilai == null) return "";
  const digit = typeof nilai === "number"
    ? (Number.isFinite(nilai) && nilai >= 0 ? String(Math.round(nilai)) : "")
    : parseUang(nilai);
  if (!digit) return "";
  return "Rp " + Number(digit).toLocaleString("id-ID");
}

export function todayIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function monthStartIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}-01`;
}

export function labelProyek(kode?: string | null, pemilik?: string | null) {
  const k = (kode ?? "").trim();
  const p = (pemilik ?? "").trim();
  if (k && p) return `${k} · ${p}`;
  return k || p;
}

export function sisaTagihan(grand: number, dibayar: number, retur: number) {
  return Math.max(0, Number(grand || 0) - Number(dibayar || 0) - Number(retur || 0));
}

export function pesanError(message: string) {
  if (/PGRST106|Invalid schema|schema must be/i.test(message)) {
    return "Skema toko belum dibuka di Supabase. Jalankan file supabase/toko.sql, lalu tambahkan toko di Exposed schemas.";
  }
  if (/simpan_pesanan_penjualan|jadi_penjualan_dari_so|batal_pesanan_penjualan|pesanan_penjualan/i.test(message) && /does not exist|schema cache|42883|42P01|PGRST202|PGRST204|PGRST205/i.test(message)) {
    return "Tabel pesanan penjualan belum ada. Jalankan file supabase/pesanan-penjualan.sql di SQL Editor proyek bekon-pro.";
  }
  if (/daftar_pesanan_toko_bekon|sahkan_pesanan_toko_bekon|kembalikan_pesanan_toko_bekon|daftar_katalog_toko_bekon|rincian_po_toko_bekon/i.test(message)) {
    return "Fungsi pesanan Bekon belum dipasang. Jalankan file supabase/pesanan-bekon.sql di SQL Editor proyek bekon-pro.";
  }
  if (/daftar_po_toko_bekon|sinkron_penjualan_toko_bekon/i.test(message)) {
    return "Fungsi tarik PO belum dipasang. Jalankan file supabase/sinkron-po.sql di SQL Editor proyek bekon-pro.";
  }
  if (/username|menu_izin|lowongan|pelamar|karyawan|pelamar_id/i.test(message) && /does not exist|schema cache|42703|PGRST204/i.test(message)) {
    return "Tabel akses dan SDM belum ada. Jalankan file supabase/sdm-akses.sql di SQL Editor project bekon-pro.";
  }
  if (/ubah_penjualan/i.test(message) && /does not exist|schema cache|42883|PGRST202/i.test(message)) {
    return "Fungsi ubah nota belum dipasang. Jalankan file supabase/ubah-nota.sql di SQL Editor proyek bekon-pro.";
  }
  if (/ubah_pembelian|ubah_retur_penjualan|ubah_retur_pembelian/i.test(message) && /does not exist|schema cache|42883|PGRST202/i.test(message)) {
    return "Fungsi ubah pembelian dan retur belum dipasang. Jalankan file supabase/ubah-pembelian-retur.sql di SQL Editor proyek bekon-pro.";
  }
  if (/catat_pelunasan_banyak|atur_jatuh_tempo|jatuh_tempo|jurnal_baris/i.test(message)) {
    return "Jurnal pelunasan belum dipasang. Jalankan file supabase/bayar-jurnal.sql di SQL Editor proyek bekon-pro.";
  }
  if (/ubah_penyesuaian_stok/i.test(message) && /does not exist|schema cache|42883|PGRST202/i.test(message)) {
    return "Fungsi ubah penyesuaian stok belum dipasang. Jalankan file supabase/ubah-penyesuaian.sql di SQL Editor Supabase, lalu simpan lagi.";
  }
  if (/catat_penyesuaian_stok|penyesuaian_stok/i.test(message) && /does not exist|schema cache|42883|42P01|PGRST202|PGRST205|PGRST204/i.test(message)) {
    return "Penyesuaian stok belum dipasang. Jalankan file supabase/persediaan.sql di SQL Editor Supabase, lalu simpan lagi.";
  }
  if (/akun_perkiraan/i.test(message) && /does not exist|schema cache|42P01|PGRST205|PGRST204/i.test(message)) {
    return "Tabel akun perkiraan belum ada. Jalankan file supabase/akun-perkiraan.sql di SQL Editor Supabase, lalu buka halaman ini lagi.";
  }
  if (/relation .* does not exist|42P01/i.test(message)) {
    return "Tabel toko belum ada. Jalankan file supabase/toko.sql di SQL Editor project bekon-pro.";
  }
  return message;
}
