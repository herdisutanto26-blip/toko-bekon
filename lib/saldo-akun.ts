export type SaldoAkun = { kode: string; nama: string; saldo: number };

// Kas dan bank mengikuti jurnal sampai 29 Oktober 2026, ditambah kas masuk, kas keluar, dan pelunasan hutang yang sudah tercatat sampai 7 November tetapi belum masuk jurnal.
export const kasBank: SaldoAkun[] = [
  { kode: "1-1110", nama: "Kas kasir", saldo: -2584545 },
  { kode: "1-1120", nama: "Bank BCA", saldo: 3275901 },
  { kode: "1-1130", nama: "Bank BSI", saldo: 200000 },
  { kode: "1-1163", nama: "Kasbon Hilman", saldo: 100000 },
  { kode: "1-1171", nama: "Shopee beli", saldo: 40376 },
  { kode: "1-1172", nama: "Shopee jual", saldo: 44000 },
];

export const asetTetap: SaldoAkun[] = [
  { kode: "1-2310", nama: "Mobil pick up 2009", saldo: 36000000 },
  { kode: "1-2400", nama: "Perlengkapan", saldo: 26380000 },
];

export const kewajibanLain: SaldoAkun[] = [
  { kode: "2-3200", nama: "Setoran dimuka belum dijurnal", saldo: 50000000 },
];
