import { Avatar } from "./Avatar";
import { formatRelative } from "@/lib/format";
import type { TurfEntryDetailed } from "@/lib/types";

// Tabel met recente turf acties (gebruikt op dashboard en correctiepagina).
export function RecentActions({
  entries,
  emptyText = "Nog geen turf acties.",
}: {
  entries: TurfEntryDetailed[];
  emptyText?: string;
}) {
  if (entries.length === 0) {
    return <p className="py-6 text-center text-slate-400">{emptyText}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="pb-2 font-semibold">Tijd</th>
            <th className="pb-2 font-semibold">Bewoner</th>
            <th className="pb-2 font-semibold">Product</th>
            <th className="pb-2 text-right font-semibold">Aantal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((e) => (
            <tr key={e.id}>
              <td className="py-2.5 text-slate-500">
                {formatRelative(e.occurred_at)}
              </td>
              <td className="py-2.5">
                <span className="flex items-center gap-2 font-medium text-slate-800">
                  <Avatar emoji={e.resident?.avatar_emoji} size="sm" />
                  {e.resident?.name ?? "Onbekend"}
                </span>
              </td>
              <td className="py-2.5">
                <span className="flex items-center gap-1.5">
                  <span>{e.product?.emoji}</span>
                  {e.product?.name}
                </span>
              </td>
              <td className="py-2.5 text-right font-bold tabular-nums text-slate-900">
                {e.quantity}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
