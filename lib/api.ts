import { supabase } from "@/lib/supabase";
import { pesanError } from "@/lib/format";

export function db() {
  return supabase.schema("toko");
}

export async function rpc(fn: string, payload: Record<string, unknown>) {
  const { data, error } = await db().rpc(fn, { payload });
  if (error) throw new Error(pesanError(error.message));
  return data as string;
}

type HasilHalaman = { data: unknown; error: { message: string } | null };

function halaman(hasil: HasilHalaman, ukuran: number) {
  const pesan = hasil.error?.message ?? "";
  if (hasil.error && /PGRST103|not satisfiable/i.test(pesan)) return { baris: [] as unknown[], selesai: true };
  if (hasil.error) throw new Error(pesanError(pesan));
  const baris = (hasil.data ?? []) as unknown[];
  return { baris, selesai: baris.length < ukuran };
}

export async function semua<T>(ambil: (dari: number, sampai: number) => PromiseLike<HasilHalaman>): Promise<T[]> {
  const ukuran = 1000;
  const rows: T[] = [];
  const awal = halaman(await ambil(0, ukuran - 1), ukuran);
  rows.push(...(awal.baris as T[]));
  if (awal.selesai) return rows;

  const sejajar = 4;
  for (let dari = ukuran; ; dari += ukuran * sejajar) {
    const kumpulan = await Promise.all(
      Array.from({ length: sejajar }, (_, i) => ambil(dari + i * ukuran, dari + (i + 1) * ukuran - 1))
    );
    let selesai = false;
    for (const hasil of kumpulan) {
      const bagian = halaman(hasil, ukuran);
      rows.push(...(bagian.baris as T[]));
      if (bagian.selesai) {
        selesai = true;
        break;
      }
    }
    if (selesai) return rows;
  }
}

export async function hashPin(pin: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
