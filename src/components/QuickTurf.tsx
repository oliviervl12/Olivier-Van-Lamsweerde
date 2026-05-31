"use client";

import { useState, useTransition } from "react";
import { addTurf } from "@/app/actions/turf";
import type { Product, Resident } from "@/lib/types";
import { Avatar } from "./Avatar";

// Snel turven: kies bewoner, tik op een product -> direct toegevoegd (aantal 1).
export function QuickTurf({
  residents,
  products,
  defaultResidentId,
}: {
  residents: Resident[];
  products: Product[];
  defaultResidentId?: string;
}) {
  const [residentId, setResidentId] = useState(
    defaultResidentId ?? residents[0]?.id ?? "",
  );
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  function quickAdd(productId: string) {
    if (!residentId) {
      setFeedback({ type: "error", text: "Kies eerst een bewoner." });
      return;
    }
    startTransition(async () => {
      const res = await addTurf({ residentId, productId, quantity: 1 });
      setFeedback(
        res.ok
          ? { type: "ok", text: res.message ?? "Toegevoegd!" }
          : { type: "error", text: res.error ?? "Er ging iets mis." },
      );
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Bewoner</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <Avatar
              emoji={residents.find((r) => r.id === residentId)?.avatar_emoji}
              size="sm"
            />
          </span>
          <select
            className="input appearance-none pl-12 font-semibold"
            value={residentId}
            onChange={(e) => setResidentId(e.target.value)}
          >
            {residents.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {products.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={pending}
            onClick={() => quickAdd(p.id)}
            className="flex flex-col items-center gap-1.5 rounded-2xl py-5 font-bold text-slate-700 ring-1 transition active:scale-95 disabled:opacity-60"
            style={{
              backgroundColor: `${p.color}1a`,
              boxShadow: `inset 0 0 0 1px ${p.color}33`,
            }}
          >
            <span className="text-3xl">{p.emoji}</span>
            <span style={{ color: p.color }}>+ {p.name}</span>
          </button>
        ))}
      </div>

      {feedback && (
        <p
          className={`rounded-xl px-3 py-2 text-sm font-medium ${
            feedback.type === "ok"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}
