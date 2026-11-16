"use client";

import { useLayoutEffect, useRef, type InputHTMLAttributes } from "react";
import { parseUang, teksUang } from "@/lib/format";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "inputMode"> & {
  value: string | number | null | undefined;
  onChange: (nilai: string) => void;
};

export default function InputUang({ value, onChange, className, placeholder, ...rest }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const tampil = teksUang(value);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement !== el) return;
    const akhir = el.value.length;
    el.setSelectionRange(akhir, akhir);
  }, [tampil]);

  return (
    <input
      {...rest}
      ref={ref}
      inputMode="numeric"
      value={tampil}
      placeholder={placeholder ?? "Rp 0"}
      onChange={(e) => onChange(parseUang(e.target.value))}
      className={className}
    />
  );
}
