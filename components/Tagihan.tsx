"use client";

import { useEffect, useState } from "react";
import { PilihBuku, type Buku } from "@/components/PilihBuku";
import { db, rpc, semua } from "@/lib/api";
import InputUang from "@/components/InputUang";
import { formatRp, labelProyek, sisaTagihan, todayIso } from "@/lib/format";
import { useAuth } from "@/lib/auth";

type Row = {
  id: string;
  pihakId: string | null;
  nomor: string;
  tanggal: string;
  jatuhTempo: string | null;
  pihak: string;
  grand: number;
  dibayar: number;
  retur: number;
  bekon: boolean;
  kodeProyek: string | null;
  namaProyek: string | null;
  namaPemilik: string | null;
};

const AKUN_KAS = [
  { kode: "1-1110", nama: "Kas kasir" },
  { kode: "1-1120", nama: "Bank BCA" },
  { kode: "1-1130", nama: "Bank BSI" },
  { kode: "1-1163", nama: "Kasbon Hilman" },
  { kode: "1-1171", nama: "Shopee beli" },
  { kode: "1-1172", nama: "Shopee jual" },
];

export default function Tagihan({ mode }: { mode: "piutang" | "hutang" }) {
  const piutang = mode === "piutang";
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [buku, setBuku] = useState<Buku>("umum");
  const [cari, setCari] = useState("");
  const [jumlah, setJumlah] = useState<Record<string, string>>({});
  const [pilih, setPilih] = useState<Record<string, boolean>>({});
  const [tanggalBayar, setTanggalBayar] = useState(todayIso());
  const [akunKas, setAkunKas] = useState("");
  const [popupBayar, setPopupBayar] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const bolehBayar = user?.peran === "admin" || user?.peran === "akunting";

  function muat() {
    const table = piutang ? "penjualan" : "pembelian";
    const nomor = piutang ? "nomor_nota" : "nomor_po";
    const pihak = piutang ? "pelanggan(nama)" : "supplier(nama)";
    const pihakId = piutang ? "pelanggan_id" : "supplier_id";
    const retur = piutang ? "retur_penjualan(total)" : "retur_pembelian(total)";
    const uang = piutang ? "grand_total" : "total";
    setMemuat(true);
    semua<Record<string, unknown>>((dari, sampai) =>
      db()
        .from(table)
        .select(`id,${nomor},tanggal,jatuh_tempo,${pihakId},${uang},dibayar,${pihak},${retur}${piutang ? ",bekon_po_id,kode_proyek,nama_proyek,nama_pemilik" : ""}`)
        .neq("status_bayar", "lunas")
        .order("tanggal", { ascending: false })
        .range(dari, sampai)
    )
      .then((data) => {
        const list = data.map((r) => {
          const returRows = (r[piutang ? "retur_penjualan" : "retur_pembelian"] as { total: number }[] | null) ?? [];
          const pihakRow = (r[piutang ? "pelanggan" : "supplier"] as { nama: string } | null);
          return {
            id: r.id as string,
            pihakId: (r[pihakId] as string | null) ?? null,
            nomor: r[nomor] as string,
            tanggal: r.tanggal as string,
            jatuhTempo: (r.jatuh_tempo as string | null) ?? null,
            pihak: pihakRow?.nama ?? (piutang ? "Umum" : "-"),
            grand: Number(r[uang]),
            dibayar: Number(r.dibayar),
            retur: returRows.reduce((s, x) => s + Number(x.total), 0),
            bekon: Boolean(r.bekon_po_id),
            kodeProyek: (r.kode_proyek as string | null) ?? null,
            namaProyek: (r.nama_proyek as string | null) ?? null,
            namaPemilik: (r.nama_pemilik as string | null) ?? null,
          };
        }).filter((r) => sisaTagihan(r.grand, r.dibayar, r.retur) > 0);
        setRows(list);
        setPilih({});
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat tagihan"))
      .finally(() => setMemuat(false));
  }

  useEffect(() => { muat(); }, [piutang]);

  async function simpanTempo(row: Row, nilai: string) {
    setError("");
    const sebelumnya = row.jatuhTempo;
    setRows((list) => list.map((r) => (r.id === row.id ? { ...r, jatuhTempo: nilai || null } : r)));
    try {
      await rpc("atur_jatuh_tempo", {
        jenis: piutang ? "piutang" : "hutang",
        id: row.id,
        jatuh_tempo: nilai,
      });
    } catch (err) {
      setRows((list) => list.map((r) => (r.id === row.id ? { ...r, jatuhTempo: sebelumnya } : r)));
      setError(err instanceof Error ? err.message : "Gagal menyimpan jatuh tempo");
    }
  }

  const dasar = piutang ? rows.filter((r) => (buku === "bekon" ? r.bekon : !r.bekon)) : rows;
  const kata = cari.trim().toLowerCase();
  const tampilan = dasar
    .filter((r) => {
      if (!kata) return true;
      const proyek = `${r.kodeProyek ?? ""} ${r.namaPemilik ?? ""}`.toLowerCase();
      return r.pihak.toLowerCase().includes(kata) || r.nomor.toLowerCase().includes(kata) || proyek.includes(kata);
    })
    .slice()
    .sort((a, b) => (buku === "bekon" ? (a.kodeProyek ?? "").localeCompare(b.kodeProyek ?? "") || b.tanggal.localeCompare(a.tanggal) : 0));
  const totalSisa = tampilan.reduce((s, r) => s + sisaTagihan(r.grand, r.dibayar, r.retur), 0);
  const terpilih = tampilan.filter((r) => pilih[r.id]);
  const pihakSama = terpilih.every((r) => r.pihakId === terpilih[0]?.pihakId);
  const sisaTerpilih = terpilih.reduce((s, r) => s + sisaTagihan(r.grand, r.dibayar, r.retur), 0);
  const totalBayar = terpilih.reduce((s, r) => s + Number(jumlah[r.id] || 0), 0);
  const namaKas = AKUN_KAS.find((akun) => akun.kode === akunKas)?.nama ?? "";

  function centangSemua(nyala: boolean) {
    setPilih((q) => {
      const next = { ...q };
      for (const r of tampilan) next[r.id] = nyala;
      return next;
    });
  }

  function bukaPopupBayar() {
    setError("");
    setInfo("");
    if (terpilih.length === 0) return;
    if (!pihakSama) {
      setError(piutang ? "Pilih nota dari pelanggan yang sama." : "Pilih nota dari supplier yang sama.");
      return;
    }
    setJumlah((q) => {
      const next = { ...q };
      for (const r of terpilih) {
        if (!next[r.id]?.trim()) next[r.id] = String(sisaTagihan(r.grand, r.dibayar, r.retur));
      }
      return next;
    });
    setAkunKas("");
    setPopupBayar(true);
  }

  async function bayarDari() {
    if (!akunKas) {
      setError("Pilih sumber kas.");
      return;
    }
    const baris = terpilih.map((r) => {
      const sisa = sisaTagihan(r.grand, r.dibayar, r.retur);
      return { id: r.id, jumlah: Number(jumlah[r.id] || 0), sisa };
    });
    if (baris.some((b) => !(b.jumlah > 0) || b.jumlah > b.sisa + 0.001)) {
      setError("Jumlah bayar harus lebih dari nol dan tidak melebihi sisa.");
      return;
    }
    setMenyimpan(true);
    setError("");
    try {
      const nomor = await rpc("catat_pelunasan_banyak", {
        jenis: piutang ? "piutang" : "hutang",
        tanggal: tanggalBayar,
        akun_kas: akunKas,
        dicatat_oleh: user?.nama ?? "",
        baris: baris.map((b) => ({ id: b.id, jumlah: b.jumlah })),
      });
      setPopupBayar(false);
      setInfo(`Jurnal ${nomor} tercatat.`);
      setJumlah({});
      muat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mencatat pelunasan");
    } finally {
      setMenyimpan(false);
    }
  }

  const labelPihak = piutang ? (buku === "bekon" ? "Proyek" : "Pelanggan") : "Supplier";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">{piutang ? "Piutang" : "Hutang"}</h1>
      {piutang && (
        <PilihBuku nilai={buku} onPilih={(nilai) => { setBuku(nilai); setCari(""); setPilih({}); }} />
      )}
      <input
        type="text"
        value={cari}
        onChange={(e) => { setCari(e.target.value); setPilih({}); }}
        placeholder={piutang ? "Cari pelanggan, proyek, atau nota..." : "Cari supplier atau nota..."}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full max-w-md mb-4"
      />
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {info && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{info}</p>}
      {memuat ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Memuat data...</div>
      ) : tampilan.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          {kata
            ? "Tidak ada nota dengan kata itu."
            : piutang
              ? (buku === "bekon" ? "Belum ada piutang Bekon" : "Belum ada piutang pelanggan umum")
              : "Belum ada hutang"}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <p className="border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-800">
            Sisa {piutang ? (buku === "bekon" ? "piutang Bekon" : "piutang umum") : "hutang"} {formatRp(totalSisa)}
          </p>
          {bolehBayar && terpilih.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-3">
              <p className="text-sm text-gray-800">
                {terpilih.length} nota · sisa {formatRp(sisaTerpilih)}
                {!pihakSama && (
                  <span className="block text-red-600">
                    {piutang ? "Pilih nota dari pelanggan yang sama." : "Pilih nota dari supplier yang sama."}
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={bukaPopupBayar}
                disabled={user?.latihan || !pihakSama}
                className="bg-[#b25d1a] text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
              >
                Bayar
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {bolehBayar && (
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={tampilan.length > 0 && tampilan.every((r) => pilih[r.id])}
                        onChange={(e) => centangSemua(e.target.checked)}
                        aria-label="Pilih semua nota"
                      />
                    </th>
                  )}
                  {["Nota", "Tanggal", "Jatuh tempo", labelPihak, "Sisa"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tampilan.map((r) => {
                  const sisa = sisaTagihan(r.grand, r.dibayar, r.retur);
                  const proyek = labelProyek(r.kodeProyek, r.namaPemilik);
                  const lewat = Boolean(r.jatuhTempo && r.jatuhTempo < todayIso());
                  return (
                    <tr key={r.id}>
                      {bolehBayar && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={Boolean(pilih[r.id])}
                            onChange={(e) => setPilih((q) => ({ ...q, [r.id]: e.target.checked }))}
                            aria-label={`Pilih ${r.nomor}`}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap">{r.nomor}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{r.tanggal}</td>
                      <td className="px-4 py-3">
                        {bolehBayar ? (
                          <input
                            type="date"
                            value={r.jatuhTempo ?? ""}
                            onChange={(e) => simpanTempo(r, e.target.value)}
                            className={`border border-gray-300 rounded-lg px-2 py-1 ${lewat ? "text-red-600" : ""}`}
                          />
                        ) : (
                          <span className={lewat ? "text-red-600" : ""}>{r.jatuhTempo ?? "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{buku === "bekon" && proyek ? proyek : r.pihak}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatRp(sisa)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {popupBayar && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="flex max-h-full w-full max-w-4xl flex-col rounded-xl bg-white p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900">
              {piutang ? "Pembayaran piutang" : "Pembayaran hutang"}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {terpilih[0]?.pihak ?? ""}. Isi jumlah yang dibayar untuk tiap nota. Jumlah tidak boleh nol dan tidak boleh lebih dari sisa.
            </p>
            <div className="mt-4 min-h-0 overflow-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Nota</th>
                    {buku === "bekon" && <th className="px-3 py-2 text-left font-medium text-gray-600">Proyek</th>}
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Jatuh tempo</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Sisa</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Dibayar</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Sisa setelah bayar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {terpilih.map((r) => {
                    const sisa = sisaTagihan(r.grand, r.dibayar, r.retur);
                    const bayar = Number(jumlah[r.id] || 0);
                    const lewat = bayar > sisa + 0.001;
                    const proyek = labelProyek(r.kodeProyek, r.namaPemilik);
                    return (
                      <tr key={r.id}>
                        <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-800">{r.nomor}</td>
                        {buku === "bekon" && <td className="px-3 py-2 text-gray-600">{proyek || "—"}</td>}
                        <td className="px-3 py-2 whitespace-nowrap text-gray-600">{r.jatuhTempo ?? "belum diisi"}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-right">{formatRp(sisa)}</td>
                        <td className="px-3 py-2">
                          <InputUang
                            aria-label={`Dibayar ${r.nomor}`}
                            value={jumlah[r.id] ?? ""}
                            onChange={(nilai) => setJumlah((q) => ({ ...q, [r.id]: nilai }))}
                            className="w-full min-w-32 border border-gray-300 rounded-lg px-2 py-1 text-right text-sm"
                          />
                        </td>
                        <td className={`px-3 py-2 whitespace-nowrap text-right ${lewat ? "text-red-600" : "text-gray-600"}`}>
                          {lewat ? "melebihi sisa" : formatRp(sisa - bayar)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800">
              <span>{terpilih.length} nota</span>
              <span>Sisa {formatRp(sisaTerpilih)}</span>
              <span>Dibayar {formatRp(totalBayar)}</span>
              <span>Sisa setelah bayar {formatRp(Math.max(0, sisaTerpilih - totalBayar))}</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-gray-600">
                Tanggal bayar
                <input type="date" value={tanggalBayar} onChange={(e) => setTanggalBayar(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs text-gray-600">
                Sumber kas
                <select value={akunKas} onChange={(e) => setAkunKas(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Pilih sumber kas</option>
                  {AKUN_KAS.map((akun) => (
                    <option key={akun.kode} value={akun.kode}>{akun.nama}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
              {namaKas
                ? piutang
                  ? `Uang ${formatRp(totalBayar)} masuk ke ${namaKas}. Piutang berkurang ${formatRp(totalBayar)}. Jurnal: ${namaKas} bertambah, piutang berkurang.`
                  : `Uang ${formatRp(totalBayar)} keluar dari ${namaKas}. Hutang berkurang ${formatRp(totalBayar)}. Jurnal: hutang berkurang, ${namaKas} berkurang.`
                : "Pilih sumber kas agar jurnal tahu uang masuk atau keluar dari akun mana."}
            </p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setPopupBayar(false)} disabled={menyimpan} className="text-sm text-gray-500">
                Batal
              </button>
              <button
                type="button"
                onClick={bayarDari}
                disabled={menyimpan || !akunKas}
                className="bg-[#b25d1a] text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
              >
                {menyimpan ? "Menyimpan..." : "Catat pembayaran"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
