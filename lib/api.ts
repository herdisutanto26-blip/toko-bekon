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

export async function hashPin(pin: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
