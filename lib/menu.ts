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
      { href: "/penjualan", label: "Penjualan" },
      { href: "/dari-bekon", label: "Dari Bekon" },
      { href: "/retur-penjualan", label: "Retur Penjualan" },
      { href: "/pembelian", label: "Pembelian" },
      { href: "/retur-pembelian", label: "Retur Pembelian" },
    ],
  },
  {
    group: "Keuangan",
    items: [
      { href: "/piutang", label: "Piutang" },
      { href: "/hutang", label: "Hutang" },
      { href: "/laporan", label: "Laporan" },
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
    items: [{ href: "/akses", label: "Akses & Akun" }],
  },
];

/** Akses bawaan bila akun tidak punya daftar menu sendiri. */
export const aksesBawaan: Record<string, Peran[]> = {
  "/dashboard": ["admin", "kasir", "pembelian", "akunting"],
  "/penjualan": ["admin", "kasir", "akunting"],
  "/dari-bekon": ["admin", "akunting"],
  "/retur-penjualan": ["admin", "kasir", "akunting"],
  "/pembelian": ["admin", "pembelian", "akunting"],
  "/retur-pembelian": ["admin", "pembelian", "akunting"],
  "/piutang": ["admin", "kasir", "akunting"],
  "/hutang": ["admin", "pembelian", "akunting"],
  "/laporan": ["admin", "akunting"],
  "/produk": ["admin", "kasir", "pembelian", "akunting"],
  "/supplier": ["admin", "pembelian"],
  "/pelanggan": ["admin", "kasir"],
  "/master": ["admin"],
  "/sdm/rekrutmen": ["admin"],
  "/sdm/karyawan": ["admin"],
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
