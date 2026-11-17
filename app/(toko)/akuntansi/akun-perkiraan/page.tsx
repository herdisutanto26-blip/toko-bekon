"use client";

import { Fragment, useEffect, useState } from "react";
import { db } from "@/lib/api";
import { pesanError } from "@/lib/format";
import {
  anakPerkiraan,
  keturunan,
  kodeBerikutnya,
  type AkunPerkiraan,
  type JenisPerkiraan,
} from "@/lib/perkiraan";

const kosong = { id: "", jenis: "akun" as JenisPerkiraan, indukId: "", nama: "", aktif: true };

export default function AkunPerkiraanPage() {
  const [daftar, setDaftar] = useState<AkunPerkiraan[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [form, setForm] = useState<typeof kosong | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  async function muat() {
    setMemuat(true);
    setError("");
    const { data, error: err } = await db()
      .from("akun_perkiraan")
      .select("id,kode,nama,jenis,induk_id,aktif")
      .order("kode");
    setMemuat(false);
    if (err) {
      setDaftar([]);
      setError(pesanError(err.message));
      return;
    }
    setDaftar((data ?? []) as AkunPerkiraan[]);
  }

  useEffect(() => {
    let batal = false;
    muat().catch((err: unknown) => {
      if (!batal) setError(err instanceof Error ? err.message : "Gagal memuat akun perkiraan");
    });
    return () => {
      batal = true;
    };
  }, []);

  const sunting = form?.id ? daftar.find((akun) => akun.id === form.id) : null;
  const kode = form
    ? sunting?.kode ?? kodeBerikutnya(daftar, form.jenis, form.indukId || null)
    : "";
  const dilarang = form?.id ? keturunan(daftar, form.id) : new Set<string>();
  const pilihanInduk = kelompokUntuk(daftar, dilarang);

  function bukaBaru(jenis: JenisPerkiraan, indukId = "") {
    setInfo("");
    setError("");
    setForm({ ...kosong, jenis, indukId });
  }

  function bukaUbah(akun: AkunPerkiraan) {
    setInfo("");
    setError("");
    setForm({
      id: akun.id,
      jenis: akun.jenis,
      indukId: akun.induk_id ?? "",
      nama: akun.nama,
      aktif: akun.aktif,
    });
  }

  async function simpan() {
    if (!form) return;
    const nama = form.nama.trim();
    if (!nama) {
      setError("Nama akun wajib diisi");
      return;
    }
    if (form.jenis === "akun" && !form.indukId) {
      setError("Pilih kelompok untuk akun detail");
      return;
    }
    if (form.indukId && dilarang.has(form.indukId)) {
      setError("Kelompok induk tidak boleh akun ini sendiri atau akun di bawahnya");
      return;
    }
    setMenyimpan(true);
    setError("");
    const payload = {
      nama,
      jenis: form.jenis,
      induk_id: form.indukId || null,
      aktif: form.aktif,
    };
    const hasil = form.id
      ? await db().from("akun_perkiraan").update(payload).eq("id", form.id)
      : await db().from("akun_perkiraan").insert({ ...payload, kode: kodeBerikutnya(daftar, form.jenis, form.indukId || null) });
    setMenyimpan(false);
    if (hasil.error) {
      setError(pesanError(hasil.error.message));
      return;
    }
    setForm(null);
    setInfo(form.id ? "Akun diperbarui" : "Akun ditambahkan");
    await muat();
  }

  async function hapus(akun: AkunPerkiraan) {
    if (daftar.some((item) => item.induk_id === akun.id)) {
      setError("Kelompok ini masih punya akun di bawahnya");
      return;
    }
    const { count, error: errCek } = await db()
      .from("jurnal_baris")
      .select("id", { count: "exact", head: true })
      .eq("kode", akun.kode);
    if (errCek) {
      setError(pesanError(errCek.message));
      return;
    }
    if ((count ?? 0) > 0) {
      setError("Akun ini sudah dipakai di jurnal, jadi tidak bisa dihapus. Nonaktifkan saja.");
      return;
    }
    if (!confirm(`Hapus ${akun.kode} ${akun.nama}?`)) return;
    const { error: err } = await db().from("akun_perkiraan").delete().eq("id", akun.id);
    if (err) {
      setError(pesanError(err.message));
      return;
    }
    if (form?.id === akun.id) setForm(null);
    setInfo("Akun dihapus");
    await muat();
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-800">Akun Perkiraan</h1>
      <p className="mb-6 max-w-3xl text-sm text-gray-600">
        Kelompok adalah judul. Detail adalah akun di bawah kelompok itu. Kode terisi otomatis dari kelompok yang dipilih, lalu tidak berubah supaya jurnal lama tetap cocok. Saldo tidak diisi di halaman ini.
      </p>
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {info && <p className="mb-4 text-sm text-green-700">{info}</p>}
      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => bukaBaru("kelompok")} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
          Tambah kelompok
        </button>
        <button type="button" onClick={() => bukaBaru("akun", pilihanInduk[0]?.id ?? "")} className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700">
          Tambah detail
        </button>
      </div>

      {form && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            simpan();
          }}
          className="mb-6 max-w-xl rounded-xl border border-gray-200 bg-white p-4"
        >
          <p className="mb-3 font-semibold text-gray-900">{form.id ? "Ubah akun" : "Akun baru"}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-gray-700">
              Jenis
              <select
                value={form.jenis}
                onChange={(e) => setForm({ ...form, jenis: e.target.value as JenisPerkiraan, indukId: e.target.value === "akun" ? form.indukId || pilihanInduk[0]?.id || "" : form.indukId })}
                disabled={Boolean(form.id && daftar.some((akun) => akun.induk_id === form.id))}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
              >
                <option value="kelompok">Kelompok</option>
                <option value="akun">Detail</option>
              </select>
            </label>
            <label className="text-sm text-gray-700">
              Di bawah kelompok
              <select
                value={form.indukId}
                onChange={(e) => setForm({ ...form, indukId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
              >
                {form.jenis === "kelompok" && <option value="">Kelompok utama</option>}
                {pilihanInduk.map((akun) => (
                  <option key={akun.id} value={akun.id}>{akun.label}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-700 sm:col-span-2">
              Nama
              <input
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-gray-700">
              Kode
              <input value={kode} readOnly className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700" />
            </label>
            {form.id && (
              <label className="flex items-end gap-2 pb-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} />
                Aktif
              </label>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {form.jenis === "kelompok"
              ? "Kelompok utama memakai nomor 1, 2, 3. Kelompok di bawahnya memakai nomor induk, misalnya 1-3."
              : "Detail memakai nomor induk ditambah urutan kelipatan 10, misalnya di bawah aset lancar menjadi 1-1320."}
          </p>
          <div className="mt-4 flex gap-2">
            <button disabled={menyimpan} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">
              {menyimpan ? "Menyimpan..." : "Simpan"}
            </button>
            <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-800">
              Batal
            </button>
          </div>
        </form>
      )}

      {memuat ? (
        <p className="text-sm text-gray-500">Memuat...</p>
      ) : (
        <div className="max-w-3xl overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[32rem] text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Jenis</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {daftar.length === 0 && !error && (
                <tr>
                  <td className="px-4 py-4 text-gray-500" colSpan={4}>Belum ada akun.</td>
                </tr>
              )}
              <BarisPohon
                daftar={daftar}
                indukId={null}
                kedalaman={0}
                onUbah={bukaUbah}
                onHapus={hapus}
                onTambah={(induk) => bukaBaru("akun", induk.id)}
              />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BarisPohon({
  daftar,
  indukId,
  kedalaman,
  onUbah,
  onHapus,
  onTambah,
}: {
  daftar: AkunPerkiraan[];
  indukId: string | null;
  kedalaman: number;
  onUbah: (akun: AkunPerkiraan) => void;
  onHapus: (akun: AkunPerkiraan) => void;
  onTambah: (induk: AkunPerkiraan) => void;
}) {
  return anakPerkiraan(daftar, indukId).map((akun) => (
    <Fragment key={akun.id}>
      <tr className={`border-t border-gray-100 ${akun.jenis === "kelompok" ? "bg-gray-50" : ""} ${akun.aktif ? "" : "text-gray-400"}`}>
            <td className="px-4 py-3 whitespace-nowrap" style={{ paddingLeft: `${1 + kedalaman * 1.25}rem` }}>{akun.kode}</td>
            <td className={`px-4 py-3 ${akun.jenis === "kelompok" ? "font-semibold text-gray-900" : "text-gray-800"}`}>{akun.nama}</td>
            <td className="px-4 py-3 text-gray-500">{akun.jenis === "kelompok" ? "Kelompok" : "Detail"}{akun.aktif ? "" : " · nonaktif"}</td>
            <td className="px-4 py-3 text-right whitespace-nowrap">
              {akun.jenis === "kelompok" && (
                <button type="button" onClick={() => onTambah(akun)} className="mr-3 text-orange-700 hover:underline">Tambah</button>
              )}
              <button type="button" onClick={() => onUbah(akun)} className="mr-3 text-gray-800 hover:underline">Ubah</button>
              <button type="button" onClick={() => onHapus(akun)} className="text-gray-500 hover:underline">Hapus</button>
            </td>
          </tr>
      <BarisPohon
        daftar={daftar}
        indukId={akun.id}
        kedalaman={kedalaman + 1}
        onUbah={onUbah}
        onHapus={onHapus}
        onTambah={onTambah}
      />
    </Fragment>
  ));
}

function kelompokUntuk(daftar: AkunPerkiraan[], dilarang: Set<string>) {
  const hasil: { id: string; label: string }[] = [];
  function jalan(indukId: string | null, kedalaman: number) {
    for (const akun of anakPerkiraan(daftar, indukId)) {
      if (akun.jenis !== "kelompok") continue;
      if (!dilarang.has(akun.id)) hasil.push({ id: akun.id, label: `${"· ".repeat(kedalaman)}${akun.kode} ${akun.nama}` });
      jalan(akun.id, kedalaman + 1);
    }
  }
  jalan(null, 0);
  return hasil;
}
