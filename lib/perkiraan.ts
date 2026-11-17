export type JenisPerkiraan = "kelompok" | "akun";

export type AkunPerkiraan = {
  id: string;
  kode: string;
  nama: string;
  jenis: JenisPerkiraan;
  induk_id: string | null;
  aktif: boolean;
};

export function bandingKode(a: string, b: string) {
  const pa = a.split("-").map((bagian) => Number(bagian));
  const pb = b.split("-").map((bagian) => Number(bagian));
  const panjang = Math.max(pa.length, pb.length);
  for (let i = 0; i < panjang; i += 1) {
    const beda = (pa[i] ?? -1) - (pb[i] ?? -1);
    if (beda !== 0) return beda;
  }
  return 0;
}

export function anakPerkiraan(daftar: AkunPerkiraan[], indukId: string | null) {
  return daftar
    .filter((akun) => (akun.induk_id ?? null) === indukId)
    .sort((a, b) => {
      if (a.jenis !== b.jenis) return a.jenis === "kelompok" ? -1 : 1;
      return bandingKode(a.kode, b.kode);
    });
}

export function keturunan(daftar: AkunPerkiraan[], id: string) {
  const hasil = new Set<string>([id]);
  let tambah = true;
  while (tambah) {
    tambah = false;
    for (const akun of daftar) {
      if (akun.induk_id && hasil.has(akun.induk_id) && !hasil.has(akun.id)) {
        hasil.add(akun.id);
        tambah = true;
      }
    }
  }
  return hasil;
}

export function kodeBerikutnya(daftar: AkunPerkiraan[], jenis: JenisPerkiraan, indukId: string | null) {
  const terpakai = new Set(daftar.map((akun) => akun.kode));
  let kode = kodeAwal(daftar, jenis, indukId);
  for (let i = 0; i < 100 && terpakai.has(kode); i += 1) kode = naikKode(kode);
  return kode;
}

function kodeAwal(daftar: AkunPerkiraan[], jenis: JenisPerkiraan, indukId: string | null) {
  const saudara = daftar.filter((akun) => (akun.induk_id ?? null) === indukId && akun.jenis === jenis);
  if (jenis === "kelompok") {
    if (!indukId) {
      const nomor = saudara.map((akun) => Number(akun.kode)).filter((n) => Number.isInteger(n));
      return String((nomor.length ? Math.max(...nomor) : 0) + 1);
    }
    const induk = daftar.find((akun) => akun.id === indukId);
    const awal = induk?.kode ?? "0";
    const ekor = saudara.map((akun) => {
      const sisa = akun.kode.startsWith(`${awal}-`) ? akun.kode.slice(awal.length + 1) : "";
      return Number(sisa.split("-")[0]);
    }).filter((n) => Number.isInteger(n) && n > 0);
    return `${awal}-${(ekor.length ? Math.max(...ekor) : 0) + 1}`;
  }

  const induk = daftar.find((akun) => akun.id === indukId);
  const akar = (induk?.kode ?? "1").split("-")[0];
  const nomorSaudara = saudara
    .map((akun) => Number(akun.kode.split("-").pop()))
    .filter((n) => Number.isFinite(n));
  if (nomorSaudara.length) {
    const max = Math.max(...nomorSaudara);
    return `${akar}-${String(Math.ceil((max + 1) / 10) * 10).padStart(4, "0")}`;
  }
  const bagian = (induk?.kode ?? akar).split("-");
  const grup = bagian.length > 1 ? Number(bagian[1]) : 1;
  const awal = (Number.isFinite(grup) && grup > 0 ? grup : 1) * 1000;
  return `${akar}-${String(awal).padStart(4, "0")}`;
}

function naikKode(kode: string) {
  const bagian = kode.split("-");
  const akhir = bagian.pop() ?? "0";
  const nomor = Number(akhir);
  if (!Number.isFinite(nomor)) return `${kode}-1`;
  const next = bagian.length === 0 ? nomor + 1 : Math.ceil((nomor + 1) / 10) * 10;
  const teks = bagian.length === 0 ? String(next) : String(next).padStart(Math.max(akhir.length, String(next).length), "0");
  return [...bagian, teks].join("-");
}
