import { PageHeader } from "@/components/PageHeader";
import { BewonersManager } from "@/components/admin/BewonersManager";
import { requireAdmin } from "@/lib/auth";
import { getResidentLifetimeTotals, getResidents } from "@/lib/data";

export default async function BewonersPage() {
  await requireAdmin();
  const [residents, totals] = await Promise.all([
    getResidents(true),
    getResidentLifetimeTotals(),
  ]);

  return (
    <div>
      <PageHeader
        title="Bewoners"
        subtitle="Beheer huisgenoten. Vertrokken? Op inactief zetten."
      />
      <BewonersManager residents={residents} totals={totals} />
    </div>
  );
}
