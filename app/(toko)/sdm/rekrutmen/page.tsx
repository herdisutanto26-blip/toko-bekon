"use client";

import { useEffect, useState } from "react";
import { db, hashPin } from "@/lib/api";
import { type Peran } from "@/lib/auth";
import { pesanError, todayIso } from "@/lib/format";
import { labelPeran, peranOperasional } from "@/lib/menu";
import { labelPaket, soalUjian, type PaketUji } from "@/lib/soal-ujian";
import {
  AMBANG_LULUS,
  JABATAN_TOKO,
  SUMBER_PELAMAR,
  TAHAP_PELAMAR,
  alurRekrutmen,
  labelTahap,
  slugAkun,
  warnaTahap,
  type TahapPelamar,
} from "@/lib/sdm";

type Lowongan = {
  id: string;
  judul: string;
  paket_uji: PaketUji;
  status: "dibuka" | "ditutup";
  keterangan: string | null;
};

type Pelamar = {
  id: string;
  lowongan_id: string;
  nama: string;
  telepon: string | null;
  sumber: string | null;
  tahap: TahapPelamar;
  catatan: string | null;
  catatan_wawancara: string | null;
  hasil_tes: "lulus" | "tidak_lulus" | null;
  pengguna_uji_id: string | null;
  token_tes: string | null;
  karyawan_id: string | null;
  created_at: string;
  lowongan?: { judul: string; paket_uji: PaketUji } | { judul: string; paket_uji: PaketUji }[] | null;
};

type Hasil = {
  id: string;
  nama: string;
  paket: string;
  pengguna_id: string | null;
  pelamar_id: string | null;
  skor: number;
  total: number;
  created_at: string;
};

const input = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm";

function lowonganDari(row: Pelamar) {
  if (!row.lowongan) return null;
  return Array.isArray(row.lowongan) ? row.lowongan[0] : row.lowongan;
}

async function usernameBebas(dasar: string) {
  let calon = dasar;
  for (let i = 0; i < 6; i++) {
    const { data } = await db().from("pengguna").select("id").eq("username", calon).maybeSingle();
    if (!data) return calon;
    calon = `${dasar}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return `${dasar}-${Date.now().toString().slice(-4)}`;
}

export default function RekrutmenPage() {
  const [tab, setTab] = useState<"alur" | "lowongan" | "pelamar" | "bahan" | "hasil">("alur");
  const [lowongan, setLowongan] = useState<Lowongan[]>([]);
  const [pelamar, setPelamar] = useState<Pelamar[]>([]);
  const [hasil, setHasil] = useState<Hasil[]>([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);

  function flash(text: string) {
    setInfo(text);
    setError("");
  }

  async function muat() {
    const [l, p, h] = await Promise.all([
      db().from("lowongan").select("id,judul,paket_uji,status,keterangan").order("created_at"),
      db()
        .from("pelamar")
        .select("id,lowongan_id,nama,telepon,sumber,tahap,catatan,catatan_wawancara,hasil_tes,pengguna_uji_id,token_tes,karyawan_id,created_at,lowongan(judul,paket_uji)")
        .order("created_at", { ascending: false }),
      db().from("hasil_ujian").select("id,nama,paket,pengguna_id,pelamar_id,skor,total,created_at").order("created_at", { ascending: false }),
    ]);
    const err = l.error || p.error || h.error;
    setLoading(false);
    if (err) {
      setError(pesanError(err.message));
      return;
    }
    setError("");
    const daftar = (p.data ?? []) as Pelamar[];
    setLowongan((l.data ?? []) as Lowongan[]);
    setPelamar(daftar);
    setHasil((h.data ?? []) as Hasil[]);
  }

  useEffect(() => {
    muat();
  }, []);

  const hitung = Object.fromEntries(TAHAP_PELAMAR.map((t) => [t, pelamar.filter((p) => p.tahap === t).length])) as Record<TahapPelamar, number>;

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rekrutmen</h1>
        <p className="text-sm text-gray-500 mt-1">
          Dari lowongan sampai akun karyawan. Bahan tes mengikuti posisi. Pelamar membuka tautan ujian, tanpa masuk ke Akses & Akun.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["alur", "Alur"],
            ["lowongan", "Lowongan"],
            ["pelamar", "Pelamar"],
            ["hasil", "Hasil tes"],
            ["bahan", "Bahan tes"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === id ? "bg-orange-600 text-white" : "bg-white border border-gray-200 text-gray-600"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {info && <p className="text-sm text-green-700">{info}</p>}
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}

      {!loading && tab === "alur" && (
        <Alur hitung={hitung} lowongan={lowongan} onBuka={() => setTab("lowongan")} onPelamar={() => setTab("pelamar")} />
      )}
      {!loading && tab === "lowongan" && (
        <LowonganPanel lowongan={lowongan} onSelesai={muat} onInfo={flash} onError={setError} />
      )}
      {!loading && tab === "pelamar" && (
        <PelamarPanel
          lowongan={lowongan}
          pelamar={pelamar}
          hasil={hasil}
          onSelesai={muat}
          onInfo={flash}
          onError={setError}
        />
      )}
      {!loading && tab === "bahan" && <BahanTes lowongan={lowongan} />}
      {!loading && tab === "hasil" && <HasilTes hasil={hasil} />}
    </div>
  );
}

function Alur({
  hitung,
  lowongan,
  onBuka,
  onPelamar,
}: {
  hitung: Record<TahapPelamar, number>;
  lowongan: Lowongan[];
  onBuka: () => void;
  onPelamar: () => void;
}) {
  const dibuka = lowongan.filter((l) => l.status === "dibuka").length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kartu label="Lowongan dibuka" nilai={String(dibuka)} />
        <Kartu label="Menunggu tes" nilai={String(hitung.baru + hitung.screening)} />
        <Kartu label="Sedang tes" nilai={String(hitung.tes)} />
        <Kartu label="Diterima" nilai={String(hitung.diterima)} />
      </div>
      <ol className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {alurRekrutmen.map((langkah, i) => (
          <li key={langkah.tahap} className="px-5 py-4 flex gap-4">
            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-50 text-xs font-semibold text-orange-700">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900">{langkah.tahap}</p>
              <p className="text-sm text-gray-500 mt-0.5">{langkah.isi}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex gap-2">
        <button type="button" onClick={onBuka} className="bg-orange-600 text-white rounded-lg px-4 py-2 text-sm font-medium">
          Kelola lowongan
        </button>
        <button type="button" onClick={onPelamar} className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700">
          Daftar pelamar
        </button>
      </div>
    </div>
  );
}

function Kartu({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{nilai}</p>
    </div>
  );
}

function LowonganPanel({
  lowongan,
  onSelesai,
  onInfo,
  onError,
}: {
  lowongan: Lowongan[];
  onSelesai: () => Promise<void>;
  onInfo: (t: string) => void;
  onError: (t: string) => void;
}) {
  const [judul, setJudul] = useState("");
  const [paket, setPaket] = useState<PaketUji>("uji_karyawan");
  const [keterangan, setKeterangan] = useState("");

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!judul.trim()) return;
    const { error } = await db().from("lowongan").insert({
      judul: judul.trim(),
      paket_uji: paket,
      keterangan: keterangan.trim() || null,
      status: "dibuka",
    });
    if (error) {
      onError(pesanError(error.message));
      return;
    }
    setJudul("");
    setKeterangan("");
    onInfo("Lowongan dibuka.");
    await onSelesai();
  }

  async function gantiStatus(row: Lowongan) {
    const status = row.status === "dibuka" ? "ditutup" : "dibuka";
    const { error } = await db().from("lowongan").update({ status }).eq("id", row.id);
    if (error) {
      onError(pesanError(error.message));
      return;
    }
    await onSelesai();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={simpan} className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Judul lowongan" className={input} />
        <select value={paket} onChange={(e) => setPaket(e.target.value as PaketUji)} className={input}>
          <option value="uji_karyawan">{labelPaket.uji_karyawan}</option>
          <option value="uji_kepala">{labelPaket.uji_kepala}</option>
        </select>
        <input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Keterangan" className={input} />
        <button className="bg-orange-600 text-white rounded-lg text-sm font-medium">Buka lowongan</button>
      </form>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Posisi</th>
              <th className="px-4 py-3 font-medium">Bahan tes</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {lowongan.map((row) => (
              <tr key={row.id} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{row.judul}</p>
                  {row.keterangan && <p className="text-gray-500 text-xs mt-0.5">{row.keterangan}</p>}
                </td>
                <td className="px-4 py-3 text-gray-600">{labelPaket[row.paket_uji]}</td>
                <td className="px-4 py-3">{row.status === "dibuka" ? "Dibuka" : "Ditutup"}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => gantiStatus(row)} className="text-orange-700 hover:underline">
                    {row.status === "dibuka" ? "Tutup" : "Buka lagi"}
                  </button>
                </td>
              </tr>
            ))}
            {lowongan.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Belum ada lowongan</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PelamarPanel({
  lowongan,
  pelamar,
  hasil,
  onSelesai,
  onInfo,
  onError,
}: {
  lowongan: Lowongan[];
  pelamar: Pelamar[];
  hasil: Hasil[];
  onSelesai: () => Promise<void>;
  onInfo: (t: string) => void;
  onError: (t: string) => void;
}) {
  const [nama, setNama] = useState("");
  const [telepon, setTelepon] = useState("");
  const [sumber, setSumber] = useState<string>(SUMBER_PELAMAR[0]);
  const [lowonganId, setLowonganId] = useState(lowongan.find((l) => l.status === "dibuka")?.id ?? lowongan[0]?.id ?? "");
  const [saring, setSaring] = useState<TahapPelamar | "">("");
  const [buka, setBuka] = useState<string | null>(null);

  const tampil = saring ? pelamar.filter((p) => p.tahap === saring) : pelamar;

  async function tambah(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim() || !lowonganId) return;
    const { error } = await db().from("pelamar").insert({
      nama: nama.trim(),
      telepon: telepon.trim() || null,
      sumber,
      lowongan_id: lowonganId,
      tahap: "baru",
    });
    if (error) {
      onError(pesanError(error.message));
      return;
    }
    setNama("");
    setTelepon("");
    onInfo("Pelamar dicatat. Setelah screening, salin tautan tes dan kirim ke pelamar.");
    await onSelesai();
  }

  async function buatTautan(row: Pelamar, ganti = false) {
    const token = !ganti && row.token_tes ? row.token_tes : crypto.randomUUID();
    const tahap = row.tahap === "baru" || row.tahap === "screening" ? "tes" : row.tahap;
    const { error } = await db().from("pelamar").update({ token_tes: token, tahap }).eq("id", row.id);
    if (error) {
      onError(pesanError(error.message));
      return;
    }
    const url = `${window.location.origin}/uji/${token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Tautan tetap tampil di kartu bila salin otomatis ditolak browser.
    }
    setBuka(row.id);
    onInfo(ganti ? "Tautan lama tidak berlaku. Tautan baru disalin." : "Tautan tes disalin. Pelamar tidak perlu akun.");
    await onSelesai();
  }

  async function simpanPelamar(id: string, payload: Record<string, unknown>) {
    const { error } = await db().from("pelamar").update(payload).eq("id", id);
    if (error) {
      onError(pesanError(error.message));
      return;
    }
    await onSelesai();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={tambah} className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama pelamar" className={input} />
        <input value={telepon} onChange={(e) => setTelepon(e.target.value)} placeholder="Telepon" className={input} />
        <select value={sumber} onChange={(e) => setSumber(e.target.value)} className={input}>
          {SUMBER_PELAMAR.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={lowonganId} onChange={(e) => setLowonganId(e.target.value)} className={input}>
          {lowongan.map((l) => (
            <option key={l.id} value={l.id}>
              {l.judul} · {labelPaket[l.paket_uji]}
            </option>
          ))}
        </select>
        <button className="bg-orange-600 text-white rounded-lg text-sm font-medium">Tambah pelamar</button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Saring aktif={saring === ""} onClick={() => setSaring("")} label="Semua" />
        {TAHAP_PELAMAR.map((t) => (
          <Saring key={t} aktif={saring === t} onClick={() => setSaring(t)} label={labelTahap[t]} />
        ))}
      </div>

      <div className="space-y-3">
        {tampil.map((row) => {
          const posisi = lowonganDari(row);
          const skor = hasil.find((h) => h.pelamar_id === row.id || (row.pengguna_uji_id && h.pengguna_id === row.pengguna_uji_id));
          const persen = skor ? Math.round((skor.skor / skor.total) * 100) : null;
          return (
            <article key={row.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{row.nama}</p>
                  <p className="text-sm text-gray-500">
                    {posisi?.judul ?? "Lowongan"} · {posisi ? labelPaket[posisi.paket_uji] : ""}
                    {row.telepon ? ` · ${row.telepon}` : ""}
                    {row.sumber ? ` · ${row.sumber}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${warnaTahap[row.tahap]}`}>{labelTahap[row.tahap]}</span>
                  <button type="button" onClick={() => setBuka(buka === row.id ? null : row.id)} className="text-sm text-orange-700 hover:underline">
                    {buka === row.id ? "Tutup" : "Proses"}
                  </button>
                </div>
              </div>
              {skor && (
                <p className="text-sm mt-2 text-gray-600">
                  Skor tes {skor.skor}/{skor.total} ({persen}%)
                  {persen !== null && persen >= AMBANG_LULUS * 100 ? " · saran lulus" : " · di bawah saran 70%"}
                  {row.hasil_tes === "lulus" && " · dinilai lulus"}
                  {row.hasil_tes === "tidak_lulus" && " · dinilai tidak lulus"}
                </p>
              )}
              {buka === row.id && (
                <DetailPelamar
                  row={row}
                  posisi={posisi}
                  onTahap={(tahap) => simpanPelamar(row.id, { tahap })}
                  onNilai={(hasilTes) => simpanPelamar(row.id, { hasil_tes: hasilTes, tahap: hasilTes === "lulus" ? "wawancara" : row.tahap })}
                  onCatatan={(catatan, catatanWawancara) => simpanPelamar(row.id, { catatan, catatan_wawancara: catatanWawancara })}
                  onTautan={() => buatTautan(row)}
                  onGantiTautan={() => buatTautan(row, true)}
                  onTolak={() => simpanPelamar(row.id, { tahap: "ditolak" })}
                  onDiterima={(peringatan) =>
                    onSelesai().then(() => {
                      if (peringatan) onError(peringatan);
                      else onInfo(`${row.nama} dicatat sebagai karyawan.`);
                    })
                  }
                  onError={onError}
                />
              )}
            </article>
          );
        })}
        {tampil.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Belum ada pelamar</div>
        )}
      </div>
    </div>
  );
}

function Saring({ aktif, label, onClick }: { aktif: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${aktif ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-600"}`}
    >
      {label}
    </button>
  );
}

function DetailPelamar({
  row,
  posisi,
  onTahap,
  onNilai,
  onCatatan,
  onTautan,
  onGantiTautan,
  onTolak,
  onDiterima,
  onError,
}: {
  row: Pelamar;
  posisi: { judul: string; paket_uji: PaketUji } | null;
  onTahap: (tahap: TahapPelamar) => Promise<void>;
  onNilai: (hasil: "lulus" | "tidak_lulus") => Promise<void>;
  onCatatan: (catatan: string, wawancara: string) => Promise<void>;
  onTautan: () => Promise<void>;
  onGantiTautan: () => Promise<void>;
  onTolak: () => Promise<void>;
  onDiterima: (peringatan?: string) => void;
  onError: (t: string) => void;
}) {
  const [catatan, setCatatan] = useState(row.catatan ?? "");
  const [wawancara, setWawancara] = useState(row.catatan_wawancara ?? "");
  const [jabatan, setJabatan] = useState(posisi?.judul ?? "Kasir");
  const [tanggal, setTanggal] = useState(todayIso());
  const [buatAkun, setBuatAkun] = useState(true);
  const [peranAkun, setPeranAkun] = useState<Peran>(posisi?.paket_uji === "uji_kepala" ? "admin" : "kasir");
  const [usernameKerja, setUsernameKerja] = useState(slugAkun(row.nama));
  const [sandiKerja, setSandiKerja] = useState("");
  const [akunKerja, setAkunKerja] = useState<{ username: string; sandi: string } | null>(null);
  const [asal, setAsal] = useState("");

  useEffect(() => {
    setAsal(window.location.origin);
  }, []);

  async function terima() {
    if (row.karyawan_id) {
      await onTahap("diterima");
      return;
    }
    if (buatAkun && sandiKerja.length < 4) {
      onError("Kata sandi akun kerja minimal 4 karakter.");
      return;
    }
    const { data: kar, error } = await db()
      .from("karyawan")
      .insert({
        nama: row.nama,
        telepon: row.telepon,
        jabatan: jabatan.trim() || "Kasir",
        tanggal_masuk: tanggal || null,
        status: "aktif",
      })
      .select("id")
      .single();
    if (error || !kar) {
      onError(pesanError(error?.message ?? "Karyawan gagal disimpan"));
      return;
    }
    let peringatan = "";
    if (buatAkun) {
      const usernameFinal = await usernameBebas(slugAkun(usernameKerja || row.nama));
      const { data: akunBaru, error: errAkun } = await db()
        .from("pengguna")
        .insert({
          nama: row.nama,
          username: usernameFinal,
          peran: peranAkun,
          pin_hash: await hashPin(sandiKerja),
          aktif: true,
        })
        .select("id")
        .single();
      if (errAkun || !akunBaru) {
        peringatan = `Karyawan tersimpan, tetapi akun kerja gagal dibuat. ${pesanError(errAkun?.message ?? "Coba lagi dari menu Akses & Akun.")}`;
      } else {
        await db().from("karyawan").update({ pengguna_id: akunBaru.id }).eq("id", kar.id);
        setAkunKerja({ username: usernameFinal, sandi: sandiKerja });
      }
    }
    await db().from("pelamar").update({ tahap: "diterima", karyawan_id: kar.id }).eq("id", row.id);
    onDiterima(peringatan || undefined);
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-gray-500">
          Tahap
          <select value={row.tahap} onChange={(e) => onTahap(e.target.value as TahapPelamar)} className={`${input} mt-1`}>
            {TAHAP_PELAMAR.map((t) => (
              <option key={t} value={t}>{labelTahap[t]}</option>
            ))}
          </select>
        </label>
        {row.tahap !== "ditolak" && row.tahap !== "diterima" && (
          <button type="button" onClick={onTautan} className="mt-4 bg-orange-600 text-white rounded-lg px-3 py-2 text-sm">
            {row.token_tes ? "Salin tautan tes" : "Buat tautan tes"}
          </button>
        )}
        {row.token_tes && row.tahap !== "ditolak" && row.tahap !== "diterima" && (
          <button type="button" onClick={onGantiTautan} className="mt-4 border border-gray-300 rounded-lg px-3 py-2 text-sm">
            Ganti tautan
          </button>
        )}
        {row.tahap !== "ditolak" && row.tahap !== "diterima" && (
          <button type="button" onClick={onTolak} className="mt-4 text-sm text-red-600 hover:underline">
            Tolak
          </button>
        )}
      </div>

      {row.token_tes && (
        <p className="text-sm text-gray-600 break-all">
          Tautan tes {posisi ? labelPaket[posisi.paket_uji] : ""}:{" "}
          <span className="font-medium text-gray-900">{asal ? `${asal}/uji/${row.token_tes}` : ""}</span>
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onNilai("lulus")} className="border border-green-200 bg-green-50 text-green-800 rounded-lg px-3 py-1.5 text-sm">
          Lulus, lanjut wawancara
        </button>
        <button type="button" onClick={() => onNilai("tidak_lulus")} className="border border-red-200 bg-red-50 text-red-700 rounded-lg px-3 py-1.5 text-sm">
          Tidak lulus
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-xs text-gray-500">
          Catatan screening
          <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={3} className={`${input} mt-1`} />
        </label>
        <label className="text-xs text-gray-500">
          Catatan wawancara
          <textarea value={wawancara} onChange={(e) => setWawancara(e.target.value)} rows={3} className={`${input} mt-1`} />
        </label>
      </div>
      <button type="button" onClick={() => onCatatan(catatan, wawancara)} className="text-sm text-orange-700 hover:underline">
        Simpan catatan
      </button>

      {row.tahap !== "ditolak" && !row.karyawan_id && (
        <div className="rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-900">Jadikan karyawan</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input value={jabatan} onChange={(e) => setJabatan(e.target.value)} list="jabatan-rekrut" placeholder="Jabatan" className={input} />
            <datalist id="jabatan-rekrut">
              {JABATAN_TOKO.map((j) => (
                <option key={j} value={j} />
              ))}
            </datalist>
            <input value={tanggal} onChange={(e) => setTanggal(e.target.value)} type="date" className={input} />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={buatAkun} onChange={(e) => setBuatAkun(e.target.checked)} />
              Buat akun aplikasi
            </label>
          </div>
          {buatAkun && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={usernameKerja} onChange={(e) => setUsernameKerja(e.target.value)} placeholder="Nama akun" className={input} />
              <input value={sandiKerja} onChange={(e) => setSandiKerja(e.target.value)} type="password" placeholder="Kata sandi" autoComplete="new-password" className={input} />
              <select value={peranAkun} onChange={(e) => setPeranAkun(e.target.value as Peran)} className={input}>
                {peranOperasional.map((p) => (
                  <option key={p} value={p}>{labelPeran(p)}</option>
                ))}
              </select>
            </div>
          )}
          <button type="button" onClick={terima} className="bg-orange-600 text-white rounded-lg px-4 py-2 text-sm font-medium">
            Simpan karyawan
          </button>
          {akunKerja && (
            <p className="text-sm bg-amber-50 text-amber-900 rounded-lg px-3 py-2">
              Akun kerja {akunKerja.username}, kata sandi {akunKerja.sandi}. Salin sekarang.
            </p>
          )}
        </div>
      )}
      {row.karyawan_id && <p className="text-sm text-green-700">Sudah masuk data karyawan.</p>}
    </div>
  );
}

function HasilTes({ hasil }: { hasil: Hasil[] }) {
  if (hasil.length === 0) {
    return <p className="text-sm text-gray-500">Belum ada hasil tes.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Waktu</th>
            <th className="px-4 py-3 font-semibold">Nama</th>
            <th className="px-4 py-3 font-semibold">Paket</th>
            <th className="px-4 py-3 font-semibold">Skor</th>
          </tr>
        </thead>
        <tbody>
          {hasil.map((r) => {
            const persen = r.total ? Math.round((r.skor / r.total) * 100) : 0;
            const paketLabel = r.paket in labelPaket ? labelPaket[r.paket as PaketUji] : r.paket;
            return (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{new Date(r.created_at).toLocaleString("id-ID")}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{r.nama}</td>
                <td className="px-4 py-3 text-gray-600">{paketLabel}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-orange-700">{r.skor}/{r.total}</span>
                  <span className="text-gray-500 ml-2">({persen}%)</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BahanTes({ lowongan }: { lowongan: Lowongan[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Pelamar mengerjakan paket yang menempel pada lowongannya. Urutan soal dan pilihan diacak saat ujian, dan skor tidak ditampilkan ke peserta.
      </p>
      {(Object.keys(soalUjian) as PaketUji[]).map((paket) => {
        const dipakai = lowongan.filter((l) => l.paket_uji === paket);
        const soal = soalUjian[paket];
        return (
          <details key={paket} className="bg-white border border-gray-200 rounded-xl p-5">
            <summary className="cursor-pointer">
              <span className="font-semibold text-gray-900">{labelPaket[paket]}</span>
              <span className="text-sm text-gray-500"> · {soal.length} soal</span>
              <span className="block text-sm text-gray-500 mt-1">
                {dipakai.length > 0 ? `Dipakai lowongan: ${dipakai.map((l) => l.judul).join(", ")}` : "Belum dipakai lowongan"}
              </span>
            </summary>
            <ol className="mt-4 space-y-4">
              {soal.map((s, i) => (
                <li key={s.id} className="border-t border-gray-100 pt-3">
                  <p className="text-sm font-medium text-gray-900">{i + 1}. {s.pertanyaan}</p>
                  <ul className="mt-2 space-y-1">
                    {s.opsi.map((opsi, idx) => (
                      <li key={idx} className={`text-sm ${idx === s.benar ? "text-green-700 font-medium" : "text-gray-600"}`}>
                        {idx === s.benar ? "✓ " : ""}{opsi}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-400 mt-1">{s.pembahasan}</p>
                </li>
              ))}
            </ol>
          </details>
        );
      })}
    </div>
  );
}
