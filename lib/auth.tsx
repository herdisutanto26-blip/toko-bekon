"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { db, hashPin } from "@/lib/api";
import { pesanError } from "@/lib/format";
import { aksesBawaan, menuToko, type Peran } from "@/lib/menu";

export type { Peran };

export type SesiPengguna = {
  id: string;
  nama: string;
  username: string;
  peran: Peran;
  latihan: boolean;
  menu_izin: string[] | null;
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

export function adalahPeranUji(peran: Peran) {
  return peran === "uji_karyawan" || peran === "uji_kepala";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SesiPengguna | null>(null);
  const [dbSiap, setDbSiap] = useState(true);

  useEffect(() => {
    const raw = sessionStorage.getItem(KEY);
    const cached = raw ? normalkanSesi(JSON.parse(raw) as SesiPengguna) : null;
    if (cached) setUser(cached);

    db()
      .from("pengguna")
      .select("id")
      .limit(1)
      .then(async ({ error }) => {
        setDbSiap(!error);
        if (!error && cached && cached.id !== "latihan") {
          const data = await ambilAkun(cached.id);
          if (!data || data.aktif === false) {
            setUser(null);
            sessionStorage.removeItem(KEY);
          } else {
            const next = sesiDariBaris(data);
            setUser(next);
            sessionStorage.setItem(KEY, JSON.stringify(next));
          }
        }
        setReady(true);
      });
  }, []);

  function simpan(next: SesiPengguna | null) {
    setUser(next);
    if (next) sessionStorage.setItem(KEY, JSON.stringify(next));
    else sessionStorage.removeItem(KEY);
  }

  async function login(akun: string, sandi: string) {
    const kunci = akun.trim();
    if (!kunci || !sandi) return "Nama akun dan kata sandi wajib diisi";
    if (!dbSiap) {
      simpan({
        id: "latihan",
        nama: "Admin latihan",
        username: "admin",
        peran: "admin",
        latihan: true,
        menu_izin: null,
      });
      return null;
    }
    const hash = await hashPin(sandi);
    const ketemu = await cariLogin(kunci, hash);
    if (ketemu.error) return pesanError(ketemu.error);
    if (!ketemu.data) return "Nama akun atau kata sandi salah";
    simpan(sesiDariBaris(ketemu.data));
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

type BarisAkun = {
  id: string;
  nama: string;
  username?: string | null;
  peran: string;
  aktif?: boolean;
  menu_izin?: string[] | null;
};

function normalkanSesi(sesi: SesiPengguna): SesiPengguna {
  return {
    ...sesi,
    username: sesi.username || sesi.nama,
    menu_izin: sesi.menu_izin ?? null,
  };
}

function sesiDariBaris(data: BarisAkun): SesiPengguna {
  return {
    id: data.id,
    nama: data.nama,
    username: data.username || data.nama,
    peran: data.peran as Peran,
    latihan: false,
    menu_izin: data.menu_izin ?? null,
  };
}

async function ambilAkun(id: string): Promise<BarisAkun | null> {
  const penuh = await db()
    .from("pengguna")
    .select("id,nama,username,peran,aktif,menu_izin")
    .eq("id", id)
    .maybeSingle();
  if (!penuh.error) return penuh.data as BarisAkun | null;
  if (!/username|menu_izin/i.test(penuh.error.message)) return null;
  const lama = await db().from("pengguna").select("id,nama,peran,aktif").eq("id", id).maybeSingle();
  return (lama.data as BarisAkun | null) ?? null;
}

async function cariLogin(kunci: string, hash: string): Promise<{ data: BarisAkun | null; error: string }> {
  const penuh = "id,nama,username,peran,menu_izin";
  const byUser = await db()
    .from("pengguna")
    .select(penuh)
    .eq("username", kunci.toLowerCase())
    .eq("pin_hash", hash)
    .eq("aktif", true)
    .maybeSingle();
  if (byUser.error && /username|menu_izin/i.test(byUser.error.message)) {
    const lama = await db()
      .from("pengguna")
      .select("id,nama,peran")
      .ilike("nama", kunci)
      .eq("pin_hash", hash)
      .eq("aktif", true)
      .maybeSingle();
    if (lama.error) return { data: null, error: lama.error.message };
    return { data: (lama.data as BarisAkun | null) ?? null, error: "" };
  }
  if (byUser.error) return { data: null, error: byUser.error.message };
  if (byUser.data) return { data: byUser.data as BarisAkun, error: "" };

  const byNama = await db()
    .from("pengguna")
    .select(penuh)
    .ilike("nama", kunci)
    .eq("pin_hash", hash)
    .eq("aktif", true)
    .maybeSingle();
  if (byNama.error) return { data: null, error: byNama.error.message };
  return { data: (byNama.data as BarisAkun | null) ?? null, error: "" };
}

export function boleh(user: SesiPengguna, href: string) {
  if (adalahPeranUji(user.peran)) {
    return href === "/uji" || href.startsWith("/uji/");
  }
  if (user.peran === "admin" && (href === "/akses" || href.startsWith("/akses/"))) return true;
  if (user.menu_izin) {
    return user.menu_izin.some((k) => href === k || href.startsWith(k + "/"));
  }
  const key = Object.keys(aksesBawaan).find((k) => href === k || href.startsWith(k + "/"));
  if (!key) return true;
  return aksesBawaan[key].includes(user.peran);
}

export function tujuanAwal(user: SesiPengguna) {
  if (adalahPeranUji(user.peran)) return "/uji";
  for (const section of menuToko) {
    for (const item of section.items) {
      if (boleh(user, item.href)) return item.href;
    }
  }
  return "/dashboard";
}
