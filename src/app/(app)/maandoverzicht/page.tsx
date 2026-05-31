import { PageHeader } from "@/components/PageHeader";
import { MonthPicker } from "@/components/MonthPicker";
import { ExportButtons, type ExportRow } from "@/components/ExportButtons";
import { Avatar } from "@/components/Avatar";
import { currentPeriod, formatCents, periodLabel, recentPeriods } from "@/lib/format";
import {
  getMonthEntries,
  getProducts,
  totalsPerProduct,
  totalsPerResident,
} from "@/lib/data";

export default async function MaandoverzichtPage({
  searchParams,
}: {
  searchParams: Promise<{ maand?: string }>;
}) {
  const { maand } = await searchParams;
  const period = maand ?? currentPeriod();

  const [products, entries] = await Promise.all([
    getProducts(),
    getMonthEntries(period),
  ]);

  const productTotals = totalsPerProduct(entries, products);
  const residentTotals = totalsPerResident(entries, products);
  const hasPrices = products.some((p) => p.price_cents > 0);
  const grandTotalCost = residentTotals.reduce((s, r) => s + r.costCents, 0);

  // Data voor export.
  const exportRows: ExportRow[] = residentTotals.map((r) => {
    const row: ExportRow = { Bewoner: r.resident.name };
    for (const p of products) row[p.name] = r.perProduct[p.id] ?? 0;
    row["Totaal"] = r.total;
    if (hasPrices) row["Kosten (€)"] = (r.costCents / 100).toFixed(2);
    return row;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Maandoverzicht"
        subtitle={periodLabel(period)}
      >
        <MonthPicker periods={recentPeriods()} value={period} />
        <ExportButtons rows={exportRows} filename={`huisturf-${period}`} />
      </PageHeader>

      {/* Totaal per product */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {productTotals.map(({ product, total }) => (
          <div
            key={product.id}
            className="card flex items-center justify-between"
            style={{ backgroundColor: `${product.color}12` }}
          >
            <span className="flex items-center gap-2 font-semibold text-slate-600">
              <span className="text-2xl">{product.emoji}</span>
              {product.name}
            </span>
            <span
              className="text-3xl font-extrabold tabular-nums"
              style={{ color: product.color }}
            >
              {total}
            </span>
          </div>
        ))}
      </div>

      {/* Totaal per persoon */}
      <section className="card overflow-x-auto">
        <h2 className="mb-4 text-lg font-bold">Totaal per persoon</h2>
        {residentTotals.length === 0 ? (
          <p className="py-6 text-center text-slate-400">
            Geen data voor deze maand.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2 font-semibold">Bewoner</th>
                {products.map((p) => (
                  <th key={p.id} className="pb-2 text-right font-semibold">
                    {p.emoji} {p.name}
                  </th>
                ))}
                <th className="pb-2 text-right font-semibold">Totaal</th>
                {hasPrices && (
                  <th className="pb-2 text-right font-semibold">Kosten</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {residentTotals.map((r) => (
                <tr key={r.resident.id}>
                  <td className="py-2.5">
                    <span className="flex items-center gap-2 font-medium text-slate-800">
                      <Avatar emoji={r.resident.avatar_emoji} size="sm" />
                      {r.resident.name}
                    </span>
                  </td>
                  {products.map((p) => (
                    <td
                      key={p.id}
                      className="py-2.5 text-right tabular-nums text-slate-600"
                    >
                      {r.perProduct[p.id] ?? 0}
                    </td>
                  ))}
                  <td className="py-2.5 text-right font-bold tabular-nums">
                    {r.total}
                  </td>
                  {hasPrices && (
                    <td className="py-2.5 text-right font-semibold tabular-nums text-slate-700">
                      {formatCents(r.costCents)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-bold">
                <td className="pt-2.5">Totaal</td>
                {products.map((p) => (
                  <td key={p.id} className="pt-2.5 text-right tabular-nums">
                    {productTotals.find((t) => t.product.id === p.id)?.total ?? 0}
                  </td>
                ))}
                <td className="pt-2.5 text-right tabular-nums">
                  {residentTotals.reduce((s, r) => s + r.total, 0)}
                </td>
                {hasPrices && (
                  <td className="pt-2.5 text-right tabular-nums">
                    {formatCents(grandTotalCost)}
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        )}
      </section>

      {!hasPrices && (
        <p className="text-center text-sm text-slate-400">
          💡 Vul productprijzen in bij <strong>Producten</strong> om kosten per
          persoon te zien.
        </p>
      )}
    </div>
  );
}
