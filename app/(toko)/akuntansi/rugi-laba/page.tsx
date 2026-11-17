"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/api";
import { muatRugiLaba, type AngkaRugi } from "@/lib/akuntansi";
import { monthStartIso, pesanError, todayIso } from "@/lib/format";
import type { AkunPerkiraan } from "@/lib/perkiraan";
import { jumlahKelompok, Susunan } from "../susunan";
import { Baris, Catatan, Rentang, Status } from "../ui";

const kosong: AngkaRugi = {
  jualUmum: 0,
  jualBekon: 0,
  returUmum: 0,
  returBekon: 0,
  hppUmum: 0,
  hppBekon: 0,
};

const kodeRugi: Record<string, keyof AngkaRugi> = {
  "4-1000": "jualUmum",
  "4-1010": "jualBekon",
  "4-1020": "returUmum",
  "4-1030": "returBekon",
  "5-1000": "hppUmum",
  "5-1010": "hppBekon",
};

const kodePengurang = new Set(["4-1020", "4-1030"]);

export default function RugiLabaPage() {
  const [dari, setDari] = useState(monthStartIso());
  const [sampai, setSampai] = useState(todayIso());
  const [angka, setAngka] = useState<AngkaRugi>(kosong);
  const [perkiraan, setPerkiraan] = useState<AkunPerkiraan[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let batal = false;
    setMemuat(true);
    setError("");
    Promise.all([
      muatRugiLaba(dari, sampai),
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

  const nilai = (kode: string) => {
    const kolom = kodeRugi[kode];
    if (!kolom) return 0;
    const jumlah = angka[kolom];
    return kodePengurang.has(kode) ? -jumlah : jumlah;
  };
  const pendapatan = jumlahKelompok(perkiraan, "4", nilai);
  const beban = jumlahKelompok(perkiraan, "5", nilai);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Rugi Laba</h1>
      <Rentang dari={dari} sampai={sampai} onDari={setDari} onSampai={setSampai} />
      <Status memuat={memuat} error={error} />
      {!memuat && !error && (
        <section className="max-w-2xl rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-1 font-semibold text-gray-800">Laba kotor</h2>
          <p className="mb-3 text-xs text-gray-400">{dari} s/d {sampai}</p>
          <Susunan daftar={perkiraan} kodeAkar={["4", "5"]} nilai={nilai} />
          <Baris label="Laba kotor" nilai={pendapatan - beban} tebal garis />
        </section>
      )}
      <Catatan>
        Susunan dan kode mengikuti Akun Perkiraan. Penjualan dan retur dihitung dari nota pada tanggal di atas. Retur mengurangi pendapatan. Harga pokok memakai harga beli pada baris nota. Beban usaha selain harga pokok belum dicatat, jadi laporan berhenti di laba kotor.
      </Catatan>
    </div>
  );
}
