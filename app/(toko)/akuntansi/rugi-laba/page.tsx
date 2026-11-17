"use client";

import { useEffect, useState } from "react";
import { muatRugiLaba, type AngkaRugi } from "@/lib/akuntansi";
import { monthStartIso, todayIso } from "@/lib/format";
import { Baris, Catatan, Rentang, Status } from "../ui";

const kosong: AngkaRugi = {
  jualUmum: 0,
  jualBekon: 0,
  returUmum: 0,
  returBekon: 0,
  hppUmum: 0,
  hppBekon: 0,
};

export default function RugiLabaPage() {
  const [dari, setDari] = useState(monthStartIso());
  const [sampai, setSampai] = useState(todayIso());
  const [angka, setAngka] = useState<AngkaRugi>(kosong);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let batal = false;
    setMemuat(true);
    setError("");
    muatRugiLaba(dari, sampai)
      .then((hasil) => {
        if (!batal) setAngka(hasil);
      })
      .catch((err: unknown) => {
        if (!batal) {
          setAngka(kosong);
          setError(err instanceof Error ? err.message : "Gagal memuat rugi laba");
        }
      })
      .finally(() => {
        if (!batal) setMemuat(false);
      });
    return () => {
      batal = true;
    };
  }, [dari, sampai]);

  const jual = angka.jualUmum + angka.jualBekon;
  const returJual = angka.returUmum + angka.returBekon;
  const hpp = angka.hppUmum + angka.hppBekon;
  const bersih = jual - returJual;
  const labaKotor = bersih - hpp;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Rugi Laba</h1>
      <Rentang dari={dari} sampai={sampai} onDari={setDari} onSampai={setSampai} />
      <Status memuat={memuat} error={error} />
      {!memuat && !error && (
        <section className="max-w-xl rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-1 font-semibold text-gray-800">Laba kotor</h2>
          <p className="mb-3 text-xs text-gray-400">{dari} s/d {sampai}</p>
          <Baris label="Penjualan umum" nilai={angka.jualUmum} />
          <Baris label="Penjualan Bekon" nilai={angka.jualBekon} />
          <Baris label="Penjualan" nilai={jual} tebal garis />
          <Baris label="Retur penjualan umum" nilai={angka.returUmum} />
          <Baris label="Retur penjualan Bekon" nilai={angka.returBekon} />
          <Baris label="Retur penjualan" nilai={returJual} tebal garis />
          <Baris label="Penjualan bersih" nilai={bersih} tebal garis />
          <Baris label="Harga pokok umum" nilai={angka.hppUmum} />
          <Baris label="Harga pokok Bekon" nilai={angka.hppBekon} />
          <Baris label="Harga pokok penjualan" nilai={hpp} tebal garis />
          <Baris label="Laba kotor" nilai={labaKotor} tebal garis />
        </section>
      )}
      <Catatan>
        Angka mengikuti tanggal di atas. Penjualan dan retur dihitung dari nota. Harga pokok memakai harga beli pada baris nota. Beban usaha belum dicatat, jadi laporan berhenti di laba kotor.
      </Catatan>
    </div>
  );
}
