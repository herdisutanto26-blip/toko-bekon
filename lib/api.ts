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

export async function semua<T>(ambil: (dari: number, sampai: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const ukuran = 1000;
  const rows: T[] = [];
  for (let dari = 0; ; dari += ukuran) {
    const hasil = await ambil(dari, dari + ukuran - 1);
    if (hasil.error) throw new Error(pesanError(hasil.error.message));
    const batch = (hasil.data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < ukuran) return rows;
  }
}

export async function hashPin(pin: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
