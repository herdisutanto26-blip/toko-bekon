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

type Halaman<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

export async function semua<T>(ambil: (dari: number, sampai: number) => Halaman<T>) {
  const ukuran = 1000;
  const rows: T[] = [];
  for (let dari = 0; ; dari += ukuran) {
    const { data, error } = await ambil(dari, dari + ukuran - 1);
    if (error) throw new Error(pesanError(error.message));
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < ukuran) return rows;
  }
}

export async function hashPin(pin: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
