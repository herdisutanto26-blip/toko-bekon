"use client";

import { Fragment } from "react";
import { anakPerkiraan, type AkunPerkiraan } from "@/lib/perkiraan";
import { Baris } from "./ui";

export function jumlahKelompok(daftar: AkunPerkiraan[], kode: string, nilai: (kode: string) => number) {
  const akun = daftar.find((item) => item.kode === kode);
  if (!akun) return 0;
  return jumlahAkun(daftar, akun, nilai);
}

function jumlahAkun(daftar: AkunPerkiraan[], akun: AkunPerkiraan, nilai: (kode: string) => number): number {
  const anak = anakPerkiraan(daftar, akun.id);
  if (anak.length === 0) return nilai(akun.kode);
  return anak.reduce((total, item) => total + jumlahAkun(daftar, item, nilai), 0);
}

export function Susunan({
  daftar,
  kodeAkar,
  nilai,
}: {
  daftar: AkunPerkiraan[];
  kodeAkar: string[];
  nilai: (kode: string) => number;
}) {
  const akar = kodeAkar
    .map((kode) => daftar.find((akun) => akun.kode === kode && !akun.induk_id))
    .filter((akun): akun is AkunPerkiraan => Boolean(akun));
  return (
    <>
      {akar.map((akun) => (
        <Blok key={akun.id} daftar={daftar} akun={akun} kedalaman={0} nilai={nilai} />
      ))}
    </>
  );
}

function Blok({
  daftar,
  akun,
  kedalaman,
  nilai,
}: {
  daftar: AkunPerkiraan[];
  akun: AkunPerkiraan;
  kedalaman: number;
  nilai: (kode: string) => number;
}) {
  const anak = anakPerkiraan(daftar, akun.id);
  if (anak.length === 0) {
    return <Baris kode={akun.kode} label={akun.nama} nilai={nilai(akun.kode)} tebal={akun.jenis === "kelompok"} kedalaman={kedalaman} />;
  }
  return (
    <Fragment>
      <Baris kode={akun.kode} label={akun.nama} tebal tanpaNilai kedalaman={kedalaman} />
      {anak.map((item) => (
        <Blok key={item.id} daftar={daftar} akun={item} kedalaman={kedalaman + 1} nilai={nilai} />
      ))}
      <Baris label={`Jumlah ${akun.nama}`} nilai={jumlahAkun(daftar, akun, nilai)} tebal garis kedalaman={kedalaman} />
    </Fragment>
  );
}
