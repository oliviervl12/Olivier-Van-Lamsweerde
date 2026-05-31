"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { periodLabel } from "@/lib/format";

// Maandkiezer die de ?maand= query parameter aanpast.
export function MonthPicker({
  periods,
  value,
}: {
  periods: string[];
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("maand", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
      <span aria-hidden>📅</span>
      <select
        className="cursor-pointer appearance-none bg-transparent pr-5 outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {periods.map((p) => (
          <option key={p} value={p}>
            {periodLabel(p)}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 text-slate-400">
        ▾
      </span>
    </label>
  );
}
