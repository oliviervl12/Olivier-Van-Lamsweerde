import { PageHeader } from "@/components/PageHeader";
import { QuickTurf } from "@/components/QuickTurf";
import { TurfForm } from "@/components/TurfForm";
import { UndoableRecent } from "@/components/UndoableRecent";
import { getProducts, getRecentEntries, getResidents } from "@/lib/data";
import { requireUser } from "@/lib/auth";

export default async function TurvenPage() {
  const [user, products, residents, recent] = await Promise.all([
    requireUser(),
    getProducts(),
    getResidents(),
    getRecentEntries(10),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Snel turven"
        subtitle="Tik op een product om direct te turven, of gebruik het volledige formulier."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
            ⚡ Snelle modus
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Kies een bewoner en tik op + bier, + koffie of + ei.
          </p>
          <QuickTurf residents={residents} products={products} />
        </section>

        <section className="card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            🧾 Volledig turven
          </h2>
          <TurfForm residents={residents} products={products} />
        </section>
      </div>

      <section className="card">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
          🕒 Recente acties
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Je kunt je eigen actie binnen 5 minuten ongedaan maken.
        </p>
        <UndoableRecent
          entries={recent}
          currentUserId={user.id}
          isAdmin={user.role === "admin"}
        />
      </section>
    </div>
  );
}
