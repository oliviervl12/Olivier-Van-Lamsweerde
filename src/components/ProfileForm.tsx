"use client";

import { useState, useTransition } from "react";
import { updateMyProfile } from "@/app/actions/settings";

export function ProfileForm({
  initialName,
  email,
  role,
}: {
  initialName: string;
  email: string;
  role: string;
}) {
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(
    null,
  );

  return (
    <div className="card">
      <h2 className="mb-3 text-lg font-bold">Mijn profiel</h2>
      <div className="space-y-3">
        <div>
          <label className="label">Weergavenaam</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="label">E-mail</span>
            <p className="text-slate-700">{email}</p>
          </div>
          <div>
            <span className="label">Rol</span>
            <span className="chip bg-slate-100 capitalize text-slate-700">
              {role}
            </span>
          </div>
        </div>
        {msg && (
          <p
            className={`rounded-xl px-3 py-2 text-sm font-medium ${
              msg.type === "ok"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {msg.text}
          </p>
        )}
        <button
          disabled={pending}
          className="btn-primary"
          onClick={() =>
            startTransition(async () => {
              const r = await updateMyProfile(name);
              setMsg(
                r.ok
                  ? { type: "ok", text: r.message ?? "Opgeslagen." }
                  : { type: "error", text: r.error ?? "Mislukt." },
              );
            })
          }
        >
          Opslaan
        </button>
      </div>
    </div>
  );
}
