"use client";

import { useState, useTransition } from "react";
import { adminUpdateUser } from "@/app/actions/settings";
import type { AppUser, Resident, UserRole } from "@/lib/types";

export function UsersManager({
  users,
  residents,
}: {
  users: AppUser[];
  residents: Resident[];
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function update(id: string, patch: { role?: UserRole; residentId?: string | null }) {
    startTransition(async () => {
      const r = await adminUpdateUser({ id, ...patch });
      setMsg(r.ok ? r.message ?? "Opgeslagen." : r.error ?? "Mislukt.");
    });
  }

  return (
    <div className="card overflow-x-auto">
      <h2 className="mb-1 text-lg font-bold">Gebruikers & rollen</h2>
      <p className="mb-3 text-sm text-slate-500">
        Geef huisgenoten admin-rechten of koppel hun login aan een bewoner.
      </p>
      {msg && (
        <p className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {msg}
        </p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="pb-2 font-semibold">Gebruiker</th>
            <th className="pb-2 font-semibold">Rol</th>
            <th className="pb-2 font-semibold">Gekoppelde bewoner</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((u) => (
            <tr key={u.id}>
              <td className="py-2.5">
                <p className="font-medium text-slate-800">
                  {u.display_name ?? "—"}
                </p>
                <p className="text-xs text-slate-400">{u.email}</p>
              </td>
              <td className="py-2.5">
                <select
                  className="input w-auto py-1.5"
                  value={u.role}
                  disabled={pending}
                  onChange={(e) => update(u.id, { role: e.target.value as UserRole })}
                >
                  <option value="bewoner">bewoner</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td className="py-2.5">
                <select
                  className="input w-auto py-1.5"
                  value={u.resident_id ?? ""}
                  disabled={pending}
                  onChange={(e) =>
                    update(u.id, { residentId: e.target.value || null })
                  }
                >
                  <option value="">— geen —</option>
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
