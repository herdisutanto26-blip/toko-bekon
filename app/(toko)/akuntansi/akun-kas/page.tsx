"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AkunKasPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/akuntansi/akun-perkiraan");
  }, [router]);
  return <p className="text-sm text-gray-500">Membuka Akun Perkiraan...</p>;
}
