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
  stok: number;
};
type Baris = { key: string; produk_id: string; satuan: string; konversi: string; qty: string; harga: string };
type Pihak = { id: string; nama: string };

function daftarPilihan(item: ProdukRingkas): Pilihan[] {
  const kemasan = [...(item.kemasan ?? [])].sort((a, b) => {
    const ka = Number(a.konversi) > 0 ? Number(a.konversi) : 0;
    const kb = Number(b.konversi) > 0 ? Number(b.konversi) : 0;
    return kb - ka || a.satuan.localeCompare(b.satuan, "id");
  });
  const sumber = kemasan.length > 0
    ? kemasan.map((k) => ({ satuan: k.satuan, konversi: Number(k.konversi) > 0 ? Number(k.konversi) : 1, hargaJual: Number(k.harga_jual) }))
    : [{ satuan: item.satuan?.nama ?? "", konversi: 1, hargaJual: Number(item.harga_jual) }];
  return sumber.map((k) => ({
    id: item.id,
    nama: item.nama,
    kode_sku: item.kode_sku,
    satuan: k.satuan,
    konversi: k.konversi,
    hargaJual: k.hargaJual,
    stok: item.stok,
  }));
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
      const semuaPilihan = daftarPilihan(item);
      return semuaPilihan.find((p) => p.satuan === satuan) ?? semuaPilihan[0] ?? null;
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
            {labelPilihan(pilihan)}
          </button>
        ))
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div className="col-span-6">
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
          } else if (e.key === "Escape") setBuka(false);
        }}
        placeholder="Ketik nama atau SKU barang"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
      {menu}
    </div>
  );
}

export default function PesananForm({
  pesananId,
  onBatal,
  onTersimpan,
}: {
  pesananId?: string;
  onBatal: () => void;
  onTersimpan: (hasil: { nomor: string; penjualanId?: string }) => void;
}) {
  const { user } = useAuth();
  const [produk, setProduk] = useState<ProdukRingkas[]>([]);
  const [pihak, setPihak] = useState<Pihak[]>([]);
  const [pihakId, setPihakId] = useState("");
  const [tanggal, setTanggal] = useState(todayIso());
  const [catatan, setCatatan] = useState("");
  const [baris, setBaris] = useState<Baris[]>([{ key: "1", produk_id: "", satuan: "", konversi: "1", qty: "1", harga: "" }]);
  const [nomor, setNomor] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [siap, setSiap] = useState(!pesananId);

  useEffect(() => {
    semua<ProdukRingkas>((dari, sampai) =>
      db()
        .from("produk")
        .select("id,nama,kode_sku,harga_jual,harga_beli,stok,satuan(nama),kemasan:produk_kemasan(satuan,harga_jual,konversi)")
        .eq("aktif", true)
        .order("nama")
        .range(dari, sampai)
    ).then(setProduk);
    semua<Pihak>((dari, sampai) =>
      db().from("pelanggan").select("id,nama").eq("aktif", true).order("nama").range(dari, sampai)
    ).then(setPihak);
  }, []);

  useEffect(() => {
    if (!pesananId) return;
    let batal = false;
    setSiap(false);
    db()
      .from("pesanan_penjualan")
      .select("nomor_so,tanggal,pelanggan_id,catatan,pesanan_penjualan_item(produk_id,qty,satuan,konversi,harga_satuan)")
      .eq("id", pesananId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (batal) return;
        if (err || !data) {
          setError(err?.message || "Pesanan tidak ditemukan");
          setSiap(true);
          return;
        }
        const row = data as {
          nomor_so: string;
          tanggal: string;
          pelanggan_id: string | null;
          catatan: string | null;
          pesanan_penjualan_item: { produk_id: string; qty: number; satuan: string | null; konversi: number | null; harga_satuan: number }[];
        };
        const item = row.pesanan_penjualan_item ?? [];
        setNomor(row.nomor_so);
        setTanggal(row.tanggal);
        setPihakId(row.pelanggan_id ?? "");
        setCatatan(row.catatan ?? "");
        setBaris(item.length > 0 ? item.map((barisItem, i) => ({
          key: `awal-${i}`,
          produk_id: barisItem.produk_id,
          satuan: barisItem.satuan ?? "",
          konversi: String(Number(barisItem.konversi) > 0 ? barisItem.konversi : 1),
          qty: String(barisItem.qty),
          harga: String(Math.round(Number(barisItem.harga_satuan) || 0)),
        })) : [{ key: "1", produk_id: "", satuan: "", konversi: "1", qty: "1", harga: "" }]);
        setSiap(true);
      });
    return () => { batal = true; };
  }, [pesananId]);

  const total = useMemo(
    () => baris.reduce((sum, b) => sum + Number(b.qty || 0) * Number(b.harga || 0), 0),
    [baris]
  );

  function itemSiap() {
    return baris
      .filter((b) => b.produk_id && Number(b.qty) > 0)
      .map((b) => ({
        produk_id: b.produk_id,
        qty: Number(b.qty),
        harga_satuan: Number(b.harga || 0),
        satuan: b.satuan,
        konversi: Number(b.konversi) > 0 ? Number(b.konversi) : 1,
      }));
  }

  async function simpan(lanjut: boolean) {
    setError("");
    const items = itemSiap();
    if (items.length === 0) {
      setError("Isi minimal satu barang");
      return;
    }
    if (lanjut && !window.confirm("Catat pesanan ini menjadi nota penjualan? Stok akan berkurang.")) return;
    setSaving(true);
    try {
      const id = await rpc("simpan_pesanan_penjualan", {
        id: pesananId,
        tanggal,
        pelanggan_id: pihakId,
        catatan,
        dicatat_oleh: user?.nama ?? "",
        items,
      });
      const { data } = await db().from("pesanan_penjualan").select("nomor_so").eq("id", id).maybeSingle();
      const nomorSo = (data as { nomor_so?: string } | null)?.nomor_so ?? nomor;
      if (!lanjut) {
        onTersimpan({ nomor: nomorSo || "tersimpan" });
        return;
      }
      const penjualanId = await rpc("jadi_penjualan_dari_so", { id, dicatat_oleh: user?.nama ?? "" });
      onTersimpan({ nomor: nomorSo || "tersimpan", penjualanId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function batalkan() {
    if (!pesananId) return;
    if (!window.confirm(`Batalkan ${nomor || "pesanan ini"}?`)) return;
    setSaving(true);
    setError("");
    try {
      await rpc("batal_pesanan_penjualan", { id: pesananId });
      onTersimpan({ nomor: nomor ? `${nomor} dibatalkan` : "Pesanan dibatalkan" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membatalkan");
      setSaving(false);
    }
  }

  if (!siap) return <p className="text-sm text-gray-500">Memuat pesanan...</p>;

  return (
    <div>
      {nomor && <p className="mb-3 text-sm font-semibold text-gray-800">{nomor}</p>}
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <label className="text-sm text-gray-600">
          Tanggal
          <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
        </label>
        <label className="text-sm text-gray-600 md:col-span-2">
          Pelanggan (kosongkan jika umum)
          <select value={pihakId} onChange={(e) => setPihakId(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
            <option value="">— Umum —</option>
            {pihak.map((p) => (
              <option key={p.id} value={p.id}>{p.nama}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="space-y-2 mb-4">
        {baris.map((b) => (
          <div key={b.key} className="grid grid-cols-12 gap-2">
            <CariBarang
              produk={produk}
              produkId={b.produk_id}
              satuan={b.satuan}
              onPilih={(pilihan) => setBaris((rows) => rows.map((r) => r.key === b.key ? {
                ...r,
                produk_id: pilihan?.id ?? "",
                satuan: pilihan?.satuan ?? "",
                konversi: pilihan ? String(pilihan.konversi) : "1",
                harga: pilihan ? String(Math.round(pilihan.hargaJual)) : r.harga,
              } : r))}
            />
            <input value={b.qty} onChange={(e) => setBaris((rows) => rows.map((r) => r.key === b.key ? { ...r, qty: e.target.value } : r))} className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Qty" />
            <InputUang value={b.harga} onChange={(harga) => setBaris((rows) => rows.map((r) => r.key === b.key ? { ...r, harga } : r))} className="col-span-3 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <button type="button" onClick={() => setBaris((rows) => rows.filter((r) => r.key !== b.key))} className="col-span-1 text-gray-400" aria-label="Hapus">×</button>
          </div>
        ))}
        <button type="button" onClick={() => setBaris((rows) => [...rows, { key: String(Date.now()), produk_id: "", satuan: "", konversi: "1", qty: "1", harga: "" }])} className="text-sm text-orange-700">
          + Baris
        </button>
      </div>
      <label className="mb-4 block text-sm text-gray-600">
        Catatan
        <input value={catatan} onChange={(e) => setCatatan(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-gray-800">Total {formatRp(total)}</p>
        <div className="flex flex-wrap gap-2">
          {pesananId && (
            <button type="button" onClick={batalkan} disabled={saving} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-50">
              Batalkan
            </button>
          )}
          <button type="button" onClick={onBatal} disabled={saving} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-50">
            Tutup
          </button>
          <button type="button" onClick={() => simpan(false)} disabled={saving || user?.latihan} className="rounded-lg border border-orange-600 px-3 py-2 text-sm font-medium text-orange-700 disabled:opacity-50">
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
          <button type="button" onClick={() => simpan(true)} disabled={saving || user?.latihan} className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            Masuk penjualan
          </button>
        </div>
      </div>
    </div>
  );
}
