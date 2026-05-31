import { PageHeader } from "@/components/PageHeader";
import { MonthPicker } from "@/components/MonthPicker";
import { Avatar } from "@/components/Avatar";
import { currentPeriod, periodLabel, recentPeriods } from "@/lib/format";
import { BADGES, badgeForProductSlug } from "@/lib/badges";
import {
  actionCountPerResident,
  biggestRiser,
  getMonthEntries,
  getProducts,
  quantityPerResident,
  rankingForProduct,
  type RankRow,
} from "@/lib/data";

const MEDALS = ["🥇", "🥈", "🥉"];

function RankingList({
  rows,
  color,
  unit,
}: {
  rows: RankRow[];
  color: string;
  unit?: string;
}) {
  if (rows.length === 0)
    return <p className="py-4 text-center text-sm text-slate-400">Nog niemand</p>;
  return (
    <ol className="space-y-1.5">
      {rows.slice(0, 5).map((r, i) => (
        <li
          key={r.resident.id}
          className={`flex items-center justify-between rounded-xl px-3 py-2 ${
            i === 0 ? "ring-1 ring-amber-200" : ""
          }`}
          style={i === 0 ? { backgroundColor: `${color}12` } : undefined}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="w-6 text-center">{MEDALS[i] ?? `${i + 1}.`}</span>
            <Avatar emoji={r.resident.avatar_emoji} size="sm" />
            <span className="truncate font-medium text-slate-800">
              {r.resident.name}
            </span>
          </span>
          <span
            className="shrink-0 font-extrabold tabular-nums"
            style={{ color }}
          >
            {r.value}
            {unit ? <span className="ml-1 text-xs font-medium">{unit}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

function BadgeCard({
  badgeKey,
  winner,
  detail,
}: {
  badgeKey: keyof typeof BADGES;
  winner?: RankRow["resident"];
  detail: string;
}) {
  const badge = BADGES[badgeKey];
  return (
    <div className="card flex items-center gap-3 bg-gradient-to-br from-white to-slate-50">
      <span className="text-4xl">{badge.emoji}</span>
      <div className="min-w-0">
        <p className="font-bold text-slate-900">{badge.label}</p>
        {winner ? (
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Avatar emoji={winner.avatar_emoji} size="sm" /> {winner.name}
          </p>
        ) : (
          <p className="text-sm text-slate-400">Nog niet vergeven</p>
        )}
        <p className="text-xs text-slate-400">{detail}</p>
      </div>
    </div>
  );
}

export default async function KlassementPage({
  searchParams,
}: {
  searchParams: Promise<{ maand?: string }>;
}) {
  const { maand } = await searchParams;
  const period = maand ?? currentPeriod();

  const [products, entries, riser] = await Promise.all([
    getProducts(),
    getMonthEntries(period),
    biggestRiser(period),
  ]);

  const actions = actionCountPerResident(entries);
  const quantities = quantityPerResident(entries);

  const mostActive = actions[0];
  const legend = quantities[0]; // hoogste totaalscore = huislegende

  return (
    <div className="space-y-5">
      <PageHeader
        title="🏆 Klassement"
        subtitle={`Wie is de baas in ${periodLabel(period)}?`}
      >
        <MonthPicker periods={recentPeriods()} value={period} />
      </PageHeader>

      {/* Badges / ere-galerij */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => {
          const badge = badgeForProductSlug(p.slug);
          const top = rankingForProduct(entries, p.id)[0];
          if (!badge) return null;
          return (
            <BadgeCard
              key={p.id}
              badgeKey={badge.key as keyof typeof BADGES}
              winner={top?.resident}
              detail={top ? `${top.value}× ${p.name.toLowerCase()}` : badge.description}
            />
          );
        })}
        <BadgeCard
          badgeKey="alleskunner"
          winner={mostActive?.resident}
          detail={
            mostActive ? `${mostActive.value} turf acties` : BADGES.alleskunner.description
          }
        />
        <BadgeCard
          badgeKey="comeback"
          winner={riser?.resident}
          detail={riser ? `+${riser.delta} t.o.v. vorige maand` : BADGES.comeback.description}
        />
        <BadgeCard
          badgeKey="huislegende"
          winner={legend?.resident}
          detail={
            legend ? `${legend.value} items totaal` : BADGES.huislegende.description
          }
        />
      </div>

      {/* Rankings per product */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {products.map((p) => {
          const badge = badgeForProductSlug(p.slug);
          return (
            <section key={p.id} className="card">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                <span>{p.emoji}</span>
                Meeste {p.name.toLowerCase()}
                {badge && (
                  <span className="ml-auto text-xl" title={badge.label}>
                    {badge.emoji}
                  </span>
                )}
              </h2>
              <RankingList
                rows={rankingForProduct(entries, p.id)}
                color={p.color}
              />
            </section>
          );
        })}
      </div>

      {/* Overall klassement */}
      <section className="card">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          📊 Overall klassement — meest actieve bewoners
        </h2>
        <RankingList rows={actions} color="#0f172a" unit="acties" />
      </section>
    </div>
  );
}
