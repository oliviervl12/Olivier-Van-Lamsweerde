"use client";

import { useState, useTransition } from "react";
import { addTurf } from "@/app/actions/turf";
import type { Product, Resident } from "@/lib/types";

// Volledig turf-formulier: persoon, product, aantal (+ optioneel een datum).
export function TurfForm({
  residents,
  products,
}: {
  residents: Resident[];
  products: Product[];
}) {
  const [residentId, setResidentId] = useState(residents[0]?.id ?? "");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [useDate, setUseDate] = useState(false);
  const [date, setDate] = useState("");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  function submit() {
    startTransition(async () => {
      const res = await addTurf({
        residentId,
        productId,
        quantity,
        occurredAt:
          useDate && date ? new Date(date + "T12:00:00").toISOString() : undefined,
      });
      setFeedback(
        res.ok
          ? { type: "ok", text: res.message ?? "Toegevoegd!" }
          : { type: "error", text: res.error ?? "Er ging iets mis." },
      );
      if (res.ok) setQuantity(1);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Persoon</label>
        <select
          className="input"
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

      <div>
        <label className="label">Product</label>
        <div className="grid grid-cols-3 gap-2">
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProductId(p.id)}
              className={`flex flex-col items-center gap-1 rounded-xl py-3 text-sm font-semibold ring-1 transition ${
                productId === p.id
                  ? "ring-2 ring-slate-900"
                  : "ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className="text-2xl">{p.emoji}</span>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Aantal</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="btn-ghost h-12 w-12 text-xl"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, Math.round(Number(e.target.value) || 1)))
            }
            className="input h-12 w-20 text-center text-lg font-bold"
          />
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="btn-ghost h-12 w-12 text-xl"
          >
            +
          </button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={useDate}
          onChange={(e) => setUseDate(e.target.checked)}
          className="h-4 w-4 rounded"
        />
        Andere datum gebruiken (standaard: nu)
      </label>
      {useDate && (
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input"
        />
      )}

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

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="btn-primary w-full py-3 text-lg"
      >
        {pending ? "Bezig…" : "Toevoegen"}
      </button>
    </div>
  );
}
