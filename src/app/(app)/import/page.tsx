import { PageHeader } from "@/components/PageHeader";
import { ImportWizard } from "@/components/admin/ImportWizard";
import { requireAdmin } from "@/lib/auth";
import { getImports, getProducts, getResidents } from "@/lib/data";
import { formatRelative } from "@/lib/format";
import type { ImportRecord } from "@/lib/types";

export default async function ImportPage() {
  await requireAdmin();
  const [residents, products, imports] = await Promise.all([
    getResidents(true),
    getProducts(true),
    getImports(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Excel/CSV"
        subtitle="Zet oude papieren turflijsten om naar digitale data."
      />

      <ImportWizard residents={residents} products={products} />

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">📚 Import-historie</h2>
        <p className="mb-3 text-sm text-slate-500">
          Elk geïmporteerd bestand wordt onthouden. Hetzelfde bestand kan niet
          twee keer worden geïmporteerd.
        </p>
        {imports.length === 0 ? (
          <p className="py-4 text-center text-slate-400">Nog niets geïmporteerd.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-semibold">Bestand</th>
                  <th className="pb-2 font-semibold">Wanneer</th>
                  <th className="pb-2 text-right font-semibold">Toegevoegd</th>
                  <th className="pb-2 text-right font-semibold">Fout</th>
                  <th className="pb-2 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(imports as ImportRecord[]).map((imp) => (
                  <tr key={imp.id}>
                    <td className="py-2 font-medium text-slate-800">
                      {imp.filename}
                    </td>
                    <td className="py-2 text-slate-500">
                      {formatRelative(imp.created_at)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-emerald-700">
                      {imp.success_rows}
                    </td>
                    <td className="py-2 text-right tabular-nums text-red-600">
                      {imp.error_rows}
                    </td>
                    <td className="py-2 text-center">
                      <span className="chip bg-slate-100 text-slate-600">
                        {imp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card bg-slate-50">
        <h2 className="mb-2 text-lg font-bold">Ondersteunde formaten</h2>
        <ul className="space-y-1 text-sm text-slate-600">
          <li>
            <strong>Breed:</strong> <code>Naam | Bier | Koffie | Eieren | Maand</code>
          </li>
          <li>
            <strong>Lang (datum):</strong>{" "}
            <code>Datum | Persoon | Product | Aantal</code>
          </li>
          <li>
            <strong>Lang (maand):</strong>{" "}
            <code>Persoon | Item | Aantal | Maand</code>
          </li>
        </ul>
      </section>
    </div>
  );
}
