"use client";

export default function SaringTanggal({
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
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm text-gray-600">
        Dari
        <input type="date" value={dari} onChange={(e) => onDari(e.target.value)} className="mt-1 block rounded-lg border border-gray-300 px-3 py-2" />
      </label>
      <label className="text-sm text-gray-600">
        Sampai
        <input type="date" value={sampai} onChange={(e) => onSampai(e.target.value)} className="mt-1 block rounded-lg border border-gray-300 px-3 py-2" />
      </label>
      {(dari || sampai) && (
        <button type="button" onClick={() => { onDari(""); onSampai(""); }} className="mb-0.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700">
          Reset
        </button>
      )}
    </div>
  );
}
