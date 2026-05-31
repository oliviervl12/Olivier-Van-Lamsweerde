"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "./turf";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function revalidate() {
  revalidatePath("/producten");
  revalidatePath("/dashboard");
  revalidatePath("/turven");
  revalidatePath("/maandoverzicht");
}

// Nieuw product toevoegen (bv. fris, wijn, snacks, wc-papier).
export async function createProduct(input: {
  name: string;
  emoji: string;
  color: string;
  priceCents: number;
}): Promise<ActionResult> {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Naam mag niet leeg zijn." };

  const admin = createAdminClient();
  const { count } = await admin
    .from("products")
    .select("id", { count: "exact", head: true });

  const { error } = await admin.from("products").insert({
    name,
    slug: slugify(name) || `product-${Date.now()}`,
    emoji: input.emoji || "🛒",
    color: input.color || "#64748b",
    price_cents: Math.max(0, Math.round(input.priceCents)),
    sort_order: (count ?? 0) + 1,
  });
  if (error) {
    if (error.code === "23505")
      return { ok: false, error: "Er bestaat al een product met deze naam." };
    return { ok: false, error: error.message };
  }
  revalidate();
  return { ok: true, message: `${name} toegevoegd.` };
}

export async function updateProduct(input: {
  id: string;
  name?: string;
  emoji?: string;
  color?: string;
  priceCents?: number;
  active?: boolean;
}): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.emoji !== undefined) patch.emoji = input.emoji;
  if (input.color !== undefined) patch.color = input.color;
  if (input.priceCents !== undefined)
    patch.price_cents = Math.max(0, Math.round(input.priceCents));
  if (input.active !== undefined) patch.active = input.active;

  const { error } = await admin.from("products").update(patch).eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Product bijgewerkt." };
}

// Verwijderen is niet toegestaan als er turf-historie is -> op inactief zetten.
export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { count } = await admin
    .from("turf_entries")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error:
        "Dit product heeft turf-historie. Zet het op inactief in plaats van te verwijderen.",
    };
  }
  const { error } = await admin.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Product verwijderd." };
}
