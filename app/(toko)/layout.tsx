"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  {
    group: "Utama",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "📊" },
    ],
  },
  {
    group: "Transaksi",
    items: [
      { href: "/penjualan", label: "Penjualan", icon: "🧾" },
      { href: "/pembelian", label: "Pembelian", icon: "🛒" },
    ],
  },
  {
    group: "Keuangan",
    items: [
      { href: "/piutang", label: "Piutang", icon: "📥" },
      { href: "/hutang", label: "Hutang", icon: "📤" },
    ],
  },
  {
    group: "Master Data",
    items: [
      { href: "/produk", label: "Produk", icon: "📦" },
      { href: "/supplier", label: "Supplier", icon: "🏭" },
      { href: "/pelanggan", label: "Pelanggan", icon: "👥" },
      { href: "/master", label: "Kategori & Satuan", icon: "⚙️" },
    ],
  },
];

export default function TokoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-gray-200">
          <span className="font-bold text-lg text-orange-600">Toko Bekon</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {nav.map((section) => (
            <div key={section.group}>
              <p className="px-2 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {section.group}
              </p>
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-orange-50 text-orange-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 text-xs text-gray-400">
          v0.1.0
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
