"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import InputUang from "@/components/InputUang";
import { db, rpc, semua } from "@/lib/api";
import { formatRp, todayIso } from "@/lib/format";
import { useAuth } from "@/lib/auth";

type Kemasan = { satuan: string; harga_jual: number; konversi: number | null };

type ProdukRingkas = {
  id: string;
  nama: string;
  kode_sku: string | null;
  harga_jual: number;
  harga_beli: number;
  stok: number;
  satuan: { nama: string } | null;
  kemasan: Kemasan[] | null;
};

type Pilihan = {
  id: string;
  nama: string;
  kode_sku: string | null;
  satuan: string;
  konversi: number;
  hargaJual: number;
  hargaBeli: number;
  stok: number;
};

type Baris = { key: string; produk_id: string; satuan: string; konversi: string; qty: string; harga: string };

function formatJumlah(n: number) {
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("id-ID", { maximumFractionDigits: 3 });
}

function daftarPilihan(item: ProdukRingkas): Pilihan[] {
  const kemasan = [...(item.kemasan ?? [])].sort((a, b) => {
    const ka = Number(a.konversi) > 0 ? Number(a.konversi) : 0;
    const kb = Number(b.konversi) > 0 ? Number(b.konversi) : 0;
    return kb - ka || a.satuan.localeCompare(b.satuan, "id");
  });
  const sumber = kemasan.length > 0
    ? kemasan.map((k) => ({
        satuan: k.satuan,
        konversi: Number(k.konversi) > 0 ? Number(k.konversi) : 1,
        hargaJual: Number(k.harga_jual),
      }))
    : [{ satuan: item.satuan?.nama ?? "", konversi: 1, hargaJual: Number(item.harga_jual) }];
  return sumber.map((k) => ({
    id: item.id,
    nama: item.nama,
    kode_sku: item.kode_sku,
    satuan: k.satuan,
    konversi: k.konversi,
    hargaJual: k.hargaJual,
    hargaBeli: Number(item.harga_beli) * k.konversi,
    stok: item.stok,
  }));
}

type Pihak = { id: string; nama: string };
type CaraBayar = "kasir" | "transfer" | "tempo";

const REKENING = [
  { kode: "1-1120", nama: "Bank BCA" },
  { kode: "1-1130", nama: "Bank BSI" },
];

export default function BarangForm({
  mode,
  tanpaKartu,
  notaId,
  onTersimpan,
  onBatal,
}: {
  mode: "jual" | "beli";
  tanpaKartu?: boolean;
  notaId?: string;
  onTersimpan?: (hasil: { nomor: string; id: string; cetak: boolean; uang?: number }) => void;
  onBatal?: () => void;
}) {
  const { user } = useAuth();
  const jual = mode === "jual";
  const [produk, setProduk] = useState<ProdukRingkas[]>([]);
  const [pihak, setPihak] = useState<Pihak[]>([]);
  const [pihakId, setPihakId] = useState("");
  const [tanggal, setTanggal] = useState(todayIso());
  const [catatan, setCatatan] = useState("");
  const [diskon, setDiskon] = useState("0");
  const [dibayar, setDibayar] = useState("");
  const [cara, setCara] = useState<CaraBayar>("kasir");
  const [bayar, setBayar] = useState("");
  const [rekening, setRekening] = useState("");
  const [tempo, setTempo] = useState("");
  const [baris, setBaris] = useState<Baris[]>([{ key: "1", produk_id: "", satuan: "", konversi: "1", qty: "1", harga: "" }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [nomor, setNomor] = useState("");
  const [nomorNota, setNomorNota] = useState("");
  const [siap, setSiap] = useState(!notaId);
  const [cadangan, setCadangan] = useState<Record<string, number>>({});

  useEffect(() => {
    semua<ProdukRingkas>((dari, sampai) =>
      db()
        .from("produk")
        .select("id,nama,kode_sku,harga_jual,harga_beli,stok,satuan(nama),kemasan:produk_kemasan(satuan,harga_jual,konversi)")
        .eq("aktif", true)
        .order("nama")
        .range(dari, sampai)
    ).then(setProduk);
    const table = jual ? "pelanggan" : "supplier";
    semua<Pihak>((dari, sampai) =>
      db().from(table).select("id,nama").eq("aktif", true).order("nama").range(dari, sampai)
    ).then(setPihak);
  }, [jual]);

  useEffect(() => {
    if (!notaId || !jual) return;
    let batal = false;
    setSiap(false);
    db()
      .from("penjualan")
      .select("nomor_nota,tanggal,pelanggan_id,catatan,diskon,dibayar,grand_total,jatuh_tempo,penjualan_item(produk_id,qty,satuan,konversi,harga_satuan)")
      .eq("id", notaId)
      .maybeSingle()
      .then(async ({ data, error: err }) => {
        if (batal) return;
        if (err || !data) {
          setError(err?.message || "Nota tidak ditemukan");
          setSiap(true);
          return;
        }
        const row = data as {
          nomor_nota: string;
          tanggal: string;
          pelanggan_id: string | null;
          catatan: string | null;
          diskon: number;
          dibayar: number;
          grand_total: number;
          jatuh_tempo: string | null;
          penjualan_item: { produk_id: string; qty: number; satuan: string | null; konversi: number | null; harga_satuan: number }[];
        };
        const { data: pelunasan } = await db()
          .from("pelunasan_piutang")
          .select("jurnal_id")
          .eq("penjualan_id", notaId)
          .order("created_at")
          .limit(1);
        if (batal) return;
        const jurnalId = (pelunasan?.[0] as { jurnal_id: string | null } | undefined)?.jurnal_id ?? "";
        let kode = "";
        if (jurnalId) {
          const { data: akun } = await db().from("jurnal_baris").select("kode").eq("jurnal_id", jurnalId).gt("debit", 0).limit(1);
          kode = (akun?.[0] as { kode: string } | undefined)?.kode ?? "";
        }
        const item = row.penjualan_item ?? [];
        const pakai: Record<string, number> = {};
        for (const barisItem of item) {
          const konv = Number(barisItem.konversi) > 0 ? Number(barisItem.konversi) : 1;
          pakai[barisItem.produk_id] = (pakai[barisItem.produk_id] ?? 0) + Number(barisItem.qty) * konv;
        }
        setNomorNota(row.nomor_nota);
        setTanggal(row.tanggal);
        setPihakId(row.pelanggan_id ?? "");
        setCatatan(row.catatan ?? "");
        setDiskon(String(Math.round(Number(row.diskon) || 0)));
        setBaris(item.length > 0 ? item.map((barisItem, i) => ({
          key: `awal-${i}`,
          produk_id: barisItem.produk_id,
          satuan: barisItem.satuan ?? "",
          konversi: String(Number(barisItem.konversi) > 0 ? barisItem.konversi : 1),
          qty: String(barisItem.qty),
          harga: String(Math.round(Number(barisItem.harga_satuan) || 0)),
        })) : [{ key: "1", produk_id: "", satuan: "", konversi: "1", qty: "1", harga: "" }]);
        setCadangan(pakai);
        if (kode === "1-1120" || kode === "1-1130") {
          setCara("transfer");
          setRekening(kode);
        } else if (kode === "1-1110" || (Number(row.dibayar) > 0 && !row.jatuh_tempo)) {
          setCara("kasir");
          setBayar(String(Math.round(Number(row.grand_total) || 0)));
        } else {
          setCara("tempo");
          setTempo(row.jatuh_tempo ?? "");
        }
        setSiap(true);
      });
    return () => { batal = true; };
  }, [notaId, jual]);

  const total = useMemo(() => {
    return baris.reduce((sum, b) => sum + Number(b.qty || 0) * Number(b.harga || 0), 0);
  }, [baris]);
  const grand = Math.max(0, total - Number(diskon || 0));
  const uangBayar = Number(bayar || 0);
  const kembalian = Math.max(0, uangBayar - grand);

  function pilihProduk(key: string, pilihan: Pilihan | null) {
    setBaris((rows) =>
      rows.map((r) =>
        r.key === key
          ? {
              ...r,
              produk_id: pilihan?.id ?? "",
              satuan: pilihan?.satuan ?? "",
              konversi: pilihan ? String(pilihan.konversi) : "1",
              harga: pilihan ? String(Math.round(jual ? pilihan.hargaJual : pilihan.hargaBeli)) : r.harga,
            }
          : r
      )
    );
  }

  async function simpan(cetak = false) {
    setError("");
    if (!jual && !pihakId) {
      setError("Supplier wajib diisi");
      return;
    }
    const items = baris
      .filter((b) => b.produk_id && Number(b.qty) > 0)
      .map((b) => ({
        produk_id: b.produk_id,
        qty: Number(b.qty),
        harga_satuan: Number(b.harga || 0),
        satuan: b.satuan,
        konversi: Number(b.konversi) > 0 ? Number(b.konversi) : 1,
      }));
    if (items.length === 0) {
      setError("Isi minimal satu barang");
      return;
    }
    if (jual && cara === "tempo" && !tempo) {
      setError("Jatuh tempo wajib diisi");
      return;
    }
    if (jual && cara === "kasir" && uangBayar + 0.001 < grand) {
      setError("Uang bayar kurang dari total");
      return;
    }
    if (jual && cara === "transfer" && !rekening) {
      setError("Pilih rekening tujuan transfer");
      return;
    }
    setSaving(true);
    try {
      const id = await rpc(notaId ? "ubah_penjualan" : jual ? "simpan_penjualan" : "simpan_pembelian", {
        id: notaId,
        tanggal,
        pelanggan_id: jual ? pihakId : undefined,
        supplier_id: jual ? undefined : pihakId,
        catatan,
        diskon: Number(diskon || 0),
        dibayar: jual ? (cara === "kasir" ? uangBayar : cara === "transfer" ? grand : 0) : dibayar === "" ? grand : Number(dibayar),
        cara_bayar: jual ? cara : undefined,
        akun_kas: jual && cara === "transfer" ? rekening : undefined,
        jatuh_tempo: jual && cara === "tempo" ? tempo : undefined,
        dicatat_oleh: user?.nama ?? "",
        items,
      });
      const table = jual ? "penjualan" : "pembelian";
      const col = jual ? "nomor_nota" : "nomor_po";
      const { data } = await db().from(table).select(col).eq("id", id).maybeSingle();
      const row = data as Record<string, string> | null;
      const hasil = notaId ? nomorNota : row?.[col] ?? "tersimpan";
      setNomor(hasil);
      setBaris([{ key: String(Date.now()), produk_id: "", satuan: "", konversi: "1", qty: "1", harga: "" }]);
      setCatatan("");
      onTersimpan?.({
        nomor: hasil,
        id: String(id),
        cetak,
        uang: jual && cara === "kasir" ? uangBayar : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  if (!siap) return <p className="text-sm text-gray-500">Memuat nota...</p>;

  return (
    <div className={tanpaKartu ? "" : "bg-white border border-gray-200 rounded-xl p-5 mb-6"}>
      {!tanpaKartu && <h2 className="font-semibold text-gray-800 mb-4">{notaId ? nomorNota || "Ubah nota" : jual ? "Nota baru" : "Pembelian baru"}</h2>}
      {tanpaKartu && nomorNota && <p className="mb-3 text-sm font-medium text-gray-700">{nomorNota}</p>}
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}
      {nomor && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">Tersimpan: {nomor}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <label className="text-sm text-gray-600">
          Tanggal
          <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
        </label>
        <label className={`text-sm text-gray-600 ${jual ? "" : "md:col-span-2"}`}>
          {jual ? "Pelanggan (kosongkan jika umum)" : "Supplier"}
          <CariPihak
            daftar={pihak}
            nilai={pihakId}
            umum={jual}
            onPilih={setPihakId}
          />
        </label>
        {jual && (
          <div className="text-sm text-gray-600">
            <label>
              Pembayaran
              <select value={cara} onChange={(e) => setCara(e.target.value as CaraBayar)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
                <option value="kasir">Kasir</option>
                <option value="transfer">Transfer</option>
                <option value="tempo">Tempo</option>
              </select>
            </label>
            {cara === "tempo" && (
              <label className="mt-2 block">
                Jatuh tempo
                <input type="date" value={tempo} onChange={(e) => setTempo(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
              </label>
            )}
            {cara === "transfer" && (
              <label className="mt-2 block">
                Rekening
                <select value={rekening} onChange={(e) => setRekening(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="">— Pilih rekening —</option>
                  {REKENING.map((akun) => (
                    <option key={akun.kode} value={akun.kode}>{akun.nama}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
      </div>
      <div className="space-y-2 mb-4">
        {baris.map((b) => {
          const item = produk.find((p) => p.id === b.produk_id);
          return (
            <div key={b.key} className="grid grid-cols-12 gap-2">
              <CariBarang
                produk={produk}
                produkId={b.produk_id}
                satuan={b.satuan}
                onPilih={(pilihan) => pilihProduk(b.key, pilihan)}
              />
              <input value={b.qty} onChange={(e) => setBaris((rows) => rows.map((r) => r.key === b.key ? { ...r, qty: e.target.value } : r))} className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Qty" />
              <InputUang value={b.harga} onChange={(nilai) => setBaris((rows) => rows.map((r) => r.key === b.key ? { ...r, harga: nilai } : r))} className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm text-right" placeholder="Harga" />
              <p className="col-span-3 flex items-center justify-end text-sm font-medium text-gray-800">{formatRp(Number(b.qty || 0) * Number(b.harga || 0))}</p>
              {baris.length > 1 && (
                <button type="button" onClick={() => setBaris((rows) => rows.filter((r) => r.key !== b.key))} className="col-span-12 -mt-1 text-left text-xs text-gray-500">
                  Hapus
                </button>
              )}
              {item && jual && (() => {
                const konv = Number(b.konversi) > 0 ? Number(b.konversi) : 1;
                const terpakai = baris
                  .filter((r) => r.produk_id === b.produk_id)
                  .reduce((s, r) => s + Number(r.qty || 0) * (Number(r.konversi) > 0 ? Number(r.konversi) : 1), 0);
                const ada = item.stok + (cadangan[b.produk_id] ?? 0);
                if (terpakai <= ada + 0.000001) return null;
                return (
                  <p className="col-span-12 text-xs text-red-600">
                    Stok {item.nama}{b.satuan ? ` ${b.satuan}` : ""} tinggal {formatJumlah(ada / konv)}
                  </p>
                );
              })()}
            </div>
          );
        })}
        <button type="button" onClick={() => setBaris((rows) => [...rows, { key: String(Date.now()), produk_id: "", satuan: "", konversi: "1", qty: "1", harga: "" }])} className="text-sm text-orange-700">
          + Baris
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {jual && (
          <label className="text-sm text-gray-600">
            Diskon
            <InputUang value={diskon} onChange={setDiskon} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-right" />
          </label>
        )}
        {jual && cara === "kasir" && (
          <>
            <label className="text-sm text-gray-600">
              Bayar
              <InputUang value={bayar} onChange={setBayar} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-right" />
            </label>
            <label className="text-sm text-gray-600">
              Kembalian
              <p className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-right font-medium text-gray-900">{formatRp(kembalian)}</p>
            </label>
          </>
        )}
        {!jual && (
          <label className="text-sm text-gray-600">
            Dibayar sekarang (kosong = lunas)
            <InputUang value={dibayar} onChange={setDibayar} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-right" />
          </label>
        )}
        <label className="text-sm text-gray-600 md:col-span-3">
          Catatan
          <input value={catatan} onChange={(e) => setCatatan(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
        </label>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-gray-800">Total {formatRp(grand)}</p>
        <div className="flex gap-2">
          {onBatal && (
            <button type="button" onClick={onBatal} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">
              Batal
            </button>
          )}
          {jual && (
            <button type="button" onClick={() => simpan(true)} disabled={saving || user?.latihan} className="rounded-lg border border-orange-600 px-4 py-2 text-sm font-medium text-orange-700 disabled:opacity-50">
              {saving ? "Menyimpan..." : "Simpan dan cetak"}
            </button>
          )}
          <button type="button" onClick={() => simpan(false)} disabled={saving || user?.latihan} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CariPihak({
  daftar,
  nilai,
  umum,
  onPilih,
}: {
  daftar: Pihak[];
  nilai: string;
  umum: boolean;
  onPilih: (id: string) => void;
}) {
  const terpilih = daftar.find((p) => p.id === nilai) ?? null;
  const inputRef = useRef<HTMLInputElement>(null);
  const [teks, setTeks] = useState("");
  const [buka, setBuka] = useState(false);
  const [aktif, setAktif] = useState(0);
  const [kotak, setKotak] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);
  const kata = teks.trim().toLowerCase();
  const hasil = useMemo(() => {
    if (!kata) return [];
    return daftar.filter((p) => p.nama.toLowerCase().includes(kata)).slice(0, 20);
  }, [daftar, kata]);
  const tampilUmum = umum && (kata.length === 0 || "umum".includes(kata));
  const jumlah = hasil.length + (tampilUmum ? 1 : 0);

  function pilih(id: string, nama: string) {
    onPilih(id);
    setTeks(nama);
    setBuka(false);
  }

  useLayoutEffect(() => {
    if (!buka) return;
    function ukur() {
      const el = inputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const ruangBawah = window.innerHeight - r.bottom;
      const bukaKeAtas = ruangBawah < 220 && r.top > ruangBawah;
      setKotak(bukaKeAtas
        ? { bottom: window.innerHeight - r.top + 4, left: r.left, width: r.width }
        : { top: r.bottom + 4, left: r.left, width: r.width });
    }
    ukur();
    window.addEventListener("scroll", ukur, true);
    window.addEventListener("resize", ukur);
    return () => {
      window.removeEventListener("scroll", ukur, true);
      window.removeEventListener("resize", ukur);
    };
  }, [buka, teks, hasil.length]);

  function pilihAktif() {
    if (tampilUmum && aktif === 0) {
      pilih("", "");
      return;
    }
    const item = hasil[aktif - (tampilUmum ? 1 : 0)];
    if (item) pilih(item.id, item.nama);
  }

  const menu = buka && kotak ? createPortal(
    <div
      style={{ top: kotak.top, bottom: kotak.bottom, left: kotak.left, width: kotak.width }}
      className="fixed z-[70] max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
    >
      {kata.length < 1 ? (
        <>
          {tampilUmum && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setAktif(0)}
              onClick={() => pilih("", "")}
              className={`block w-full px-3 py-2 text-left text-sm ${aktif === 0 ? "bg-orange-50" : "hover:bg-gray-50"}`}
            >
              — Umum —
            </button>
          )}
          <p className="px-3 py-2 text-xs text-gray-500">Ketik untuk menyaring nama.</p>
        </>
      ) : jumlah === 0 ? (
        <p className="px-3 py-2 text-xs text-gray-500">Tidak ada nama dengan kata itu.</p>
      ) : (
        <>
          {tampilUmum && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setAktif(0)}
              onClick={() => pilih("", "")}
              className={`block w-full px-3 py-2 text-left text-sm ${aktif === 0 ? "bg-orange-50" : "hover:bg-gray-50"}`}
            >
              — Umum —
            </button>
          )}
          {hasil.map((p, i) => {
            const index = i + (tampilUmum ? 1 : 0);
            return (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setAktif(index)}
                onClick={() => pilih(p.id, p.nama)}
                className={`block w-full px-3 py-2 text-left text-sm ${index === aktif ? "bg-orange-50" : "hover:bg-gray-50"}`}
              >
                {p.nama}
              </button>
            );
          })}
        </>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative mt-1">
      <input
        ref={inputRef}
        value={buka || !terpilih ? teks : terpilih.nama}
        onChange={(e) => {
          setTeks(e.target.value);
          setBuka(true);
          setAktif(0);
          if (nilai) onPilih("");
        }}
        onFocus={(e) => {
          setTeks(terpilih ? terpilih.nama : "");
          setBuka(true);
          e.currentTarget.select();
        }}
        onBlur={() => window.setTimeout(() => {
          setBuka(false);
          if (!nilai) setTeks("");
        }, 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setBuka(true);
            setAktif((i) => Math.min(i + 1, Math.max(jumlah - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setAktif((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && buka && jumlah > 0) {
            e.preventDefault();
            pilihAktif();
          } else if (e.key === "Escape") {
            setBuka(false);
          }
        }}
        placeholder={umum ? "Ketik nama, kosong = umum" : "Ketik nama supplier"}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
      {menu}
    </div>
  );
}

function labelPilihan(pilihan: Pilihan) {
  const nama = `${pilihan.nama}${pilihan.kode_sku ? ` (${pilihan.kode_sku})` : ""}`;
  return pilihan.satuan ? `${nama} — ${pilihan.satuan}` : nama;
}

function CariBarang({
  produk,
  produkId,
  satuan,
  onPilih,
}: {
  produk: ProdukRingkas[];
  produkId: string;
  satuan: string;
  onPilih: (pilihan: Pilihan | null) => void;
}) {
  const terpilih = useMemo(() => {
    for (const item of produk) {
      if (item.id !== produkId) continue;
      const semua = daftarPilihan(item);
      return semua.find((p) => p.satuan === satuan) ?? semua[0] ?? null;
    }
    return null;
  }, [produk, produkId, satuan]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [teks, setTeks] = useState("");
  const [buka, setBuka] = useState(false);
  const [aktif, setAktif] = useState(0);
  const [kotak, setKotak] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);
  const kata = teks.trim().toLowerCase();
  const hasil = useMemo(() => {
    if (kata.length < 1) return [];
    const baris: Pilihan[] = [];
    for (const item of produk) {
      const nama = `${item.nama} ${item.kode_sku ?? ""}`.toLowerCase();
      const unit = daftarPilihan(item);
      if (nama.includes(kata)) baris.push(...unit);
      else baris.push(...unit.filter((p) => p.satuan.toLowerCase().includes(kata)));
      if (baris.length >= 24) break;
    }
    return baris.slice(0, 24);
  }, [produk, kata]);

  function pilih(pilihan: Pilihan) {
    onPilih(pilihan);
    setTeks(labelPilihan(pilihan));
    setBuka(false);
  }

  useLayoutEffect(() => {
    if (!buka) return;
    function ukur() {
      const el = inputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const ruangBawah = window.innerHeight - r.bottom;
      const bukaKeAtas = ruangBawah < 220 && r.top > ruangBawah;
      setKotak(bukaKeAtas
        ? { bottom: window.innerHeight - r.top + 4, left: r.left, width: r.width }
        : { top: r.bottom + 4, left: r.left, width: r.width });
    }
    ukur();
    window.addEventListener("scroll", ukur, true);
    window.addEventListener("resize", ukur);
    return () => {
      window.removeEventListener("scroll", ukur, true);
      window.removeEventListener("resize", ukur);
    };
  }, [buka, teks, hasil.length]);

  const menu = buka && kotak ? createPortal(
    <div
      style={{ top: kotak.top, bottom: kotak.bottom, left: kotak.left, width: kotak.width }}
      className="fixed z-[70] max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
    >
      {kata.length < 1 ? (
        <p className="px-3 py-2 text-xs text-gray-500">Ketik untuk menyaring barang.</p>
      ) : hasil.length === 0 ? (
        <p className="px-3 py-2 text-xs text-gray-500">Tidak ada barang dengan kata itu.</p>
      ) : (
        hasil.map((pilihan, i) => (
          <button
            key={`${pilihan.id}:${pilihan.satuan}`}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setAktif(i)}
            onClick={() => pilih(pilihan)}
            className={`block w-full px-3 py-2 text-left text-sm ${i === aktif ? "bg-orange-50" : "hover:bg-gray-50"}`}
          >
            {labelPilihan(pilihan)} — stok {formatJumlah(pilihan.stok / pilihan.konversi)}
          </button>
        ))
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div className="col-span-5 relative">
      <input
        ref={inputRef}
        value={buka || !terpilih ? teks : labelPilihan(terpilih)}
        onChange={(e) => {
          setTeks(e.target.value);
          setBuka(true);
          setAktif(0);
          if (produkId) onPilih(null);
        }}
        onFocus={(e) => {
          setTeks(terpilih ? labelPilihan(terpilih) : teks);
          setBuka(true);
          e.currentTarget.select();
        }}
        onBlur={() => window.setTimeout(() => setBuka(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setBuka(true);
            setAktif((i) => Math.min(i + 1, Math.max(hasil.length - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setAktif((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && buka && hasil[aktif]) {
            e.preventDefault();
            pilih(hasil[aktif]);
          } else if (e.key === "Escape") {
            setBuka(false);
          }
        }}
        placeholder="Ketik nama atau SKU barang"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
      {menu}
    </div>
  );
}
