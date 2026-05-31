"use client";

import { useState, useTransition } from "react";
import {
  createResident,
  deleteResident,
  setResidentActive,
  updateResident,
} from "@/app/actions/residents";
import { Avatar } from "@/components/Avatar";
import type { Resident } from "@/lib/types";

type Totals = Record<string, { actions: number; quantity: number }>;

export function BewonersManager({
  residents,
  totals,
}: {
  residents: Resident[];
  totals: Totals;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(
    null,
  );
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("🧑");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const res = await fn();
      setMsg(
        res.ok
          ? { type: "ok", text: res.message ?? "Gelukt." }
          : { type: "error", text: res.error ?? "Er ging iets mis." },
      );
    });
  }

  return (
    <div className="space-y-5">
      {msg && (
        <p
          className={`rounded-xl px-3 py-2 text-sm font-medium ${
            msg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* Nieuwe bewoner */}
      <div className="card">
        <h2 className="mb-3 text-lg font-bold">Bewoner toevoegen</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-20">
            <label className="label">Emoji</label>
            <input
              className="input text-center text-xl"
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              maxLength={4}
            />
          </div>
          <div className="min-w-[12rem] flex-1">
            <label className="label">Naam</label>
            <input
              className="input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Voornaam Achternaam"
            />
          </div>
          <button
            disabled={pending}
            onClick={() =>
              run(async () => {
                const r = await createResident({ name: newName, emoji: newEmoji });
                if (r.ok) {
                  setNewName("");
                  setNewEmoji("🧑");
                }
                return r;
              })
            }
            className="btn-primary"
          >
            Toevoegen
          </button>
        </div>
      </div>

      {/* Lijst */}
      <div className="card overflow-x-auto">
        <h2 className="mb-3 text-lg font-bold">
          Bewoners ({residents.filter((r) => r.active).length} actief)
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="pb-2 font-semibold">Bewoner</th>
              <th className="pb-2 text-right font-semibold">Acties</th>
              <th className="pb-2 text-right font-semibold">Items</th>
              <th className="pb-2 text-center font-semibold">Status</th>
              <th className="pb-2 text-right font-semibold">Beheer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {residents.map((r) => {
              const t = totals[r.id] ?? { actions: 0, quantity: 0 };
              return (
                <tr key={r.id} className={r.active ? "" : "opacity-50"}>
                  <td className="py-2.5">
                    {editId === r.id ? (
                      <input
                        className="input py-1"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    ) : (
                      <span className="flex items-center gap-2 font-medium text-slate-800">
                        <Avatar emoji={r.avatar_emoji} size="sm" />
                        {r.name}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{t.actions}</td>
                  <td className="py-2.5 text-right tabular-nums">{t.quantity}</td>
                  <td className="py-2.5 text-center">
                    <span
                      className={`chip ${
                        r.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {r.active ? "Actief" : "Inactief"}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <div className="flex justify-end gap-1.5">
                      {editId === r.id ? (
                        <>
                          <button
                            disabled={pending}
                            className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white"
                            onClick={() =>
                              run(async () => {
                                const res = await updateResident({
                                  id: r.id,
                                  name: editName,
                                });
                                if (res.ok) setEditId(null);
                                return res;
                              })
                            }
                          >
                            Opslaan
                          </button>
                          <button
                            className="rounded-lg px-2.5 py-1 text-xs text-slate-500"
                            onClick={() => setEditId(null)}
                          >
                            Annuleer
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                            onClick={() => {
                              setEditId(r.id);
                              setEditName(r.name);
                            }}
                          >
                            ✏️ Naam
                          </button>
                          <button
                            disabled={pending}
                            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                            onClick={() =>
                              run(() => setResidentActive(r.id, !r.active))
                            }
                          >
                            {r.active ? "Op inactief" : "Activeren"}
                          </button>
                          <button
                            disabled={pending}
                            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                            onClick={() => run(() => deleteResident(r.id))}
                          >
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-slate-400">
          💡 Iemand uit huis? Zet die op <strong>inactief</strong>. Verwijderen
          kan alleen bij bewoners zonder turf-historie, zodat oude
          maandrapportages blijven kloppen.
        </p>
      </div>
    </div>
  );
}
