"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LaporanPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/akuntansi/rugi-laba");
  }, [router]);
  return <p className="text-sm text-gray-500">Membuka Rugi Laba...</p>;
}
