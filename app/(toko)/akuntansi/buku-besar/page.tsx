"use client";

import { useEffect, useMemo, useState } from "react";
import {
  akunTagihan,
  asetTetap,
  jenisAkun,
  jumlahMutasi,
  kasBank,
  kewajibanLain,
  muatJurnal,
  mutasiAkun,
  namaAkun,
  type EntriJurnal,
  type SaldoAkun,
} from "@/lib/akuntansi";
import { formatRp, monthStartIso, todayIso } from "@/lib/format";
import { Catatan, Rentang, Status, Uang } from "../ui";

export default function BukuBesarPage() {
  const [dari, setDari] = useState(monthStartIso());
  const [sampai, setSampai] = useState(todayIso());
  const [entri, setEntri] = useState<EntriJurnal[]>([]);
  const [kode, setKode] = useState(kasBank[0]?.kode ?? "1-1110");
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

  const akun = cariAkun(kode, tambahan);
  const jenis = jenisAkun(kode);
  const saldoTercatat = jenis === "kas" || jenis === "tetap" || jenis === "kewajiban" ? akun?.saldo ?? 0 : 0;
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
        Mutasi per akun. Kas dimulai dari saldo 7 November 2026. Piutang dan hutang di sini hanya pelunasan yang sudah dijurnal.
      </p>
      <div className="mb-4">
        <label className="text-sm text-gray-600">
          Akun
          <select
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            className="mt-1 block w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2"
          >
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
            {tambahan.length > 0 && (
              <optgroup label="Akun lain di jurnal">
                {tambahan.map((a) => (
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
                <td className="px-4 py-3" colSpan={5}>Saldo awal {namaAkun(kode)}</td>
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
        {jenis === "lain" && "Akun ini muncul dari baris jurnal. Tidak ada saldo awal di luar jurnal."}
      </Catatan>
    </div>
  );
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
