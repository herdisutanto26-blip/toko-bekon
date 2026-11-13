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

  useEffect(() => {
    if (!ready || !user) return;
    if (!boleh(user, pathname)) {
      const tujuan = tujuanAwal(user);
      if (tujuan !== pathname && boleh(user, tujuan)) router.replace(tujuan);
    }
  }, [ready, user, pathname, router]);

  if (!ready) return <p className="p-8 text-sm text-gray-500">Memuat...</p>;
  if (!user) return <Login />;

  if (modeUji) {
    return (
      <div className="flex h-full flex-col bg-gray-50">
        <header className="no-print flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div>
            <p className="text-sm font-semibold text-gray-900">{user.nama}</p>
            <p className="text-xs text-gray-500">{labelPeran(user.peran)}</p>
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
    <div className="flex h-full">
      <aside className="no-print w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-14 flex items-center px-5 border-b border-gray-200">
          <span className="font-bold text-lg text-orange-600">Toko Bekon</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {menuToko.map((section) => {
            const items = section.items.filter((item) => boleh(user, item.href));
            if (items.length === 0) return null;
            return (
              <div key={section.group}>
                <p className="px-2 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {section.group}
                </p>
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                        active ? "bg-orange-50 text-orange-700" : "text-gray-600 hover:bg-gray-100"
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
        <div className="relative z-20 p-4 pb-6 border-t border-gray-200 text-xs text-gray-500 bg-white">
          <p className="font-medium text-gray-700">{user.nama}</p>
          <p>@{user.username}</p>
          <p>{labelPeran(user.peran)}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-2 inline-flex items-center rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-orange-700 hover:bg-orange-100"
          >
            Keluar
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!dbSiap && (
          <p className="no-print bg-amber-50 text-amber-800 text-sm px-6 py-2 border-b border-amber-200">
            Database belum siap. Menu bisa dilihat, transaksi tersimpan setelah SQL skema toko dijalankan.
          </p>
        )}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
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
    <div className="min-h-full flex items-center justify-center p-6">
      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold text-orange-600 mb-1">Toko Bekon</h1>
        <p className="text-sm text-gray-500 mb-5">Masuk dengan akun. iPOS 4 tetap catatan yang sah.</p>
        {!dbSiap && (
          <p className="text-sm bg-amber-50 text-amber-800 rounded-lg px-3 py-2 mb-4">
            Tabel belum ada. Anda tetap bisa masuk dan melihat menu. Kata sandi latihan: 1234 setelah SQL dijalankan.
          </p>
        )}
        <label className="block text-xs font-medium text-gray-600 mb-1">Nama akun</label>
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          autoComplete="username"
          placeholder="admin"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
        />
        <label className="block text-xs font-medium text-gray-600 mb-1">Kata sandi</label>
        <input
          type="password"
          value={sandi}
          onChange={(e) => setSandi(e.target.value)}
          autoComplete="current-password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
        />
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <button className="w-full bg-orange-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-orange-700">
          Masuk
        </button>
        {dbSiap && (
          <p className="text-xs text-gray-400 mt-3">
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
