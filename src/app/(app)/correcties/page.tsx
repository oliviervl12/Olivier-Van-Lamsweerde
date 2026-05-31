import { PageHeader } from "@/components/PageHeader";
import { CorrectionsManager } from "@/components/admin/CorrectionsManager";
import { requireAdmin } from "@/lib/auth";
import {
  getCorrections,
  getProducts,
  getRecentEntries,
  getResidents,
} from "@/lib/data";
import { formatRelative } from "@/lib/format";

const ACTION_LABEL: Record<string, string> = {
  create: "Aangemaakt",
  update: "Aangepast",
  delete: "Verwijderd",
  undo: "Ongedaan gemaakt",
};

export default async function CorrectiesPage() {
  await requireAdmin();
  const [entries, residents, products, log] = await Promise.all([
    getRecentEntries(25),
    getResidents(true),
    getProducts(true),
    getCorrections(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Correcties"
        subtitle="Pas recente turf acties aan of verwijder ze. Alles wordt gelogd."
      />

      <section>
        <h2 className="mb-3 text-lg font-bold">Recente turf acties</h2>
        <CorrectionsManager
          entries={entries}
          residents={residents}
          products={products}
        />
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">📜 Audit log</h2>
        {log.length === 0 ? (
          <p className="py-4 text-center text-slate-400">Nog geen correcties.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-semibold">Wanneer</th>
                  <th className="pb-2 font-semibold">Actie</th>
                  <th className="pb-2 font-semibold">Door</th>
                  <th className="pb-2 font-semibold">Reden</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {log.map((c) => {
                  const performer = (c as { performer?: { display_name?: string; email?: string } }).performer;
                  return (
                    <tr key={c.id as string}>
                      <td className="py-2 text-slate-500">
                        {formatRelative(c.created_at as string)}
                      </td>
                      <td className="py-2">
                        <span className="chip bg-slate-100 text-slate-700">
                          {ACTION_LABEL[c.action as string] ?? (c.action as string)}
                        </span>
                      </td>
                      <td className="py-2 text-slate-600">
                        {performer?.display_name ?? performer?.email ?? "—"}
                      </td>
                      <td className="py-2 text-slate-500">
                        {(c.reason as string) ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
