"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthProvider, adalahPeranUji, boleh, tujuanAwal, useAuth } from "@/lib/auth";
import { labelPeran, menuToko } from "@/lib/menu";

function Shell({ children }: { children: React.ReactNode }) {
  const { ready, user, dbSiap, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const modeUji = user ? adalahPeranUji(user.peran) : false;
  const [menuBuka, setMenuBuka] = useState(false);
  const [ponsel, setPonsel] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const ubah = () => setPonsel(mq.matches);
    ubah();
    mq.addEventListener("change", ubah);
    return () => mq.removeEventListener("change", ubah);
  }, []);

  useEffect(() => {
    setMenuBuka(false);
  }, [pathname]);

  useEffect(() => {
    if (!ready || !user) return;
    if (!boleh(user, pathname)) {
      const tujuan = tujuanAwal(user);
      if (tujuan !== pathname && boleh(user, tujuan)) router.replace(tujuan);
    }
  }, [ready, user, pathname, router]);

  if (!ready) return <p className="p-8 text-base font-medium text-gray-800">Memuat...</p>;
  if (!user) return <Login />;

  if (modeUji) {
    return (
      <div className="flex h-full flex-col bg-gray-50">
        <header className="no-print flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div>
            <p className="text-sm font-semibold text-gray-900">{user.nama}</p>
            <p className="text-sm text-gray-700">{labelPeran(user.peran)}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm text-orange-700 hover:bg-orange-100"
          >
            Keluar
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-dvh max-h-dvh">
      {menuBuka && (
        <button
          type="button"
          aria-label="Tutup menu"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMenuBuka(false)}
        />
      )}
      <aside
        inert={ponsel && !menuBuka ? true : undefined}
        className={`no-print fixed inset-y-0 left-0 z-40 flex w-[min(18.5rem,88vw)] max-w-full flex-col border-r border-gray-200 bg-white pt-[env(safe-area-inset-top)] transition-transform md:static md:z-auto md:w-60 md:translate-x-0 ${
          menuBuka ? "translate-x-0" : "-translate-x-full max-md:pointer-events-none"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-gray-200 px-5">
          <span className="text-lg font-bold text-orange-600">Toko Bekon</span>
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setMenuBuka(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-2xl leading-none text-gray-900 md:hidden"
          >
            ×
          </button>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {menuToko.map((section) => {
            const items = section.items.filter((item) => boleh(user, item.href));
            if (items.length === 0) return null;
            return (
              <div key={section.group}>
                <p className="mb-1 px-2 text-xs font-bold uppercase tracking-wider text-gray-600">
                  {section.group}
                </p>
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuBuka(false)}
                      className={`block rounded-lg px-3 py-3 text-base font-semibold md:py-2 md:text-sm ${
                        active ? "bg-orange-50 text-orange-700" : "text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="relative z-20 border-t border-gray-200 bg-white p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-sm text-gray-800">
          <p className="font-semibold text-gray-900">{user.nama}</p>
          <p>@{user.username}</p>
          <p>{labelPeran(user.peran)}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 inline-flex items-center rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 font-semibold text-orange-700 hover:bg-orange-100"
          >
            Keluar
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="no-print flex min-h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-3 pt-[env(safe-area-inset-top)] md:hidden">
          <button
            type="button"
            aria-label="Buka menu"
            onClick={() => setMenuBuka(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 text-gray-900"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
          <span className="text-lg font-bold text-orange-600">Toko Bekon</span>
        </header>
        {!dbSiap && (
          <p className="no-print border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 md:px-6">
            Database belum siap. Menu bisa dilihat, transaksi tersimpan setelah SQL skema toko dijalankan.
          </p>
        )}
        <main className="flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-6">{children}</main>
      </div>
    </div>
  );
}

function Login() {
  const { login, dbSiap } = useAuth();
  const [nama, setNama] = useState("");
  const [sandi, setSandi] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const msg = await login(nama, sandi);
    setError(msg ?? "");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6">
        <h1 className="mb-1 text-xl font-bold text-orange-600">Toko Bekon</h1>
        <p className="mb-5 text-sm font-medium text-gray-800">Masuk dengan akun. iPOS 4 tetap catatan yang sah.</p>
        {!dbSiap && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
            Tabel belum ada. Anda tetap bisa masuk dan melihat menu. Kata sandi latihan: 1234 setelah SQL dijalankan.
          </p>
        )}
        <label className="mb-1 block text-sm font-semibold text-gray-900">Nama akun</label>
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          autoComplete="username"
          placeholder="admin"
          className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base font-medium text-gray-900"
        />
        <label className="mb-1 block text-sm font-semibold text-gray-900">Kata sandi</label>
        <input
          type="password"
          value={sandi}
          onChange={(e) => setSandi(e.target.value)}
          autoComplete="current-password"
          className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base font-medium text-gray-900"
        />
        {error && <p className="mb-3 text-sm font-medium text-red-700">{error}</p>}
        <button className="w-full rounded-lg bg-orange-600 py-3 text-base font-semibold text-white hover:bg-orange-700">
          Masuk
        </button>
        {dbSiap && (
          <p className="mt-3 text-sm font-medium leading-relaxed text-gray-700">
            Akun latihan: admin, kasir, pembelian, atau akunting. Kata sandi awal 1234, ganti lewat menu Akses & Akun.
          </p>
        )}
      </form>
    </div>
  );
}

export default function TokoLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
