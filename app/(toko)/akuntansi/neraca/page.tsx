"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/api";
import { asetTetap, kasBank, kewajibanLain, kodePersediaan, muatNeraca, saldoKas, type AngkaNeraca } from "@/lib/akuntansi";
import { pesanError } from "@/lib/format";
import type { AkunPerkiraan } from "@/lib/perkiraan";
import { jumlahKelompok, Susunan } from "../susunan";
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
  const [perkiraan, setPerkiraan] = useState<AkunPerkiraan[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let batal = false;
    Promise.all([
      muatNeraca(),
      db().from("akun_perkiraan").select("id,kode,nama,jenis,induk_id,aktif").eq("aktif", true),
    ])
      .then(([hasil, akun]) => {
        if (batal) return;
        if (akun.error) throw new Error(pesanError(akun.error.message));
        setAngka(hasil);
        setPerkiraan((akun.data ?? []) as AkunPerkiraan[]);
      })
      .catch((err: unknown) => {
        if (!batal) {
          setAngka(kosong);
          setPerkiraan([]);
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

  const nilai = (kode: string) => nilaiNeraca(kode, angka);
  const kewajiban = jumlahKelompok(perkiraan, "2", nilai);
  const ekuitas = jumlahKelompok(perkiraan, "3", nilai);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Neraca</h1>
      <Status memuat={memuat} error={error} />
      {!memuat && !error && (
        <section className="max-w-2xl rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-1 font-semibold text-gray-800">Posisi hari ini</h2>
          <p className="mb-3 text-xs text-gray-400">Disusun mengikuti akun perkiraan</p>
          <Susunan daftar={perkiraan} kodeAkar={["1", "2", "3"]} nilai={nilai} />
          <Baris label="Jumlah kewajiban dan ekuitas" nilai={kewajiban + ekuitas} tebal garis />
        </section>
      )}
      <Catatan>
        Susunan dan kode mengikuti Akun Perkiraan. Piutang dan hutang dihitung dari sisa nota. Persediaan adalah stok kali harga beli. Kas memakai saldo sampai 7 November 2026, lalu ditambah jurnal pelunasan setelahnya. Ekuitas menyeimbangkan aset terhadap kewajiban.
      </Catatan>
    </div>
  );
}

function nilaiNeraca(kode: string, angka: AngkaNeraca) {
  const kas = kasBank.find((akun) => akun.kode === kode);
  if (kas) return saldoKas(kas.kode, kas.saldo, angka.kasMutasi);
  if (kode === "1-1300") return angka.piutangUmum;
  if (kode === "1-1310") return angka.piutangBekon;
  if (kode === kodePersediaan) return angka.stok;
  const tetap = asetTetap.find((akun) => akun.kode === kode);
  if (tetap) return tetap.saldo;
  if (kode === "2-2100") return angka.hutang;
  const lain = kewajibanLain.find((akun) => akun.kode === kode);
  if (lain) return lain.saldo;
  if (kode === "3") {
    const kas = kasBank.reduce((s, akun) => s + saldoKas(akun.kode, akun.saldo, angka.kasMutasi), 0);
    const tetap = asetTetap.reduce((s, akun) => s + akun.saldo, 0);
    const setoran = kewajibanLain.reduce((s, akun) => s + akun.saldo, 0);
    return kas + angka.piutangUmum + angka.piutangBekon + angka.stok + tetap - angka.hutang - setoran;
  }
  return 0;
}
