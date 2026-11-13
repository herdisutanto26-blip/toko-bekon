"use client";

import { useEffect, useState } from "react";
import { db, hashPin } from "@/lib/api";
import { useAuth, type Peran } from "@/lib/auth";
import { pesanError } from "@/lib/format";
import { aksesBawaan, labelPeran, menuToko, menuUntukPeran, peranOperasional } from "@/lib/menu";
import { slugAkun } from "@/lib/sdm";

type Akun = {
  id: string;
  nama: string;
  username: string;
  peran: Peran;
  aktif: boolean;
  menu_izin: string[] | null;
};

const input = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm";
const semuaPeran: Peran[] = [...peranOperasional, "uji_karyawan", "uji_kepala"];

export default function AksesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Akun[]>([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [nama, setNama] = useState("");
  const [username, setUsername] = useState("");
  const [sandi, setSandi] = useState("");
  const [peran, setPeran] = useState<Peran>("kasir");
  const [edit, setEdit] = useState<string | null>(null);
  const [draft, setDraft] = useState<Akun | null>(null);
  const [sandiBaru, setSandiBaru] = useState("");
  const [sesuaikan, setSesuaikan] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);

  function muat() {
    setLoading(true);
    db()
      .from("pengguna")
      .select("id,nama,username,peran,aktif,menu_izin")
      .order("nama")
      .then(({ data, error: err }) => {
        setLoading(false);
        if (err) {
          setError(pesanError(err.message));
          return;
        }
        setRows((data ?? []) as Akun[]);
      });
  }

  useEffect(() => {
    muat();
  }, []);

  function flash(text: string) {
    setInfo(text);
    setError("");
    setTimeout(() => setInfo(""), 4000);
  }

  async function tambah(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim() || !sandi) return;
    if (sandi.length < 4) {
      setError("Kata sandi minimal 4 karakter.");
      return;
    }
    setMenyimpan(true);
    const akun = slugAkun(username || nama);
    const { error: err } = await db().from("pengguna").insert({
      nama: nama.trim(),
      username: akun,
      peran,
      pin_hash: await hashPin(sandi),
      aktif: true,
      menu_izin: null,
    });
    setMenyimpan(false);
    if (err) {
      setError(pesanError(err.message.includes("duplicate") || err.message.includes("23505") ? "Nama atau nama akun sudah dipakai." : err.message));
      return;
    }
    setNama("");
    setUsername("");
    setSandi("");
    setPeran("kasir");
    flash(`Akun ${akun} ditambahkan.`);
    muat();
  }

  function bukaEdit(row: Akun) {
    setEdit(row.id);
    setDraft({ ...row, menu_izin: row.menu_izin ? [...row.menu_izin] : null });
    setSandiBaru("");
    setSesuaikan(Boolean(row.menu_izin));
    setError("");
  }

  function toggleMenu(href: string) {
    if (!draft) return;
    const sekarang = new Set(draft.menu_izin ?? menuUntukPeran(draft.peran));
    if (sekarang.has(href)) sekarang.delete(href);
    else sekarang.add(href);
    setDraft({ ...draft, menu_izin: [...sekarang] });
  }

  async function simpanEdit() {
    if (!draft) return;
    if (user?.id === draft.id && draft.peran !== "admin") {
      setError("Akun yang sedang dipakai harus tetap Admin.");
      return;
    }
    if (sandiBaru && sandiBaru.length < 4) {
      setError("Kata sandi baru minimal 4 karakter.");
      return;
    }
    if (sesuaikan && (draft.menu_izin ?? []).length === 0) {
      setError("Pilih minimal satu menu, atau matikan sesuaikan menu.");
      return;
    }
    setMenyimpan(true);
    const payload: Record<string, unknown> = {
      nama: draft.nama.trim(),
      username: slugAkun(draft.username),
      peran: draft.peran,
      aktif: draft.aktif,
      menu_izin: draft.peran === "uji_karyawan" || draft.peran === "uji_kepala" ? null : sesuaikan ? draft.menu_izin ?? [] : null,
    };
    if (sandiBaru) payload.pin_hash = await hashPin(sandiBaru);
    const { error: err } = await db().from("pengguna").update(payload).eq("id", draft.id);
    setMenyimpan(false);
    if (err) {
      setError(pesanError(err.message.includes("duplicate") || err.message.includes("23505") ? "Nama atau nama akun sudah dipakai." : err.message));
      return;
    }
    setEdit(null);
    setDraft(null);
    flash("Akun diperbarui. Kata sandi baru berlaku pada masuk berikutnya.");
    muat();
  }

  async function gantiAktif(row: Akun) {
    if (user?.id === row.id) {
      setError("Akun yang sedang dipakai tidak bisa dinonaktifkan.");
      return;
    }
    const { error: err } = await db().from("pengguna").update({ aktif: !row.aktif }).eq("id", row.id);
    if (err) {
      setError(pesanError(err.message));
      return;
    }
    flash(row.aktif ? `${row.nama} dinonaktifkan.` : `${row.nama} diaktifkan.`);
    muat();
  }

  const menuCek = draft ? (sesuaikan ? draft.menu_izin ?? [] : menuUntukPeran(draft.peran)) : [];

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Akses & akun</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola nama akun, kata sandi, peran, dan menu yang boleh dibuka. Pelamar tes tidak memakai akun di sini; tautannya ada di menu Rekrutmen.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {info && <p className="text-sm text-green-700">{info}</p>}

      <form onSubmit={tambah} className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama tampilan" className={input} />
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nama akun" autoComplete="off" className={input} />
        <input value={sandi} onChange={(e) => setSandi(e.target.value)} placeholder="Kata sandi" type="password" autoComplete="new-password" className={input} />
        <select value={peran} onChange={(e) => setPeran(e.target.value as Peran)} className={input}>
          {semuaPeran.map((p) => (
            <option key={p} value={p}>{labelPeran(p)}</option>
          ))}
        </select>
        <button disabled={menyimpan} className="bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
          Tambah akun
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500">Memuat...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Akun</th>
                <th className="px-4 py-3">Peran</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {row.nama}
                    {user?.id === row.id && <span className="ml-2 text-xs text-orange-600">Anda</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.username}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {labelPeran(row.peran)}
                    {row.menu_izin && <span className="block text-xs text-orange-600">Menu khusus</span>}
                  </td>
                  <td className="px-4 py-3">{row.aktif ? "Aktif" : "Nonaktif"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button type="button" onClick={() => (edit === row.id ? setEdit(null) : bukaEdit(row))} className="text-orange-700 hover:underline mr-3">
                      {edit === row.id ? "Tutup" : "Ubah"}
                    </button>
                    <button type="button" onClick={() => gantiAktif(row)} className="text-gray-500 hover:underline">
                      {row.aktif ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {draft && edit && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Ubah {draft.nama}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs text-gray-500">
              Nama tampilan
              <input value={draft.nama} onChange={(e) => setDraft({ ...draft, nama: e.target.value })} className={`${input} mt-1`} />
            </label>
            <label className="text-xs text-gray-500">
              Nama akun
              <input value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} className={`${input} mt-1`} />
            </label>
            <label className="text-xs text-gray-500">
              Kata sandi baru
              <input value={sandiBaru} onChange={(e) => setSandiBaru(e.target.value)} type="password" autoComplete="new-password" placeholder="Kosongkan jika tidak diganti" className={`${input} mt-1`} />
            </label>
            <label className="text-xs text-gray-500">
              Peran
              <select
                value={draft.peran}
                onChange={(e) => {
                  setSesuaikan(false);
                  setDraft({ ...draft, peran: e.target.value as Peran, menu_izin: null });
                }}
                className={`${input} mt-1`}
              >
                {semuaPeran.map((p) => (
                  <option key={p} value={p}>{labelPeran(p)}</option>
                ))}
              </select>
            </label>
          </div>

          {draft.peran === "uji_karyawan" || draft.peran === "uji_kepala" ? (
            <p className="text-sm text-gray-500">Akun ujian hanya membuka halaman tes, sesuai lowongan rekrutmen.</p>
          ) : (
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={sesuaikan}
                  onChange={(e) => {
                    const nyala = e.target.checked;
                    setSesuaikan(nyala);
                    setDraft({ ...draft, menu_izin: nyala ? menuUntukPeran(draft.peran) : null });
                  }}
                />
                Sesuaikan menu (matikan untuk mengikuti akses bawaan peran)
              </label>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {menuToko.map((grup) => (
                  <div key={grup.group}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{grup.group}</p>
                    {grup.items.map((item) => (
                      <label key={item.href} className="flex items-center gap-2 text-sm text-gray-700 py-0.5">
                        <input
                          type="checkbox"
                          disabled={!sesuaikan}
                          checked={menuCek.includes(item.href)}
                          onChange={() => toggleMenu(item.href)}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button type="button" onClick={simpanEdit} disabled={menyimpan} className="bg-orange-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
            Simpan perubahan
          </button>
        </div>
      )}

      <details className="bg-white border border-gray-200 rounded-xl p-5">
        <summary className="cursor-pointer text-sm font-medium text-gray-800">Akses bawaan tiap peran</summary>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="py-2 pr-3">Menu</th>
                {peranOperasional.map((p) => (
                  <th key={p} className="py-2 px-2">{labelPeran(p)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {menuToko.flatMap((g) => g.items).map((item) => (
                <tr key={item.href} className="border-t border-gray-100">
                  <td className="py-2 pr-3 text-gray-700">{item.label}</td>
                  {peranOperasional.map((p) => (
                    <td key={p} className="py-2 px-2 text-center">{aksesBawaan[item.href]?.includes(p) ? "✓" : ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
