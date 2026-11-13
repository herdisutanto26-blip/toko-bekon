export type PaketUji = "uji_karyawan" | "uji_kepala";

export type SoalUjian = {
  id: string;
  pertanyaan: string;
  opsi: [string, string, string, string];
  benar: 0 | 1 | 2 | 3;
  pembahasan: string;
};

export const labelPaket: Record<PaketUji, string> = {
  uji_karyawan: "Ujian Karyawan Toko",
  uji_kepala: "Ujian Kepala Toko",
};

export const soalUjian: Record<PaketUji, SoalUjian[]> = {
  uji_karyawan: [
    {
      id: "k1",
      pertanyaan:
        "Pelanggan belanja Rp87.500 dan bayar Rp100.000. Berapa kembalian yang benar?",
      opsi: ["Rp11.500", "Rp12.500", "Rp13.500", "Rp22.500"],
      benar: 1,
      pembahasan: "100.000 − 87.500 = 12.500.",
    },
    {
      id: "k2",
      pertanyaan:
        "Tiga item: Rp15.000, Rp22.500, dan Rp8.000. Ada diskon nota Rp5.000. Total bayar pelanggan?",
      opsi: ["Rp40.500", "Rp45.500", "Rp50.500", "Rp35.500"],
      benar: 0,
      pembahasan: "(15.000 + 22.500 + 8.000) − 5.000 = 40.500.",
    },
    {
      id: "k3",
      pertanyaan:
        "Harga satuan Rp12.000. Pelanggan ambil 7 pcs dengan diskon 10% dari subtotal. Berapa yang dibayar?",
      opsi: ["Rp75.600", "Rp84.000", "Rp70.000", "Rp76.800"],
      benar: 0,
      pembahasan: "Subtotal 84.000; diskon 10% = 8.400; bayar 75.600.",
    },
    {
      id: "k4",
      pertanyaan:
        "Uang di laci awal Rp200.000. Penjualan tunai Rp350.000. Pengeluaran resmi Rp25.000. Kas akhir seharusnya?",
      opsi: ["Rp525.000", "Rp550.000", "Rp575.000", "Rp500.000"],
      benar: 0,
      pembahasan: "200.000 + 350.000 − 25.000 = 525.000.",
    },
    {
      id: "k5",
      pertanyaan:
        "Pelanggan bayar Rp50.000 untuk belanja Rp47.800. Anda salah kasih kembalian Rp3.200. Selisih kas toko menjadi?",
      opsi: ["Lebih Rp1.000", "Kurang Rp1.000", "Lebih Rp2.200", "Kurang Rp2.200"],
      benar: 1,
      pembahasan: "Kembalian benar Rp2.200; dikasih Rp3.200 → kas kurang Rp1.000.",
    },
    {
      id: "k6",
      pertanyaan:
        "Stok awal 40. Masuk 25. Keluar terjual 48. Stok akhir seharusnya?",
      opsi: ["15", "17", "23", "13"],
      benar: 1,
      pembahasan: "40 + 25 − 48 = 17.",
    },
    {
      id: "k7",
      pertanyaan:
        "Item dijual Rp35.000. Modal/HPP Rp28.000. Margin kotor per unit berapa persen dari harga jual?",
      opsi: ["20%", "25%", "18%", "22%"],
      benar: 0,
      pembahasan: "(35.000 − 28.000) / 35.000 = 20%.",
    },
    {
      id: "k8",
      pertanyaan:
        "Promo beli 3 gratis 1 berlaku untuk item seharga Rp10.000. Pelanggan ambil 4 unit. Total bayar?",
      opsi: ["Rp30.000", "Rp40.000", "Rp20.000", "Rp35.000"],
      benar: 0,
      pembahasan: "Bayar 3 unit, 1 gratis → 30.000.",
    },
    {
      id: "k9",
      pertanyaan:
        "Pelanggan minta nota lebih besar dari nilai asli untuk klaim kantor. Sikap yang benar?",
      opsi: [
        "Tolak karena nilai nota harus sama dengan transaksi nyata",
        "Setujui jika pelanggan menambah bayar selisihnya",
        "Buat dua nota berbeda untuk keperluan masing-masing",
        "Setujui hanya untuk pelanggan langganan lama",
      ],
      benar: 0,
      pembahasan: "Memalsukan nilai nota melanggar integritas dan berisiko hukum.",
    },
    {
      id: "k10",
      pertanyaan:
        "Harga sistem Rp45.000, label rak Rp42.000. Tindakan paling tepat sebelum ada keputusan atasan?",
      opsi: [
        "Tahan transaksi dan minta keputusan kepala toko",
        "Langsung jual Rp42.000 tanpa konfirmasi",
        "Paksakan Rp45.000 meski pelanggan protes",
        "Ubah harga master sendiri agar cocok label",
      ],
      benar: 0,
      pembahasan: "Selisih harga adalah keputusan kebijakan, bukan inisiatif kasir sendiri.",
    },
    {
      id: "k11",
      pertanyaan:
        "Anda input qty 10 padahal 1, pelanggan sudah pergi. Langkah pertama yang benar?",
      opsi: [
        "Laporkan untuk koreksi resmi sesuai SOP",
        "Diamkan agar tidak kena teguran",
        "Buat penjualan fiktif untuk menutup selisih",
        "Kurangi stok rak manual tanpa catatan",
      ],
      benar: 0,
      pembahasan: "Kesalahan qty memengaruhi stok dan keuangan; harus dikoreksi resmi.",
    },
    {
      id: "k12",
      pertanyaan:
        "Rekan minta PIN Anda karena 'kasir error'. Respons paling tepat?",
      opsi: [
        "Tolak berbagi PIN; minta bantuan lewat jalur resmi",
        "Berikan PIN sementara lalu ganti nanti",
        "Tulis PIN di grup chat agar semua bisa bantu",
        "Loginkan dia dengan akun Anda lalu biarkan",
      ],
      benar: 0,
      pembahasan: "PIN pribadi menjaga jejak tanggung jawab tiap transaksi.",
    },
    {
      id: "k13",
      pertanyaan:
        "Belanja Rp120.000 mendapat cashback voucher Rp15.000 yang hanya berlaku transaksi berikutnya. Kas masuk hari ini?",
      opsi: ["Rp120.000", "Rp105.000", "Rp135.000", "Rp15.000"],
      benar: 0,
      pembahasan: "Cashback untuk transaksi berikutnya; hari ini kas tetap 120.000.",
    },
    {
      id: "k14",
      pertanyaan:
        "Empat nota: 25.000, 18.000, 42.000, 15.000. Satu nota 18.000 dibatalkan. Total penjualan sah?",
      opsi: ["Rp82.000", "Rp100.000", "Rp85.000", "Rp67.000"],
      benar: 0,
      pembahasan: "25 + 42 + 15 = 82; nota 18.000 tidak dihitung.",
    },
    {
      id: "k15",
      pertanyaan:
        "Pelanggan bayar campuran: tunai Rp30.000 + transfer Rp55.000 untuk total Rp85.000. Apakah lunas?",
      opsi: ["Ya, tepat lunas", "Kurang Rp5.000", "Lebih Rp5.000", "Kurang Rp30.000"],
      benar: 0,
      pembahasan: "30.000 + 55.000 = 85.000.",
    },
    {
      id: "k16",
      pertanyaan:
        "Anda menemukan kelebihan kas Rp20.000 tanpa penjelasan. Tindakan benar?",
      opsi: [
        "Laporkan dan catat sebagai selisih lebih kas",
        "Bagi ke karyawan shift yang sama",
        "Simpan pribadi sampai ada yang klaim",
        "Campur ke kas berikutnya tanpa catatan",
      ],
      benar: 0,
      pembahasan: "Kelebihan kas wajib dilaporkan seperti kekurangan kas.",
    },
    {
      id: "k17",
      pertanyaan:
        "Harga Rp80.000, diskon bertingkat 10% lalu 5% dari sisa. Berapa bayar akhir?",
      opsi: ["Rp68.400", "Rp68.000", "Rp72.000", "Rp70.000"],
      benar: 0,
      pembahasan: "Setelah 10%: 72.000; lalu 5%: 68.400.",
    },
    {
      id: "k18",
      pertanyaan:
        "Stok minimum 20. Stok aktual 18, ada PO masuk 30 besok. Untuk penjualan hari ini, sikap paling aman?",
      opsi: [
        "Jual hati-hati sesuai stok fisik yang ada hari ini",
        "Jual sampai 48 karena PO pasti datang",
        "Tutup penjualan item itu sepenuhnya",
        "Ubah stok sistem jadi 48 tanpa barang datang",
      ],
      benar: 0,
      pembahasan: "Yang bisa dijamin hari ini hanya stok fisik; PO belum tentu sudah tersedia.",
    },
    {
      id: "k19",
      pertanyaan:
        "Barang rusak ditemukan saat rapiin rak. Tindakan benar?",
      opsi: [
        "Pisahkan, laporkan, jangan jual sebagai barang baik",
        "Tetap jual harga normal tanpa info",
        "Buang diam-diam tanpa laporan",
        "Turunkan harga sendiri tanpa izin",
      ],
      benar: 0,
      pembahasan: "Barang rusak harus tercatat dan tidak dijual seolah kondisi baik.",
    },
    {
      id: "k20",
      pertanyaan:
        "Total tunai hari ini Rp400.000. Modal kas awal Rp150.000. Setoran ke brankas harus berapa jika kas akhir di laci disisakan Rp100.000?",
      opsi: ["Rp450.000", "Rp400.000", "Rp350.000", "Rp500.000"],
      benar: 0,
      pembahasan: "Kas tersedia 150.000 + 400.000 = 550.000; sisakan 100.000 → setor 450.000.",
    },
  ],
  uji_kepala: [
    {
      id: "h1",
      pertanyaan:
        "Omset Rp120.000.000. HPP Rp84.000.000. Biaya operasional Rp22.000.000. Laba bersih?",
      opsi: ["Rp14.000.000", "Rp36.000.000", "Rp16.000.000", "Rp22.000.000"],
      benar: 0,
      pembahasan: "Laba kotor 36jt; setelah biaya 22jt → laba bersih 14jt.",
    },
    {
      id: "h2",
      pertanyaan:
        "Omset Rp80.000.000. Laba kotor Rp24.000.000. Gross margin berapa persen?",
      opsi: ["30%", "24%", "28%", "32%"],
      benar: 0,
      pembahasan: "24 / 80 = 30%.",
    },
    {
      id: "h3",
      pertanyaan:
        "Harga jual Rp50.000. Target margin kotor 25% dari harga jual. HPP maksimal?",
      opsi: ["Rp37.500", "Rp40.000", "Rp35.000", "Rp12.500"],
      benar: 0,
      pembahasan: "HPP = 50.000 × (1 − 0,25) = 37.500.",
    },
    {
      id: "h4",
      pertanyaan:
        "Omset naik dari Rp100jt menjadi Rp118jt, tetapi laba turun dari Rp12jt ke Rp9jt. Makna paling tepat?",
      opsi: [
        "Pertumbuhan omset tidak selalu sehat jika margin/biaya memburuk",
        "Omset naik selalu berarti bisnis makin sehat",
        "Laba turun pasti karena pajak saja",
        "Yang penting omset; laba bisa diabaikan",
      ],
      benar: 0,
      pembahasan: "Perlu bedah margin, diskon, HPP, dan biaya — omset naik bisa dibarengi laba turun.",
    },
    {
      id: "h5",
      pertanyaan:
        "Persediaan rata-rata Rp40jt. HPP setahun Rp160jt. Inventory turns setahun?",
      opsi: ["4 kali", "5 kali", "3 kali", "6 kali"],
      benar: 0,
      pembahasan: "Turns = HPP / persediaan rata-rata = 160 / 40 = 4.",
    },
    {
      id: "h6",
      pertanyaan:
        "Item A: omset Rp30jt margin 10%. Item B: omset Rp20jt margin 25%. Kontribusi laba kotor mana lebih besar?",
      opsi: [
        "B lebih besar (Rp5jt vs Rp3jt)",
        "A lebih besar karena omset lebih tinggi",
        "Sama besar",
        "Tidak bisa dibandingkan tanpa biaya sewa",
      ],
      benar: 0,
      pembahasan: "A: 3jt; B: 5jt. Kontribusi B lebih tinggi meski omset lebih kecil.",
    },
    {
      id: "h7",
      pertanyaan:
        "Diskon 15% diberikan pada item bermargin 18% (dari harga jual). Setelah diskon, margin menjadi kira-kira?",
      opsi: [
        "Sekitar 3% (nyaris habis)",
        "Tetap 18%",
        "Naik menjadi 33%",
        "Menjadi 15%",
      ],
      benar: 0,
      pembahasan:
        "Jika HPP = 82% harga lama, setelah harga jadi 85%, margin ≈ (85−82)/85 ≈ 3,5%.",
    },
    {
      id: "h8",
      pertanyaan:
        "Piutang Rp25jt, di antaranya Rp8jt already > 60 hari. Jika 40% dari yang aging diperkirakan macet, estimasi kerugian?",
      opsi: ["Rp3,2jt", "Rp8jt", "Rp10jt", "Rp2jt"],
      benar: 0,
      pembahasan: "40% × 8jt = 3,2jt.",
    },
    {
      id: "h9",
      pertanyaan:
        "Target laba kuartal Rp15jt. Margin bersih historis 8% dari omset. Omset minimal yang dibutuhkan?",
      opsi: ["Rp187,5jt", "Rp150jt", "Rp120jt", "Rp200jt"],
      benar: 0,
      pembahasan: "15 / 0,08 = 187,5jt.",
    },
    {
      id: "h10",
      pertanyaan:
        "Kas awal bulan Rp20jt. Penerimaan Rp55jt. Pengeluaran Rp48jt. Kas akhir?",
      opsi: ["Rp27jt", "Rp35jt", "Rp23jt", "Rp7jt"],
      benar: 0,
      pembahasan: "20 + 55 − 48 = 27jt.",
    },
    {
      id: "h11",
      pertanyaan:
        "Supplier kasih diskon beli 12% jika ambil stok 3 bulan. Biaya simpan diperkirakan 4% per bulan dari nilai stok ekstra. Tanpa hitung lain, 2 bulan simpan ekstra ≈?",
      opsi: [
        "Biaya simpan ~8% bisa menggerus manfaat diskon 12%",
        "Diskon 12% selalu untung berapa pun lama simpan",
        "Biaya simpan tidak relevan untuk keputusan beli",
        "Ambil 3 bulan selalu lebih murah secara kas",
      ],
      benar: 0,
      pembahasan:
        "Manfaat diskon harus dibandingkan carrying cost dan dampak kas; 8% vs 12% tinggal tipis sebelum risiko lain.",
    },
    {
      id: "h12",
      pertanyaan:
        "Omset hari ini Rp9jt dari 180 nota. Average basket size?",
      opsi: ["Rp50.000", "Rp45.000", "Rp60.000", "Rp40.000"],
      benar: 0,
      pembahasan: "9.000.000 / 180 = 50.000.",
    },
    {
      id: "h13",
      pertanyaan:
        "Harga kompetitor Rp46.000. HPP Anda Rp40.000. Jika match harga, margin Anda?",
      opsi: [
        "≈13% dari harga jual",
        "≈20% dari harga jual",
        "≈8% dari harga jual",
        "≈25% dari harga jual",
      ],
      benar: 0,
      pembahasan: "(46.000 − 40.000) / 46.000 ≈ 13%.",
    },
    {
      id: "h14",
      pertanyaan:
        "Shrinkage tercatat Rp1,5jt pada bulan dengan HPP Rp50jt. Persentase shrinkage terhadap HPP?",
      opsi: ["3%", "1,5%", "5%", "2%"],
      benar: 0,
      pembahasan: "1,5 / 50 = 3%.",
    },
    {
      id: "h15",
      pertanyaan:
        "Dua opsi promo: (1) diskon 10% semua item, (2) bundling item margin tinggi. Jika tujuan jaga laba, pilihan yang lebih aman?",
      opsi: [
        "Bundling terarah pada item bermargin sehat",
        "Diskon merata 10% ke semua item",
        "Turunkan harga di bawah HPP untuk traffic",
        "Gratis tanpa batas untuk semua kategori",
      ],
      benar: 0,
      pembahasan: "Diskon merata merusak margin global; promo terarah lebih terkendali.",
    },
    {
      id: "h16",
      pertanyaan:
        "Penjualan kredit Rp12jt. Pelunasan masuk Rp7jt. Piutang bertambah berapa (abaikan saldo awal)?",
      opsi: ["Rp5jt", "Rp12jt", "Rp7jt", "Rp19jt"],
      benar: 0,
      pembahasan: "Tambah piutang neto = kredit baru − pelunasan = 5jt.",
    },
    {
      id: "h17",
      pertanyaan:
        "Biaya tetap Rp18jt/bulan. Margin kontribusi rata-rata 20% dari omset. Omset break-even?",
      opsi: ["Rp90jt", "Rp72jt", "Rp100jt", "Rp80jt"],
      benar: 0,
      pembahasan: "BE = biaya tetap / margin kontribusi = 18 / 0,2 = 90jt.",
    },
    {
      id: "h18",
      pertanyaan:
        "SKU slow moving nilai Rp6jt. Promo clearance laku Rp4,5jt dengan HPP Rp5,2jt. Dampak paling akurat?",
      opsi: [
        "Omset Rp4,5jt tetapi realisasi rugi kotor Rp0,7jt, plus bebaskan modal",
        "Otomatis untung karena stok berkurang",
        "Tidak ada dampak ke laba karena uang masuk",
        "Laba naik Rp4,5jt penuh",
      ],
      benar: 0,
      pembahasan: "Clearance bisa rugi kotor (4,5 − 5,2) tetapi memperbaiki turns/modal.",
    },
    {
      id: "h19",
      pertanyaan:
        "Target naikkan keuntungan 10% dari laba bulan lalu Rp10jt. Jika margin bersih tetap 5%, berapa omset tambahan yang dibutuhkan?",
      opsi: ["Rp20jt", "Rp10jt", "Rp5jt", "Rp50jt"],
      benar: 0,
      pembahasan: "Laba tambahan Rp1jt; omset tambahan = 1 / 0,05 = 20jt.",
    },
    {
      id: "h20",
      pertanyaan:
        "Laporan harian kepala toko paling berguna jika memuat kombinasi metrik berikut:",
      opsi: [
        "Omset, margin/laba, kas & selisih, stok kritis, aging piutang",
        "Hanya omset dan jumlah pengunjung",
        "Hanya absensi karyawan dan foto etalase",
        "Hanya jumlah nota tanpa nilai dan margin",
      ],
      benar: 0,
      pembahasan: "Keputusan harian butuh profitabilitas, kas, stok, dan risiko kredit — bukan vanity metric saja.",
    },
  ],
};

export function paketDariPeran(peran: string): PaketUji | null {
  if (peran === "uji_karyawan" || peran === "uji_kepala") return peran;
  return null;
}

/** Acak urutan soal dan opsi agar kunci tidak mudah ditebak dari posisi. */
export function acakSoal(daftar: SoalUjian[]): SoalUjian[] {
  const soal = [...daftar];
  for (let i = soal.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [soal[i], soal[j]] = [soal[j], soal[i]];
  }

  return soal.map((s) => {
    const indeks = [0, 1, 2, 3];
    for (let i = indeks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indeks[i], indeks[j]] = [indeks[j], indeks[i]];
    }
    const opsi = indeks.map((i) => s.opsi[i]) as SoalUjian["opsi"];
    const benar = indeks.indexOf(s.benar) as 0 | 1 | 2 | 3;
    return { ...s, opsi, benar };
  });
}
