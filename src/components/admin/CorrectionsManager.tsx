"use client";

import { useState, useTransition } from "react";
import {
  adminDeleteEntry,
  adminUpdateEntry,
} from "@/app/actions/corrections";
import { formatRelative } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import type { Product, Resident, TurfEntryDetailed } from "@/lib/types";

export function CorrectionsManager({
  entries,
  residents,
  products,
}: {
  entries: TurfEntryDetailed[];
  residents: Resident[];
  products: Product[];
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(
    null,
  );
  const [editId, setEditId] = useState<string | null>(null);
  const [eResident, setEResident] = useState("");
  const [eProduct, setEProduct] = useState("");
  const [eQty, setEQty] = useState(1);

  function run(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const res = await fn();
      setMsg(
        res.ok
          ? { type: "ok", text: res.message ?? "Gelukt." }
          : { type: "error", text: res.error ?? "Er ging iets mis." },
      );
      if (res.ok) setEditId(null);
    });
  }

  function startEdit(e: TurfEntryDetailed) {
    setEditId(e.id);
    setEResident(e.resident_id);
    setEProduct(e.product_id);
    setEQty(e.quantity);
  }

  return (
    <div className="space-y-4">
      {msg && (
        <p
          className={`rounded-xl px-3 py-2 text-sm font-medium ${
            msg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </p>
      )}

      <div className="space-y-2">
        {entries.map((e) => (
          <div key={e.id} className="card py-3">
            {editId === e.id ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[10rem] flex-1">
                  <label className="label">Bewoner</label>
                  <select
                    className="input py-1.5"
                    value={eResident}
                    onChange={(ev) => setEResident(ev.target.value)}
                  >
                    {residents.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-32">
                  <label className="label">Product</label>
                  <select
                    className="input py-1.5"
                    value={eProduct}
                    onChange={(ev) => setEProduct(ev.target.value)}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.emoji} {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-20">
                  <label className="label">Aantal</label>
                  <input
                    type="number"
                    min={1}
                    className="input py-1.5"
                    value={eQty}
                    onChange={(ev) => setEQty(Math.max(1, Number(ev.target.value)))}
                  />
                </div>
                <button
                  disabled={pending}
                  className="btn-primary py-2"
                  onClick={() =>
                    run(() =>
                      adminUpdateEntry({
                        id: e.id,
                        residentId: eResident,
                        productId: eProduct,
                        quantity: eQty,
                      }),
                    )
                  }
                >
                  Opslaan
                </button>
                <button
                  className="btn-ghost py-2"
                  onClick={() => setEditId(null)}
                >
                  Annuleer
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar emoji={e.resident?.avatar_emoji} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {e.resident?.name} · {e.product?.emoji} {e.quantity}×{" "}
                      {e.product?.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatRelative(e.occurred_at)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    onClick={() => startEdit(e)}
                  >
                    ✏️ Aanpassen
                  </button>
                  <button
                    disabled={pending}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    onClick={() => run(() => adminDeleteEntry(e.id))}
                  >
                    🗑 Verwijderen
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {entries.length === 0 && (
          <p className="py-6 text-center text-slate-400">Geen recente acties.</p>
        )}
      </div>
    </div>
  );
}
