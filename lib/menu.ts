export type Peran =
  | "admin"
  | "kasir"
  | "pembelian"
  | "akunting"
  | "uji_karyawan"
  | "uji_kepala";

export type ItemMenu = { href: string; label: string };
export type GrupMenu = { group: string; items: ItemMenu[] };

export const menuToko: GrupMenu[] = [
  { group: "Utama", items: [{ href: "/dashboard", label: "Dashboard" }] },
  {
    group: "Transaksi",
    items: [
      { href: "/pesanan", label: "Pesanan Penjualan" },
      { href: "/penjualan", label: "Penjualan" },
      { href: "/retur-penjualan", label: "Retur Penjualan" },
      { href: "/pembelian", label: "Pembelian" },
      { href: "/retur-pembelian", label: "Retur Pembelian" },
    ],
  },
  {
    group: "Akuntansi",
    items: [
      { href: "/piutang", label: "Piutang" },
      { href: "/hutang", label: "Hutang" },
      { href: "/persediaan", label: "Persediaan" },
      { href: "/akuntansi/akun-perkiraan", label: "Akun Perkiraan" },
      { href: "/akuntansi/jurnal", label: "Jurnal" },
      { href: "/akuntansi/buku-besar", label: "Buku Besar" },
      { href: "/akuntansi/neraca", label: "Neraca" },
      { href: "/akuntansi/rugi-laba", label: "Rugi Laba" },
    ],
  },
  {
    group: "Master Data",
    items: [
      { href: "/produk", label: "Produk" },
      { href: "/supplier", label: "Supplier" },
      { href: "/pelanggan", label: "Pelanggan" },
      { href: "/master", label: "Kategori & Satuan" },
    ],
  },
  {
    group: "SDM",
    items: [
      { href: "/sdm/rekrutmen", label: "Rekrutmen" },
      { href: "/sdm/karyawan", label: "Karyawan" },
    ],
  },
  {
    group: "Pengaturan",
    items: [
      { href: "/pengaturan", label: "Data toko" },
      { href: "/akses", label: "Akses & Akun" },
    ],
  },
];

/** Akses bawaan bila akun tidak punya daftar menu sendiri. */
export const aksesBawaan: Record<string, Peran[]> = {
  "/dashboard": ["admin", "kasir", "pembelian", "akunting"],
  "/pesanan": ["admin", "akunting"],
  "/dari-bekon": ["admin", "akunting"],
  "/penjualan": ["admin", "kasir", "akunting"],
  "/retur-penjualan": ["admin", "kasir", "akunting"],
  "/pembelian": ["admin", "pembelian", "akunting"],
  "/retur-pembelian": ["admin", "pembelian", "akunting"],
  "/piutang": ["admin", "kasir", "akunting"],
  "/hutang": ["admin", "pembelian", "akunting"],
  "/persediaan": ["admin", "pembelian", "akunting"],
  "/laporan": ["admin", "akunting"],
  "/akuntansi/akun-kas": ["admin", "akunting"],
  "/akuntansi/akun-perkiraan": ["admin", "akunting"],
  "/akuntansi/jurnal": ["admin", "akunting"],
  "/akuntansi/buku-besar": ["admin", "akunting"],
  "/akuntansi/neraca": ["admin", "akunting"],
  "/akuntansi/rugi-laba": ["admin", "akunting"],
  "/produk": ["admin", "kasir", "pembelian", "akunting"],
  "/supplier": ["admin", "pembelian"],
  "/pelanggan": ["admin", "kasir"],
  "/master": ["admin"],
  "/sdm/rekrutmen": ["admin"],
  "/sdm/karyawan": ["admin"],
  "/pengaturan": ["admin"],
  "/akses": ["admin"],
};

export const peranOperasional: Peran[] = ["admin", "kasir", "pembelian", "akunting"];

export function labelPeran(peran: string) {
  if (peran === "admin") return "Admin";
  if (peran === "kasir") return "Kasir";
  if (peran === "pembelian") return "Pembelian";
  if (peran === "akunting") return "Akunting";
  if (peran === "uji_karyawan") return "Ujian · Karyawan";
  if (peran === "uji_kepala") return "Ujian · Kepala Toko";
  return peran;
}

export function menuUntukPeran(peran: Peran) {
  if (peran === "uji_karyawan" || peran === "uji_kepala") return ["/uji"];
  return menuToko.flatMap((g) => g.items).filter((item) => aksesBawaan[item.href]?.includes(peran)).map((item) => item.href);
}
