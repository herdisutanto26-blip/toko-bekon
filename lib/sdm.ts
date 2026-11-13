export const TAHAP_PELAMAR = ["baru", "screening", "tes", "wawancara", "penawaran", "diterima", "ditolak"] as const;
export type TahapPelamar = (typeof TAHAP_PELAMAR)[number];

export const labelTahap: Record<TahapPelamar, string> = {
  baru: "Baru",
  screening: "Screening",
  tes: "Tes",
  wawancara: "Wawancara",
  penawaran: "Penawaran",
  diterima: "Diterima",
  ditolak: "Ditolak",
};

export const warnaTahap: Record<TahapPelamar, string> = {
  baru: "bg-blue-50 text-blue-700",
  screening: "bg-amber-50 text-amber-800",
  tes: "bg-orange-50 text-orange-700",
  wawancara: "bg-purple-50 text-purple-700",
  penawaran: "bg-cyan-50 text-cyan-800",
  diterima: "bg-green-50 text-green-700",
  ditolak: "bg-red-50 text-red-700",
};

export const SUMBER_PELAMAR = ["Walk-in", "Referensi", "WhatsApp", "Media sosial", "Lainnya"] as const;

export const JABATAN_TOKO = ["Kasir", "Staf Pembelian", "Kepala Toko", "Admin Toko", "Gudang"] as const;

/** Skor saran lulus. Keputusan tetap di admin. */
export const AMBANG_LULUS = 0.7;

export const alurRekrutmen = [
  { tahap: "Lowongan", isi: "Buka posisi dan pilih bahan tes: karyawan toko atau kepala toko." },
  { tahap: "Screening", isi: "Catat sumber lamaran dan hasil saringan awal." },
  { tahap: "Tes", isi: "Kirim tautan ujian. Pelamar mengerjakan bahan tes lowongan itu tanpa akun, urutan soal diacak." },
  { tahap: "Wawancara", isi: "Catat hasil wawancara setelah tes dinilai." },
  { tahap: "Keputusan", isi: "Terima atau tolak. Yang diterima disimpan sebagai karyawan." },
  { tahap: "Akun", isi: "Buatkan akun aplikasi beserta kata sandi bila sudah mulai bekerja." },
] as const;

export function slugAkun(nama: string) {
  const dasar = nama
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return dasar || "akun";
}

export function sandiSementara() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
