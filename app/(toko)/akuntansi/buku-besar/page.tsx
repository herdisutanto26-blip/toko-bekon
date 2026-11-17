"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/api";
import {
  akunTagihan,
  asetTetap,
  jenisAkun,
  jumlahMutasi,
  kasBank,
  kodePersediaan,
  nilaiPersediaan,
  kewajibanLain,
  muatJurnal,
  mutasiAkun,
  namaAkun,
  type EntriJurnal,
  type SaldoAkun,
} from "@/lib/akuntansi";
import { formatRp, monthStartIso, todayIso } from "@/lib/format";
import { bandingKode, type AkunPerkiraan } from "@/lib/perkiraan";
import { Catatan, Rentang, Status, Uang } from "../ui";

export default function BukuBesarPage() {
  const [dari, setDari] = useState(monthStartIso());
  const [sampai, setSampai] = useState(todayIso());
  const [entri, setEntri] = useState<EntriJurnal[]>([]);
  const [kode, setKode] = useState(kasBank[0]?.kode ?? "1-1110");
  const [perkiraan, setPerkiraan] = useState<AkunPerkiraan[]>([]);
  const [persediaan, setPersediaan] = useState(0);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let batal = false;
    muatJurnal()
      .then((hasil) => {
        if (!batal) setEntri(hasil);
      })
      .catch((err: unknown) => {
        if (!batal) {
          setEntri([]);
          setError(err instanceof Error ? err.message : "Gagal memuat buku besar");
        }
      })
      .finally(() => {
        if (!batal) setMemuat(false);
      });
    nilaiPersediaan()
      .then((nilai) => {
        if (!batal) setPersediaan(nilai);
      })
      .catch(() => {
        if (!batal) setPersediaan(0);
      });
    db()
      .from("akun_perkiraan")
      .select("id,kode,nama,jenis,induk_id,aktif")
      .eq("aktif", true)
      .then(({ data, error: errAkun }) => {
        if (batal || errAkun) return;
        setPerkiraan((data ?? []) as AkunPerkiraan[]);
      });
    return () => {
      batal = true;
    };
  }, []);

  const tambahan = useMemo(() => {
    const dikenal = new Set([
      ...kasBank.map((a) => a.kode),
      ...akunTagihan.map((a) => a.kode),
      ...asetTetap.map((a) => a.kode),
      ...kewajibanLain.map((a) => a.kode),
    ]);
    const lain = new Map<string, string>();
    for (const item of entri) {
      for (const baris of item.baris) {
        if (!dikenal.has(baris.kode) && !lain.has(baris.kode)) lain.set(baris.kode, baris.nama);
      }
    }
    return [...lain.entries()].map(([kodeAkun, nama]) => ({ kode: kodeAkun, nama, saldo: 0 }));
  }, [entri]);

  const kelompok = useMemo(() => kelompokPerkiraan(perkiraan), [perkiraan]);
  const kodeDiPerkiraan = new Set(perkiraan.filter((akun) => akun.jenis === "akun").map((akun) => akun.kode));
  const akunJurnal = tambahan.filter((akun) => !kodeDiPerkiraan.has(akun.kode));
  const akun = cariAkun(kode, tambahan);
  const nama = perkiraan.find((item) => item.kode === kode)?.nama ?? akun?.nama ?? namaAkun(kode);
  const jenis = jenisAkun(kode);
  const saldoTercatat = kode === kodePersediaan
    ? persediaan
    : jenis === "kas" || jenis === "tetap" || jenis === "kewajiban" ? akun?.saldo ?? 0 : 0;
  const sebelum = mutasiAkun(entri, kode, undefined, hariSebelum(dari));
  const mutasi = mutasiAkun(entri, kode, dari, sampai);
  const saldoAwal = saldoTercatat + jumlahMutasi(sebelum);
  let berjalan = saldoAwal;
  const baris = mutasi.map((item) => {
    berjalan += item.debit - item.kredit;
    return { ...item, saldo: berjalan };
  });
  const debit = mutasi.reduce((s, b) => s + b.debit, 0);
  const kredit = mutasi.reduce((s, b) => s + b.kredit, 0);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-800">Buku Besar</h1>
      <p className="mb-6 max-w-3xl text-sm text-gray-500">
        Mutasi per akun detail di Akun Perkiraan. Kas dimulai dari saldo 7 November 2026. Piutang dan hutang di sini hanya pelunasan yang sudah dijurnal.
      </p>
      <div className="mb-4">
        <label className="text-sm text-gray-600">
          Akun
          <select
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            className="mt-1 block w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2"
          >
            {kelompok.length > 0 ? (
              kelompok.map((grup) => (
                <optgroup key={grup.id} label={grup.kode ? `${grup.kode} ${grup.nama}` : grup.nama}>
                  {grup.akun.map((a) => (
                    <option key={a.kode} value={a.kode}>{a.kode} · {a.nama}</option>
                  ))}
                </optgroup>
              ))
            ) : (
              <>
                <optgroup label="Kas dan bank">
                  {kasBank.map((a) => (
                    <option key={a.kode} value={a.kode}>{a.kode} · {a.nama}</option>
                  ))}
                </optgroup>
                <optgroup label="Tagihan">
                  {akunTagihan.map((a) => (
                    <option key={a.kode} value={a.kode}>{a.kode} · {a.nama}</option>
                  ))}
                </optgroup>
                <optgroup label="Aset tetap">
                  {asetTetap.map((a) => (
                    <option key={a.kode} value={a.kode}>{a.kode} · {a.nama}</option>
                  ))}
                </optgroup>
                <optgroup label="Kewajiban lain">
                  {kewajibanLain.map((a) => (
                    <option key={a.kode} value={a.kode}>{a.kode} · {a.nama}</option>
                  ))}
                </optgroup>
              </>
            )}
            {akunJurnal.length > 0 && (
              <optgroup label="Akun lain di jurnal">
                {akunJurnal.map((a) => (
                  <option key={a.kode} value={a.kode}>{a.kode} · {a.nama}</option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
      </div>
      <Rentang dari={dari} sampai={sampai} onDari={setDari} onSampai={setSampai} />
      <Status memuat={memuat} error={error} />
      {!memuat && !error && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Jurnal</th>
                <th className="px-4 py-3">Keterangan</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Kredit</th>
                <th className="px-4 py-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100">
                <td className="px-4 py-3" colSpan={5}>Saldo awal {nama}</td>
                <td className="px-4 py-3 text-right font-medium"><Uang nilai={saldoAwal} /></td>
              </tr>
              {baris.length === 0 && (
                <tr className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-500" colSpan={6}>Tidak ada mutasi pada rentang ini.</td>
                </tr>
              )}
              {baris.map((item) => (
                <tr key={`${item.nomor}-${item.debit}-${item.kredit}`} className="border-t border-gray-100">
                  <td className="px-4 py-3 whitespace-nowrap">{item.tanggal}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{item.nomor}</td>
                  <td className="px-4 py-3">{item.keterangan || "-"}</td>
                  <td className="px-4 py-3 text-right"><Uang nilai={item.debit} /></td>
                  <td className="px-4 py-3 text-right"><Uang nilai={item.kredit} /></td>
                  <td className="px-4 py-3 text-right"><Uang nilai={item.saldo} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 font-semibold text-gray-900">
                <td className="px-4 py-3" colSpan={3}>Mutasi {dari} s/d {sampai}</td>
                <td className="px-4 py-3 text-right">{formatRp(debit)}</td>
                <td className="px-4 py-3 text-right">{formatRp(kredit)}</td>
                <td className="px-4 py-3 text-right">{formatRp(saldoAwal + debit - kredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <Catatan>
        {jenis === "kas" && "Saldo awal kas memakai posisi 7 November 2026, ditambah jurnal sebelum tanggal Dari. Saldo akhir kas yang rentangnya sampai hari ini sama dengan Neraca."}
        {jenis === "tagihan" && "Buku piutang dan hutang ini hanya berisi pelunasan yang sudah dijurnal. Saldo tagihan yang dipakai di Neraca dihitung dari sisa nota, karena penjualan dan pembelian belum masuk jurnal."}
        {jenis === "tetap" && "Aset tetap dicatat sebagai saldo, tanpa jurnal perolehan. Nilainya sama dengan baris di Neraca."}
        {jenis === "kewajiban" && "Setoran dimuka dicatat sebagai saldo. Uang masuknya sudah berada di saldo Bank BCA, dan lawannya ada di Neraca."}
        {kode === kodePersediaan && "Persediaan memakai stok kali harga beli, sama dengan baris Persediaan di Neraca."}
        {jenis === "lain" && kode !== kodePersediaan && "Akun ini muncul dari baris jurnal. Tidak ada saldo awal di luar jurnal."}
      </Catatan>
    </div>
  );
}

function kelompokPerkiraan(daftar: AkunPerkiraan[]) {
  const detail = daftar.filter((akun) => akun.jenis === "akun");
  const kelompok = daftar
    .filter((akun) => akun.jenis === "kelompok" && detail.some((anak) => anak.induk_id === akun.id))
    .sort((a, b) => bandingKode(a.kode, b.kode));
  const grup = kelompok.map((induk) => ({
    id: induk.id,
    kode: induk.kode,
    nama: induk.nama,
    akun: detail.filter((akun) => akun.induk_id === induk.id).sort((a, b) => bandingKode(a.kode, b.kode)),
  }));
  const lepas = detail.filter((akun) => !grup.some((induk) => induk.akun.some((anak) => anak.kode === akun.kode)));
  if (lepas.length > 0) {
    grup.push({
      id: "lepas",
      kode: "",
      nama: "Akun lain",
      akun: [...lepas].sort((a, b) => bandingKode(a.kode, b.kode)),
    });
  }
  return grup;
}

function cariAkun(kode: string, tambahan: SaldoAkun[]) {
  return (
    kasBank.find((a) => a.kode === kode) ??
    akunTagihan.find((a) => a.kode === kode) ??
    asetTetap.find((a) => a.kode === kode) ??
    kewajibanLain.find((a) => a.kode === kode) ??
    tambahan.find((a) => a.kode === kode)
  );
}

function hariSebelum(iso: string) {
  const tanggal = new Date(`${iso}T00:00:00`);
  tanggal.setDate(tanggal.getDate() - 1);
  const bulan = String(tanggal.getMonth() + 1).padStart(2, "0");
  const hari = String(tanggal.getDate()).padStart(2, "0");
  return `${tanggal.getFullYear()}-${bulan}-${hari}`;
}
