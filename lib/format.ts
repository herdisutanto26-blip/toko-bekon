export function formatRp(n: number) {
  return "Rp " + Math.round(n || 0).toLocaleString("id-ID");
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

export function sisaTagihan(grand: number, dibayar: number, retur: number) {
  return Math.max(0, Number(grand || 0) - Number(dibayar || 0) - Number(retur || 0));
}

export function pesanError(message: string) {
  if (/PGRST106|Invalid schema|schema must be/i.test(message)) {
    return "Skema toko belum dibuka di Supabase. Jalankan file supabase/toko.sql, lalu tambahkan toko di Exposed schemas.";
  }
  if (/daftar_po_toko_bekon|sinkron_penjualan_toko_bekon/i.test(message)) {
    return "Fungsi tarik PO belum dipasang. Jalankan file supabase/sinkron-po.sql di SQL Editor proyek bekon-pro.";
  }
  if (/relation .* does not exist|42P01/i.test(message)) {
    return "Tabel toko belum ada. Jalankan file supabase/toko.sql di SQL Editor project bekon-pro.";
  }
  return message;
}
