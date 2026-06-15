export type KategoriProduk = {
  id: string;
  nama: string;
  keterangan: string | null;
  created_at: string;
};

export type Satuan = {
  id: string;
  nama: string;
};

export type Produk = {
  id: string;
  kode_sku: string | null;
  nama: string;
  kategori_id: string | null;
  satuan_id: string | null;
  harga_beli: number;
  harga_jual: number;
  stok_minimum: number;
  punya_varian: boolean;
  aktif: boolean;
  keterangan: string | null;
  created_at: string;
  updated_at: string;
  // joined
  kategori_produk?: KategoriProduk;
  satuan?: Satuan;
  stok?: number;
};

export type ProdukVarian = {
  id: string;
  produk_id: string;
  nama_varian: string;
  kode_sku: string | null;
  harga_beli: number;
  harga_jual: number;
  stok: number;
  aktif: boolean;
  created_at: string;
};

export type Supplier = {
  id: string;
  nama: string;
  telepon: string | null;
  alamat: string | null;
  email: string | null;
  keterangan: string | null;
  aktif: boolean;
  created_at: string;
};

export type Pelanggan = {
  id: string;
  nama: string;
  telepon: string | null;
  alamat: string | null;
  email: string | null;
  tipe: "umum" | "kontraktor";
  limit_kredit: number;
  aktif: boolean;
  created_at: string;
};

export type Penjualan = {
  id: string;
  nomor_nota: string;
  tanggal: string;
  pelanggan_id: string | null;
  proyek_id: string | null;
  catatan: string | null;
  total: number;
  diskon: number;
  grand_total: number;
  status_bayar: "belum_lunas" | "sebagian" | "lunas";
  jatuh_tempo: string | null;
  created_at: string;
  pelanggan?: Pelanggan;
};

export type PenjualanItem = {
  id: string;
  penjualan_id: string;
  produk_id: string;
  varian_id: string | null;
  qty: number;
  harga_satuan: number;
  subtotal: number;
  produk?: Produk;
  varian?: ProdukVarian;
};

export type Pembelian = {
  id: string;
  nomor_po: string;
  tanggal: string;
  supplier_id: string;
  catatan: string | null;
  total: number;
  status: "draft" | "diterima" | "selesai" | "batal";
  created_at: string;
  supplier?: Supplier;
};
