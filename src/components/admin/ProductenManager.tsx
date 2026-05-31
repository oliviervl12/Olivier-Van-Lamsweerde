"use client";

import { useState, useTransition } from "react";
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "@/app/actions/products";
import type { Product } from "@/lib/types";

export function ProductenManager({ products }: { products: Product[] }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(
    null,
  );
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🛒");
  const [color, setColor] = useState("#64748b");
  const [price, setPrice] = useState("0.00");

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

      {/* Bestaande producten */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} run={run} pending={pending} />
        ))}
      </div>

      {/* Nieuw product */}
      <div className="card">
        <h2 className="mb-3 text-lg font-bold">Nieuw product</h2>
        <p className="mb-3 text-sm text-slate-500">
          Voeg eenvoudig extra producten toe, zoals fris, wijn, snacks of
          wc-papier.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-20">
            <label className="label">Emoji</label>
            <input
              className="input text-center text-xl"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={4}
            />
          </div>
          <div className="min-w-[10rem] flex-1">
            <label className="label">Naam</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="bv. Fris"
            />
          </div>
          <div className="w-28">
            <label className="label">Prijs (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="w-16">
            <label className="label">Kleur</label>
            <input
              type="color"
              className="h-11 w-full rounded-xl border border-slate-200"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
          <button
            disabled={pending}
            onClick={() =>
              run(async () => {
                const r = await createProduct({
                  name,
                  emoji,
                  color,
                  priceCents: Math.round(parseFloat(price || "0") * 100),
                });
                if (r.ok) {
                  setName("");
                  setEmoji("🛒");
                  setPrice("0.00");
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
    </div>
  );
}

function ProductCard({
  product,
  run,
  pending,
}: {
  product: Product;
  run: (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) => void;
  pending: boolean;
}) {
  const [price, setPrice] = useState((product.price_cents / 100).toFixed(2));

  return (
    <div
      className="card"
      style={{ backgroundColor: `${product.color}10` }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-lg font-bold">
          <span className="text-2xl">{product.emoji}</span>
          {product.name}
        </span>
        <span
          className={`chip ${
            product.active
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-200 text-slate-500"
          }`}
        >
          {product.active ? "Actief" : "Inactief"}
        </span>
      </div>
      <label className="label">Prijs per stuk (€)</label>
      <div className="flex gap-2">
        <input
          type="number"
          step="0.01"
          min="0"
          className="input"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <button
          disabled={pending}
          className="btn-ghost"
          onClick={() =>
            run(() =>
              updateProduct({
                id: product.id,
                priceCents: Math.round(parseFloat(price || "0") * 100),
              }),
            )
          }
        >
          Opslaan
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          disabled={pending}
          className="btn-ghost flex-1 text-sm"
          onClick={() =>
            run(() => updateProduct({ id: product.id, active: !product.active }))
          }
        >
          {product.active ? "Op inactief" : "Activeren"}
        </button>
        <button
          disabled={pending}
          className="btn-danger text-sm"
          onClick={() => run(() => deleteProduct(product.id))}
        >
          🗑
        </button>
      </div>
    </div>
  );
}
