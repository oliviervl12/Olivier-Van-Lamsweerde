import { PageHeader } from "@/components/PageHeader";
import { MonthPicker } from "@/components/MonthPicker";
import { QuickTurf } from "@/components/QuickTurf";
import { RecentActions } from "@/components/RecentActions";
import { Avatar } from "@/components/Avatar";
import { currentPeriod, periodLabel, recentPeriods } from "@/lib/format";
import { badgeForProductSlug } from "@/lib/badges";
import {
  getMonthEntries,
  getProducts,
  getRecentEntries,
  getResidents,
  rankingForProduct,
  totalsPerProduct,
  totalsPerResident,
} from "@/lib/data";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ maand?: string }>;
}) {
  const { maand } = await searchParams;
  const period = maand ?? currentPeriod();

  const [products, residents, entries, recent] = await Promise.all([
    getProducts(),
    getResidents(),
    getMonthEntries(period),
    getRecentEntries(8),
  ]);

  const productTotals = totalsPerProduct(entries, products);
  const residentTotals = totalsPerResident(entries, products);

  return (
    <div className="space-y-5">
      <PageHeader title="Huisturf" subtitle={`Overzicht voor ${periodLabel(period)}`}>
        <MonthPicker periods={recentPeriods()} value={period} />
      </PageHeader>

      {/* Totaal-kaarten per product */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {productTotals.map(({ product, total }) => (
          <div
            key={product.id}
            className="card flex items-center gap-4"
            style={{ backgroundColor: `${product.color}12` }}
          >
            <span className="text-5xl">{product.emoji}</span>
            <div>
              <p className="font-medium text-slate-500">
                {product.name} deze maand
              </p>
              <p
                className="text-4xl font-extrabold tabular-nums"
                style={{ color: product.color }}
              >
                {total}
              </p>
              <p className="text-xs text-slate-400">totaal geturfd</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Snel turven */}
        <section className="card">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
            ⚡ Snel turven
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Kies een bewoner en voeg snel een product toe.
          </p>
          <QuickTurf residents={residents} products={products} />
        </section>

        {/* Recente acties */}
        <section className="card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            🕒 Recente acties
          </h2>
          <RecentActions entries={recent} />
        </section>
      </div>

      {/* Persoonlijke totals per bewoner */}
      <section className="card">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          👥 Persoonlijke totals
        </h2>
        {residentTotals.length === 0 ? (
          <p className="py-4 text-center text-slate-400">
            Nog niemand heeft deze maand geturfd.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {residentTotals.map((row) => (
              <div
                key={row.resident.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2 font-medium text-slate-800">
                  <Avatar emoji={row.resident.avatar_emoji} size="sm" />
                  <span className="truncate">{row.resident.name}</span>
                </span>
                <span className="flex items-center gap-2 text-sm">
                  {products.map((p) => (
                    <span
                      key={p.id}
                      className="tabular-nums text-slate-500"
                      title={p.name}
                    >
                      {p.emoji}
                      {row.perProduct[p.id] ?? 0}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Klassement van de maand (mini) */}
      <section className="card">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          🏆 Klassement van de maand
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {products.map((product) => {
            const top = rankingForProduct(entries, product.id)[0];
            const badge = badgeForProductSlug(product.slug);
            return (
              <div
                key={product.id}
                className="rounded-2xl p-4 ring-1 ring-slate-100"
                style={{ backgroundColor: `${product.color}10` }}
              >
                <p className="mb-2 flex items-center gap-2 font-semibold text-slate-600">
                  <span>{badge?.emoji ?? product.emoji}</span>
                  Meeste {product.name.toLowerCase()}
                </p>
                {top ? (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-bold text-slate-800">
                      <span className="text-amber-500">🥇</span>
                      <Avatar emoji={top.resident.avatar_emoji} size="sm" />
                      {top.resident.name}
                    </span>
                    <span
                      className="text-xl font-extrabold tabular-nums"
                      style={{ color: product.color }}
                    >
                      {top.value}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Nog niemand</p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
