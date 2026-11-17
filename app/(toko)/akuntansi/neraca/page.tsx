"use client";

import { useEffect, useState } from "react";
import { asetTetap, kasBank, kewajibanLain, muatNeraca, saldoKas, type AngkaNeraca } from "@/lib/akuntansi";
import { Baris, Catatan, Status } from "../ui";

const kosong: AngkaNeraca = {
  piutangUmum: 0,
  piutangBekon: 0,
  hutang: 0,
  stok: 0,
  kasMutasi: {},
};

export default function NeracaPage() {
  const [angka, setAngka] = useState<AngkaNeraca>(kosong);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let batal = false;
    muatNeraca()
      .then((hasil) => {
        if (!batal) setAngka(hasil);
      })
      .catch((err: unknown) => {
        if (!batal) {
          setAngka(kosong);
          setError(err instanceof Error ? err.message : "Gagal memuat neraca");
        }
      })
      .finally(() => {
        if (!batal) setMemuat(false);
      });
    return () => {
      batal = true;
    };
  }, []);

  const piutang = angka.piutangUmum + angka.piutangBekon;
  const totalKas = kasBank.reduce((s, a) => s + saldoKas(a.kode, a.saldo, angka.kasMutasi), 0);
  const totalTetap = asetTetap.reduce((s, a) => s + a.saldo, 0);
  const totalKewajibanLain = kewajibanLain.reduce((s, a) => s + a.saldo, 0);
  const aset = totalKas + piutang + angka.stok + totalTetap;
  const ekuitas = aset - angka.hutang - totalKewajibanLain;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Neraca</h1>
      <Status memuat={memuat} error={error} />
      {!memuat && !error && (
        <section className="max-w-xl rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-1 font-semibold text-gray-800">Posisi hari ini</h2>
          <p className="mb-3 text-xs text-gray-400">Aset, kewajiban, dan ekuitas</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Aset</p>
          {kasBank.map((a) => (
            <Baris key={a.kode} label={a.nama} nilai={saldoKas(a.kode, a.saldo, angka.kasMutasi)} />
          ))}
          <Baris label="Jumlah kas dan bank" nilai={totalKas} tebal garis />
          <Baris label="Piutang umum" nilai={angka.piutangUmum} />
          <Baris label="Piutang Bekon" nilai={angka.piutangBekon} />
          <Baris label="Piutang usaha" nilai={piutang} tebal garis />
          <Baris label="Persediaan" nilai={angka.stok} />
          {asetTetap.map((a) => (
            <Baris key={a.kode} label={a.nama} nilai={a.saldo} />
          ))}
          <Baris label="Jumlah aset tetap" nilai={totalTetap} tebal garis />
          <Baris label="Jumlah aset" nilai={aset} tebal garis />
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Kewajiban</p>
          <Baris label="Hutang usaha" nilai={angka.hutang} />
          {kewajibanLain.map((a) => (
            <Baris key={a.kode} label={a.nama} nilai={a.saldo} />
          ))}
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Ekuitas</p>
          <Baris label="Ekuitas" nilai={ekuitas} />
          <Baris label="Jumlah kewajiban dan ekuitas" nilai={angka.hutang + totalKewajibanLain + ekuitas} tebal garis />
        </section>
      )}
      <Catatan>
        Piutang dan hutang dihitung dari sisa nota. Persediaan adalah stok kali harga beli. Kas kasir, Bank BCA, dan Bank BSI memakai saldo sampai 7 November 2026, lalu ditambah jurnal pelunasan yang dicatat setelahnya. Setoran dimuka adalah uang masuk Bank BCA yang lawannya akun pembayaran dimuka. Ekuitas menyeimbangkan sisa akun modal.
      </Catatan>
    </div>
  );
}
