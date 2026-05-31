import { PageHeader } from "@/components/PageHeader";
import { ProfileForm } from "@/components/ProfileForm";
import { UsersManager } from "@/components/admin/UsersManager";
import { requireUser } from "@/lib/auth";
import { getAppUsers, getResidents } from "@/lib/data";
import type { AppUser } from "@/lib/types";

export default async function InstellingenPage() {
  const user = await requireUser();
  const isAdmin = user.role === "admin";

  const [users, residents] = isAdmin
    ? await Promise.all([getAppUsers(), getResidents(true)])
    : [[], []];

  return (
    <div className="space-y-5">
      <PageHeader title="Instellingen" subtitle="Beheer je profiel en de app." />

      <ProfileForm
        initialName={user.display_name ?? ""}
        email={user.email ?? ""}
        role={user.role}
      />

      {isAdmin && (
        <UsersManager users={users as AppUser[]} residents={residents} />
      )}

      <section className="card bg-slate-50 text-sm text-slate-500">
        <p>
          <strong>Huisturf</strong> — turf bier, koffie en eieren in je
          studentenhuis. Producten en prijzen beheer je bij{" "}
          <strong>Producten</strong>, bewoners bij <strong>Bewoners</strong>.
        </p>
      </section>
    </div>
  );
}
