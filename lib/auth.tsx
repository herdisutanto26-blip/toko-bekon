"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { db, hashPin } from "@/lib/api";
import { pesanError } from "@/lib/format";

export type Peran = "admin" | "kasir" | "pembelian" | "akunting";

export type SesiPengguna = {
  id: string;
  nama: string;
  peran: Peran;
  latihan: boolean;
};

type AuthState = {
  ready: boolean;
  user: SesiPengguna | null;
  dbSiap: boolean;
  login: (nama: string, pin: string) => Promise<string | null>;
  logout: () => void;
};

const Ctx = createContext<AuthState | null>(null);
const KEY = "toko-sesi";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SesiPengguna | null>(null);
  const [dbSiap, setDbSiap] = useState(true);

  useEffect(() => {
    const raw = sessionStorage.getItem(KEY);
    if (raw) setUser(JSON.parse(raw) as SesiPengguna);
    db()
      .from("pengguna")
      .select("id")
      .limit(1)
      .then(({ error }) => {
        setDbSiap(!error);
        setReady(true);
      });
  }, []);

  function simpan(next: SesiPengguna | null) {
    setUser(next);
    if (next) sessionStorage.setItem(KEY, JSON.stringify(next));
    else sessionStorage.removeItem(KEY);
  }

  async function login(nama: string, pin: string) {
    if (!dbSiap) {
      simpan({ id: "latihan", nama: "Admin latihan", peran: "admin", latihan: true });
      return null;
    }
    const { data, error } = await db()
      .from("pengguna")
      .select("id,nama,peran")
      .eq("nama", nama)
      .eq("pin_hash", await hashPin(pin))
      .eq("aktif", true)
      .maybeSingle();
    if (error) return pesanError(error.message);
    if (!data) return "Nama atau PIN salah";
    simpan({ id: data.id, nama: data.nama, peran: data.peran as Peran, latihan: false });
    return null;
  }

  return (
    <Ctx.Provider value={{ ready, user, dbSiap, login, logout: () => simpan(null) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Auth belum tersedia");
  return ctx;
}

const akses: Record<string, Peran[]> = {
  "/dashboard": ["admin", "kasir", "pembelian", "akunting"],
  "/penjualan": ["admin", "kasir", "akunting"],
  "/dari-bekon": ["admin", "akunting"],
  "/retur-penjualan": ["admin", "kasir", "akunting"],
  "/pembelian": ["admin", "pembelian", "akunting"],
  "/retur-pembelian": ["admin", "pembelian", "akunting"],
  "/piutang": ["admin", "kasir", "akunting"],
  "/hutang": ["admin", "pembelian", "akunting"],
  "/laporan": ["admin", "akunting"],
  "/produk": ["admin", "kasir", "pembelian", "akunting"],
  "/supplier": ["admin", "pembelian"],
  "/pelanggan": ["admin", "kasir"],
  "/master": ["admin"],
};

export function boleh(peran: Peran, href: string) {
  const key = Object.keys(akses).find((k) => href === k || href.startsWith(k + "/"));
  if (!key) return true;
  return akses[key].includes(peran);
}
