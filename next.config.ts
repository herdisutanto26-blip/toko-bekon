import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pindah indikator Next.js agar tidak menutup tombol Keluar di pojok kiri.
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
