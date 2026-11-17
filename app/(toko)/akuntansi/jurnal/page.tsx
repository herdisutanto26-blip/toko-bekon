"use client";

import { useEffect, useState } from "react";
import { labelJenis, muatJurnal, type EntriJurnal } from "@/lib/akuntansi";
import { monthStartIso, todayIso } from "@/lib/format";
import { Catatan, Rentang, Status, Uang } from "../ui";

export default function JurnalPage() {
  const [dari, setDari] = useState(monthStartIso());
  const [sampai, setSampai] = useState(todayIso());
  const [entri, setEntri] = useState<EntriJurnal[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let batal = false;
    setMemuat(true);
    setError("");
    muatJurnal(dari, sampai)
      .then((hasil) => {
        if (!batal) setEntri(hasil);
      })
      .catch((err: unknown) => {
        if (!batal) {
          setEntri([]);
          setError(err instanceof Error ? err.message : "Gagal memuat jurnal");
        }
      })
      .finally(() => {
        if (!batal) setMemuat(false);
      });
    return () => {
      batal = true;
    };
  }, [dari, sampai]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-800">Jurnal</h1>
      <p className="mb-6 max-w-3xl text-sm text-gray-500">
        Jurnal yang tersimpan adalah pelunasan piutang dan hutang lewat kas atau bank.
      </p>
      <Rentang dari={dari} sampai={sampai} onDari={setDari} onSampai={setSampai} />
      <Status memuat={memuat} error={error} />
      {!memuat && !error && entri.length === 0 && (
        <p className="text-sm text-gray-500">Belum ada jurnal pada rentang ini.</p>
      )}
      {!memuat && !error && (
        <div className="max-w-3xl space-y-4">
          {entri.map((item) => {
            const debit = item.baris.reduce((s, b) => s + b.debit, 0);
            const kredit = item.baris.reduce((s, b) => s + b.kredit, 0);
            return (
              <section key={item.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
                  <div>
                    <p className="font-semibold text-gray-900">{item.nomor}</p>
                    <p className="text-sm text-gray-500">{item.tanggal} · {labelJenis(item.jenis)}</p>
                  </div>
                  {item.dicatat_oleh && <p className="text-sm text-gray-500">{item.dicatat_oleh}</p>}
                </div>
                {item.keterangan && <p className="px-4 pt-3 text-sm text-gray-700">{item.keterangan}</p>}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[32rem] text-sm">
                    <thead className="text-left text-xs uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="px-4 py-2">Akun</th>
                        <th className="px-4 py-2 text-right">Debit</th>
                        <th className="px-4 py-2 text-right">Kredit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.baris.map((baris) => (
                        <tr key={`${item.id}-${baris.urutan}-${baris.kode}`} className="border-t border-gray-100">
                          <td className="px-4 py-2">
                            <span className="text-gray-500">{baris.kode}</span> {baris.nama}
                          </td>
                          <td className="px-4 py-2 text-right"><Uang nilai={baris.debit} /></td>
                          <td className="px-4 py-2 text-right"><Uang nilai={baris.kredit} /></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200 font-semibold">
                        <td className="px-4 py-2">Jumlah</td>
                        <td className="px-4 py-2 text-right"><Uang nilai={debit} /></td>
                        <td className="px-4 py-2 text-right"><Uang nilai={kredit} /></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {debit !== kredit && (
                  <p className="px-4 pb-3 text-sm text-red-600">Debit dan kredit jurnal ini tidak seimbang.</p>
                )}
              </section>
            );
          })}
        </div>
      )}
      <Catatan>
        Penjualan, pembelian, dan retur belum dibuatkan jurnal. Nilainya dibaca langsung dari nota di Rugi Laba dan dari sisa tagihan di Neraca.
      </Catatan>
    </div>
  );
}
