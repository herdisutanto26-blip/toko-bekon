"use client";

import { formatRp } from "@/lib/format";

export function Baris({
  kode,
  label,
  nilai,
  tebal,
  garis,
  kedalaman = 0,
  tanpaNilai,
}: {
  kode?: string;
  label: string;
  nilai?: number;
  tebal?: boolean;
  garis?: boolean;
  kedalaman?: number;
  tanpaNilai?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 py-2 ${garis ? "border-t border-gray-200" : ""} ${tebal ? "font-semibold text-gray-900" : "text-gray-700"}`}
      style={{ paddingLeft: kedalaman ? `${kedalaman * 1.1}rem` : undefined }}
    >
      <span>{kode ? `${kode}  ${label}` : label}</span>
      {!tanpaNilai && <span className="tabular-nums">{formatRp(nilai ?? 0)}</span>}
    </div>
  );
}

export function Rentang({
  dari,
  sampai,
  onDari,
  onSampai,
}: {
  dari: string;
  sampai: string;
  onDari: (nilai: string) => void;
  onSampai: (nilai: string) => void;
}) {
  return (
    <div className="mb-6 flex gap-3">
      <label className="text-sm text-gray-600">
        Dari
        <input type="date" value={dari} onChange={(e) => onDari(e.target.value)} className="mt-1 block rounded-lg border border-gray-300 px-3 py-2" />
      </label>
      <label className="text-sm text-gray-600">
        Sampai
        <input type="date" value={sampai} onChange={(e) => onSampai(e.target.value)} className="mt-1 block rounded-lg border border-gray-300 px-3 py-2" />
      </label>
    </div>
  );
}

export function Status({ memuat, error }: { memuat: boolean; error: string }) {
  return (
    <>
      {memuat && <p className="mb-4 text-sm text-gray-500">Memuat...</p>}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
    </>
  );
}

export function Catatan({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 max-w-3xl text-xs text-gray-400">{children}</p>;
}

export function Uang({ nilai }: { nilai: number }) {
  return <span className={`tabular-nums ${nilai === 0 ? "text-gray-400" : "text-gray-900"}`}>{formatRp(nilai)}</span>;
}
