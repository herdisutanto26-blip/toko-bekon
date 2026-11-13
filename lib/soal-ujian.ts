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
        "Pelanggan membawa uang pas Rp100.000 untuk belanja Rp87.500, lalu segera pergi sambil bilang 'kembaliannya nanti saja'. Tindakan paling tepat?",
      opsi: [
        "Simpan uang 100.000 di laci dan catat hutang kembalian di kertas pribadi",
        "Tolak transaksi sampai kembalian bisa diselesaikan di tempat, atau minta pelanggan menunggu sebentar",
        "Ambil kembalian dari uang pribadi agar cepat selesai",
        "Anggap pelanggan mengikhlaskan Rp12.500 sebagai tip",
      ],
      benar: 1,
      pembahasan:
        "Kembalian adalah hak pelanggan dan bagian dari kas toko. Tidak boleh ditunda tanpa prosedur resmi atau diganti uang pribadi.",
    },
    {
      id: "k2",
      pertanyaan:
        "Dua pelanggan datang hampir bersamaan: satu sudah di kasir, satu bertanya stok di lorong. Anda sendirian. Prioritas yang paling benar?",
      opsi: [
        "Tinggalkan kasir untuk bantu pencarian stok agar terlihat ramah",
        "Selesaikan transaksi di kasir dulu, sambil memberitahu pelanggan lorong bahwa Anda segera membantu",
        "Minta pelanggan kasir menunggu tanpa penjelasan lalu ke lorong",
        "Abaikan keduanya sampai ada rekan datang",
      ],
      benar: 1,
      pembahasan:
        "Kasir yang sedang transaksi tidak boleh ditinggalkan. Komunikasi singkat ke pelanggan lain menjaga antrean dan keamanan kas.",
    },
    {
      id: "k3",
      pertanyaan:
        "Harga di sistem Rp45.000, label rak Rp42.000. Pelanggan menuntut harga label. Kebijakan paling aman sebelum ada SOP tertulis dari atasan?",
      opsi: [
        "Langsung jual Rp42.000 tanpa lapor siapa pun",
        "Paksakan Rp45.000 meski pelanggan marah",
        "Tahan transaksi, konfirmasi ke kepala toko, lalu ikuti keputusan resmi",
        "Jual Rp42.000 dan ubah harga master sendiri agar cocok",
      ],
      benar: 2,
      pembahasan:
        "Selisih harga adalah isu kebijakan. Keputusan harus dari atasan agar konsisten dan terdokumentasi.",
    },
    {
      id: "k4",
      pertanyaan:
        "Pelanggan minta nota 'lebih besar dari harga sebenarnya' untuk keperluan klaim kantor. Respons yang benar?",
      opsi: [
        "Boleh, asal pelanggan bayar selisihnya diam-diam",
        "Tolak, karena memalsukan nilai nota adalah pelanggaran dan berisiko hukum",
        "Setuju jika pelanggan langganan lama",
        "Buat dua nota: satu asli satu palsu",
      ],
      benar: 1,
      pembahasan:
        "Nota harus mencerminkan transaksi nyata. Memalsukan nilai melanggar integritas dan bisa berakibat hukum.",
    },
    {
      id: "k5",
      pertanyaan:
        "Saat hitung uang di laci, ada kelebihan Rp20.000 yang tidak jelas asal-usulnya. Langkah benar?",
      opsi: [
        "Bagi ke karyawan yang sedang shift",
        "Simpan di saku dulu, nanti dikembalikan jika ada yang klaim",
        "Laporkan ke kepala toko dan catat sebagai selisih/lebih kas sesuai prosedur",
        "Campur ke kas berikutnya tanpa catatan",
      ],
      benar: 2,
      pembahasan:
        "Kelebihan kas sama pentingnya dengan kekurangan: harus dilaporkan dan dicatat, bukan diambil pribadi.",
    },
    {
      id: "k6",
      pertanyaan:
        "Barang pecah belah jatuh dan retak saat Anda menata rak. Belum ada pelanggan yang melihat. Apa yang harus dilakukan?",
      opsi: [
        "Rapikan diam-diam dan tetap jual dengan harga normal",
        "Buang ke tempat sampah tanpa laporan agar tidak kena teguran",
        "Pisahkan barang rusak, laporkan, dan jangan dijual sebagai barang baik",
        "Turunkan harga sendiri tanpa izin lalu jual cepat",
      ],
      benar: 2,
      pembahasan:
        "Barang rusak adalah kerugian yang harus tercatat. Menjual barang cacat tanpa info merugikan pelanggan dan toko.",
    },
    {
      id: "k7",
      pertanyaan:
        "Pelanggan marah karena antre lama, lalu memaki Anda di depan umum. Respons profesional terbaik?",
      opsi: [
        "Membalas dengan nada yang sama agar tidak dianggap lemah",
        "Tetap tenang, minta maaf atas menunggu, fokus selesaikan kebutuhan dengan sopan, eskalasi jika mengancam",
        "Menutup kasir dan pergi ke belakang tanpa bicara",
        "Menawarkan diskon besar tanpa wewenang agar diam",
      ],
      benar: 1,
      pembahasan:
        "Emosi pelanggan ditangani dengan tenang dan prosedur. Diskon atau balas dendam bukan solusi wewenang karyawan.",
    },
    {
      id: "k8",
      pertanyaan:
        "Teman kerja minta Anda 'tutup mata' saat dia membawa pulang sedikit baut/paku sisa tanpa dicatat. Sikap benar?",
      opsi: [
        "Boleh, karena nilainya kecil",
        "Tolak dan ingatkan bahwa pengambilan tanpa prosedur adalah pelanggaran, laporkan jika berulang",
        "Minta bagian juga agar adil",
        "Catat di buku pribadi saja tanpa sepengetahuan toko",
      ],
      benar: 1,
      pembahasan:
        "Pengambilan barang tanpa prosedur adalah pencurian stok, terlepas dari nilai kecil.",
    },
    {
      id: "k9",
      pertanyaan:
        "Pelanggan sudah bayar, lalu 10 menit kemudian mengaku kurang dapat 1 item. Nota menunjukkan item itu sudah tertera. Langkah terbaik?",
      opsi: [
        "Langsung berikan barang tambahan tanpa cek",
        "Tuduh pelanggan berbohong di depan antrean",
        "Cek nota, cek rekaman/saksi/isi tas belanja bila memungkinkan, lalu putuskan sesuai bukti dan SOP",
        "Suruh pelanggan beli lagi karena sudah keluar kasir",
      ],
      benar: 2,
      pembahasan:
        "Klaim kekurangan dicek berbasis bukti dan SOP, bukan langsung menuduh atau memberi barang tanpa verifikasi.",
    },
    {
      id: "k10",
      pertanyaan:
        "Anda diminta menutup shift, tetapi belum sempat mencocokkan kas dengan rekap penjualan. Apa yang seharusnya terjadi?",
      opsi: [
        "Langsung pulang dan cocokkan besok saja",
        "Serahkan laci ke shift berikutnya tanpa serah terima tertulis",
        "Selesaikan hitung kas dan serah terima sesuai checklist sebelum meninggalkan tanggung jawab",
        "Tanya pelanggan terakhir berapa total belanja untuk perkiraan kas",
      ],
      benar: 2,
      pembahasan:
        "Serah terima kas adalah titik kritis. Meninggalkan tanpa cocok = risiko selisih tidak tertelusur.",
    },
    {
      id: "k11",
      pertanyaan:
        "Pelanggan kredit meminta tambah belanja padahal limit/jatuh tempo bermasalah menurut catatan toko. Karyawan sebaiknya?",
      opsi: [
        "Tetap jual karena pelanggan 'pasti bayar'",
        "Tahan dulu, konfirmasi kebijakan kredit ke kepala toko sebelum menambah piutang",
        "Naikkan limit sendiri agar pelanggan senang",
        "Hapus catatan jatuh tempo lama agar bisa transaksi",
      ],
      benar: 1,
      pembahasan:
        "Keputusan kredit adalah kebijakan manajemen. Karyawan tidak boleh menambah risiko piutang sendiri.",
    },
    {
      id: "k12",
      pertanyaan:
        "Saat input penjualan, Anda salah ketik qty 10 padahal 1, dan pelanggan sudah pergi dengan struk. Langkah pertama yang benar?",
      opsi: [
        "Buat penjualan negatif sembarangan tanpa prosedur",
        "Diamkan agar tidak kena teguran",
        "Segera laporkan ke atasan untuk koreksi resmi (retur/void sesuai SOP) dan hubungi pelanggan bila perlu",
        "Kurangi stok manual di rak supaya 'nyambung'",
      ],
      benar: 2,
      pembahasan:
        "Kesalahan qty memengaruhi stok dan keuangan. Koreksi harus lewat prosedur resmi, bukan ditutupi.",
    },
    {
      id: "k13",
      pertanyaan:
        "Ada promosi 'beli 2 gratis 1' hanya untuk SKU tertentu. Pelanggan memaksa semua merek ikut promo. Apa yang benar?",
      opsi: [
        "Izinkan semua merek agar tidak ribut",
        "Jelaskan syarat promo dengan sopan dan tawarkan opsi produk yang memang ikut promo",
        "Diam-diam kasih gratis tanpa input sistem",
        "Ubah aturan promo di sistem tanpa izin",
      ],
      benar: 1,
      pembahasan:
        "Promo punya syarat. Melanggar syarat merusak margin dan laporan; komunikasi jelas lebih tepat.",
    },
    {
      id: "k14",
      pertanyaan:
        "Anda menemukan selisih stok fisik vs sistem pada item mahal. Tindakan awal paling tepat?",
      opsi: [
        "Langsung tuduh rekan shift sebelumnya",
        "Sesuaikan angka sistem ke fisik tanpa investigasi",
        "Amankan area, laporkan ke kepala toko, bantu hitung ulang dan telusuri mutasi terakhir",
        "Sembunyikan selisih dengan menambah penjualan fiktif",
      ],
      benar: 2,
      pembahasan:
        "Selisih stok mahal perlu investigasi terkontrol, bukan tuduhan atau penyesuaian buta.",
    },
    {
      id: "k15",
      pertanyaan:
        "Pelanggan meminta Anda menyimpan barang di luar area kasir 'sebentar' tanpa menitip resmi. Risiko utama jika disetujui sembarangan?",
      opsi: [
        "Tidak ada risiko",
        "Barang bisa tertukar/hilang dan toko sulit membuktikan tanggung jawab",
        "Hanya membuat toko terlihat ramai",
        "Membuat stok otomatis bertambah",
      ],
      benar: 1,
      pembahasan:
        "Penitipan informal sering jadi sengketa kehilangan. Ikuti prosedur penitipan resmi bila ada.",
    },
    {
      id: "k16",
      pertanyaan:
        "Rekan meminta PIN Anda karena 'kasirnya error'. Respons paling tepat?",
      opsi: [
        "Berikan PIN, nanti diganti",
        "Tolak berbagi PIN; bantu lewat jalur resmi atau minta atasan reset akses",
        "Tulis PIN di chat grup agar semua bisa bantu",
        "Loginkan dia dengan akun Anda lalu biarkan sendiri",
      ],
      benar: 1,
      pembahasan:
        "PIN/akses bersifat pribadi. Berbagi menghilangkan jejak pertanggungjawaban transaksi.",
    },
    {
      id: "k17",
      pertanyaan:
        "Saat busy hour, Anda diminta sekalian membersihkan gudang belakang yang jauh dari lantai jual. Keputusan terbaik?",
      opsi: [
        "Langsung ke gudang karena perintah harus dituruti mentah-mentah",
        "Sampaikan prioritas lantai jual saat ramai, usulkan jadwal bersih-bersih di luar jam puncak ke atasan",
        "Abaikan semua tugas",
        "Tutup kasir tanpa koordinasi untuk bersih-bersih",
      ],
      benar: 1,
      pembahasan:
        "Prioritas operasional saat ramai adalah pelayanan. Tugas sekunder dijadwalkan tanpa mengorbankan kasir/lantai jual.",
    },
    {
      id: "k18",
      pertanyaan:
        "Pelanggan menawar agresif di bawah harga modal yang Anda ketahui. Anda tidak punya wewenang diskon. Langkah benar?",
      opsi: [
        "Kasih harga di bawah modal agar closing",
        "Jelaskan harga berlaku, tawarkan alternatif/produk lain, atau eskalasi ke kepala toko bila perlu keputusan khusus",
        "Bohongi bahwa harga sudah diskon maksimal tanpa cek",
        "Suruh pelanggan ke kompetitor",
      ],
      benar: 1,
      pembahasan:
        "Menjual di bawah modal tanpa wewenang merugikan toko. Eskalasi dan alternatif lebih profesional.",
    },
    {
      id: "k19",
      pertanyaan:
        "Anda melihat CCTV/indikasi pelanggan mencurigakan menyembunyikan barang. Tindakan yang tepat dan aman?",
      opsi: [
        "Menghakimi dan menggeledah paksa di depan umum",
        "Ikuti SOP keamanan: amati, libatkan atasan/security, jangan main hakim sendiri",
        "Langsung memaki di media sosial toko",
        "Diam saja meski bukti kuat dan ada prosedur",
      ],
      benar: 1,
      pembahasan:
        "Penanganan kecurangan mengikuti SOP agar aman secara hukum dan tidak memperburuk situasi.",
    },
    {
      id: "k20",
      pertanyaan:
        "Di akhir hari ada selisih kas kurang Rp50.000. Beberapa orang menyarankan 'ditutup dari penjualan tunai besok'. Sikap benar?",
      opsi: [
        "Setuju menutup diam-diam agar laporan rapi",
        "Laporkan selisih apa adanya, ikut investigasi, jangan manipulasi transaksi berikutnya",
        "Pinjam uang teman untuk mengisi laci tanpa catatan",
        "Kurangi stok barang setara Rp50.000 agar seimbang",
      ],
      benar: 1,
      pembahasan:
        "Menutup selisih dengan manipulasi memperparah masalah. Laporan jujur memungkinkan perbaikan sistem.",
    },
  ],
  uji_kepala: [
    {
      id: "h1",
      pertanyaan:
        "Omset bulan ini naik 18%, tetapi laba bersih turun. Analisis pertama yang paling relevan?",
      opsi: [
        "Pastikan etalase lebih menarik karena omset sudah naik",
        "Bedah margin kotor, diskon/promo, COGS, shrinkage, dan biaya operasional yang ikut naik",
        "Naikkan target omset lagi tanpa cek struktur biaya",
        "Abaikan laba karena omset lebih penting untuk citra",
      ],
      benar: 1,
      pembahasan:
        "Omset naik belum tentu sehat. Kepala toko harus memisahkan masalah harga/margin, loss, dan biaya.",
    },
    {
      id: "h2",
      pertanyaan:
        "Anda punya dua opsi promo: potongan 15% semua item, atau bundling item bermargin tinggi. Mana lebih tepat jika tujuan adalah jaga keuntungan?",
      opsi: [
        "Potongan merata 15% karena paling gampang dijelaskan",
        "Bundling/item fokus bermargin sehat agar volume naik tanpa merusak seluruh margin kategori",
        "Gratis semua ongkir tanpa batas meski toko tidak punya skema ongkir",
        "Turunkan harga di bawah modal untuk semua SKU top seller",
      ],
      benar: 1,
      pembahasan:
        "Diskon merata mudah merusak margin global. Promo terarah pada margin sehat lebih terkendali.",
    },
    {
      id: "h3",
      pertanyaan:
        "Piutang 60 hari naik tajam sementara omset kredit juga naik. Keputusan manajerial yang paling tepat?",
      opsi: [
        "Longgarkan lagi limit agar omset kredit terus tumbuh",
        "Kunci limit bermasalah, prioritaskan penagihan, evaluasi syarat kredit, dan pisahkan target omset tunai vs kredit",
        "Hapus piutang lama dari laporan agar aging terlihat baik",
        "Alihkan semua penjualan ke kredit tanpa DP",
      ],
      benar: 1,
      pembahasan:
        "Omset kredit yang menumpuk aging merusak kas. Kontrol kredit dan penagihan lebih penting daripada omset semu.",
    },
    {
      id: "h4",
      pertanyaan:
        "Persediaan mengikat modal besar, turns rendah. Langkah paling strategis?",
      opsi: [
        "Tambah SKU baru sebanyak-banyaknya",
        "Identifikasi dead stock, stop reorder, dorong sell-through terukur, rapikan assortment berdasarkan kontribusi margin",
        "Sewa gudang tambahan tanpa evaluasi SKU",
        "Naikkan harga semua slow moving 50% sekaligus",
      ],
      benar: 1,
      pembahasan:
        "Masalahnya efisiensi modal stok. Perbaiki mix dan turns, bukan memperluas gudang atau SKU tanpa seleksi.",
    },
    {
      id: "h5",
      pertanyaan:
        "Supplier menawarkan diskon pembelian besar jika Anda ambil 3× lipat kebutuhan. Kapan penawaran ini boleh diterima?",
      opsi: [
        "Selalu diterima karena diskon pembelian = otomatis lebih untung",
        "Hanya jika hitungan menunjukkan keuntungan setelah biaya simpan, risiko kedaluwarsa/rusak, dan dampak arus kas",
        "Diterima jika sales menjanjikan bonus pribadi",
        "Ditolak selalu karena stok banyak selalu buruk",
      ],
      benar: 1,
      pembahasan:
        "Diskon qty harus diuji dengan carrying cost dan cashflow, bukan diterima otomatis.",
    },
    {
      id: "h6",
      pertanyaan:
        "Kasir A sering selisih kecil, Kasir B jarang selisih tapi komplain pelanggan tinggi. Fokus coaching yang tepat?",
      opsi: [
        "Pecat keduanya tanpa data",
        "Untuk A: perketat cash control & pelatihan akurasi; untuk B: coaching service recovery & standar interaksi, ukur keduanya dengan metrik berbeda",
        "Pindahkan A ke gudang dan abaikan isu B",
        "Samakan hukuman tanpa melihat akar masalah",
      ],
      benar: 1,
      pembahasan:
        "Masalah berbeda butuh intervensi berbeda. Kepala toko mengelola kinerja berbasis akar penyebab.",
    },
    {
      id: "h7",
      pertanyaan:
        "Harga kompetitor di sebelah lebih murah 8% untuk item traffic. Respons yang paling bijak?",
      opsi: [
        "Perang harga total sampai margin habis",
        "Analisis peran item (traffic vs margin), pertimbangkan price-match terbatas, bundling, atau diferensiasi layanan/stok tanpa merusak keseluruhan margin",
        "Abaikan pelanggan yang membandingkan harga",
        "Naikkan harga item lain secara sembarangan untuk menutupi",
      ],
      benar: 1,
      pembahasan:
        "Respons kompetitif harus selektif. Perang harga menyeluruh sering menghancurkan laba.",
    },
    {
      id: "h8",
      pertanyaan:
        "Laporan menunjukkan gross margin turun 3 poin. Manakah penyebab yang paling mungkin perlu diuji duluan?",
      opsi: [
        "Warna cat dinding toko",
        "Perubahan mix produk, kenaikan COGS, diskon tidak terkendali, atau salah harga jual",
        "Jumlah follower media sosial",
        "Cuaca saja tanpa cek data penjualan",
      ],
      benar: 1,
      pembahasan:
        "Margin kotor terpengaruh harga jual, HPP, mix, dan diskon — itu yang dicek lebih dulu.",
    },
    {
      id: "h9",
      pertanyaan:
        "Anda harus memilih: kejar omset akhir bulan dengan diskon dalam, atau jaga margin meski omset datar. Kerangka keputusan yang benar?",
      opsi: [
        "Omset selalu nomor satu tanpa syarat",
        "Putuskan berdasarkan target laba & kas: diskon dalam hanya jika kontribusi setelah diskon dan tujuan strategis (clearance) jelas",
        "Margin selalu dikorbankan demi ranking omset antar cabang",
        "Tidak perlu kerangka; ikuti feeling shift malam",
      ],
      benar: 1,
      pembahasan:
        "Kepala toko mengoptimalkan laba dan kas, bukan vanity metric omset semata.",
    },
    {
      id: "h10",
      pertanyaan:
        "Shrinkage (hilang/rusak) naik. Urutan tindakan yang paling tepat?",
      opsi: [
        "Langsung potong gaji semua karyawan merata",
        "Ukur kategori kerugian, perketat receiving & cycle count, review akses gudang, investigasi outlier, baru sanksi berbasis bukti",
        "Matikan CCTV agar hemat listrik",
        "Naikkan harga semua barang 10% tanpa bereskan proses",
      ],
      benar: 1,
      pembahasan:
        "Shrinkage dikendalikan lewat proses dan bukti, bukan hukuman kolektif membabi buta.",
    },
    {
      id: "h11",
      pertanyaan:
        "Tim pembelian ingin menambah 50 SKU baru. Apa filter keputusan kepala toko?",
      opsi: [
        "Terima semua agar rak terlihat penuh",
        "Uji potensi margin, turns, overlapping dengan SKU existing, kapasitas rak/modal, dan peran strategis kategori",
        "Tolak semua inovasi",
        "Pilih SKU berdasarkan bonus vendor semata",
      ],
      benar: 1,
      pembahasan:
        "Assortment expansion harus lolos filter ekonomi dan operasional, bukan sekadar menambah SKU.",
    },
    {
      id: "h12",
      pertanyaan:
        "Arus kas ketat, hutang supplier jatuh tempo bersamaan dengan gaji. Prioritas yang paling sehat secara keberlanjutan usaha?",
      opsi: [
        "Bayar promo iklan dulu, tunda gaji dan supplier",
        "Susun prioritas: kewajiban kritis (gaji sesuai aturan, supplier strategis untuk stok jalan), tundakan pengeluaran non-esensial, negosiasi jatuh tempo dengan data",
        "Abaikan semua tagihan sampai bulan depan",
        "Bayar supplier non-strategis dulu karena paling sering menagih",
      ],
      benar: 1,
      pembahasan:
        "Prioritas kas menjaga operasional dan hubungan kritis, plus kepatuhan terhadap kewajiban karyawan.",
    },
    {
      id: "h13",
      pertanyaan:
        "Satu pelanggan besar minta harga khusus yang hampir menghabiskan margin, dengan janji volume. Syarat agar bisa dipertimbangkan?",
      opsi: [
        "Langsung setujui lisan tanpa batas waktu",
        "Hitung break-even volume, batasi SKU/periode, kunci syarat pembayaran, dan review berkala pencapaian volume",
        "Berikan harga khusus permanen untuk semua produk",
        "Tolak otomatis tanpa analisis karena semua harga khusus buruk",
      ],
      benar: 1,
      pembahasan:
        "Harga khusus harus berbasis hitungan dan kontrol, bukan janji volume tanpa mekanisme review.",
    },
    {
      id: "h14",
      pertanyaan:
        "Dashboard harian Anda hanya menampilkan omset. Metrik tambahan yang paling kritis untuk keputusan kepala toko?",
      opsi: [
        "Jumlah likes di posting toko",
        "Gross margin / estimasi laba, kas & selisih, stok kritis, aging piutang, dan isu layanan/tim",
        "Hanya jumlah nota tanpa nilai",
        "Hanya panjang antrean tanpa nilai transaksi",
      ],
      benar: 1,
      pembahasan:
        "Keputusan harian butuh kombinasi profitabilitas, kas, stok, dan risiko operasional.",
    },
    {
      id: "h15",
      pertanyaan:
        "Ada usulan menambah jam buka malam. Bagaimana mengevaluasinya?",
      opsi: [
        "Langsung buka karena kompetitor juga buka",
        "Uji dengan data: potensi penjualan malam vs biaya tenaga/listrik/keamanan dan risiko, pilot terbatas, lalu putuskan",
        "Tolak karena malam selalu sepi di semua lokasi",
        "Buka 24 jam tanpa uji coba",
      ],
      benar: 1,
      pembahasan:
        "Perubahan jam operasional adalah keputusan berbasis unit economics, bukan ikut-ikutan.",
    },
    {
      id: "h16",
      pertanyaan:
        "Dua kategori: A omset tinggi margin tipis, B omset sedang margin tebal. Alokasi ruang rak yang lebih rasional?",
      opsi: [
        "Berikan semua ruang ke A karena omset tertinggi",
        "Seimbangkan: A untuk traffic terkendali, B cukup space untuk maksimalkan kontribusi laba, evaluasi ulang berkala",
        "Hapus B karena omsetnya bukan yang terbesar",
        "Acak space tiap minggu tanpa data",
      ],
      benar: 1,
      pembahasan:
        "Space planning mengoptimalkan kontribusi laba dan traffic, bukan hanya mengejar omset kategori.",
    },
    {
      id: "h17",
      pertanyaan:
        "Karyawan star performer meminta kenaikan besar di luar skema. Pendekatan manajerial yang tepat?",
      opsi: [
        "Tolak kasar tanpa dialog",
        "Nilai dampak bisnis, bandingkan dengan struktur gaji/insentif, tawarkan jalur berbasis kinerja yang adil dan sustainable",
        "Kabulkan semua permintaan agar tidak resign, tanpa hitungan",
        "Naikkan gaji semua orang dengan persentase sama tanpa terkait kinerja",
      ],
      benar: 1,
      pembahasan:
        "Retensi penting, tetapi kompensasi harus adil, terukur, dan tidak merusak struktur biaya.",
    },
    {
      id: "h18",
      pertanyaan:
        "Anda menemukan pola: retur tinggi pada satu kategori setelah ganti supplier. Langkah paling tepat?",
      opsi: [
        "Sembunyikan retur agar KPI terlihat baik",
        "Analisis penyebab (kualitas/salah kirim/salah jual), hentikan sementara reorder, negosiasi klaim, perbaiki QC receiving",
        "Naikkan harga kategori itu saja tanpa bereskan kualitas",
        "Pindahkan retur ke kategori lain di laporan",
      ],
      benar: 1,
      pembahasan:
        "Retur adalah sinyal kualitas/proses. Harus ditelusuri ke supplier dan receiving, bukan dikosmetik.",
    },
    {
      id: "h19",
      pertanyaan:
        "Target kuartal: naikkan keuntungan 10%. Manakah portofolio aksi yang paling koheren?",
      opsi: [
        "Hanya pasang spanduk baru",
        "Kombinasi: naikkan mix produk bermargin, kendalikan diskon, turunkan shrinkage, rapikan biaya tetap variabel, dan jaga konversi layanan",
        "Potong semua gaji 10%",
        "Diskon besar-besaran sepanjang kuartal tanpa kontrol",
      ],
      benar: 1,
      pembahasan:
        "Naik laba biasanya hasil beberapa tuas: mix, harga/diskon, loss, biaya, dan eksekusi layanan.",
    },
    {
      id: "h20",
      pertanyaan:
        "Di rapat, sales mendorong 'closing umpamanya' dengan janji spekulatif stok yang belum pasti ada. Sikap kepala toko?",
      opsi: [
        "Izinkan janji spekulatif demi omset hari itu",
        "Larang overpromise; jual berbasis ketersediaan/ETA tertulis, jaga kepercayaan jangka panjang meski closing lebih lambat",
        "Biarkan tiap kasir membuat kebijakan sendiri",
        "Catat penjualan dulu, stok menyusul entah kapan",
      ],
      benar: 1,
      pembahasan:
        "Overpromise merusak kepercayaan dan menimbulkan biaya operasional tambahan. Integritas stok/ETA lebih berharga jangka panjang.",
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
