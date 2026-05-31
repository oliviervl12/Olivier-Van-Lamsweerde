"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export interface ActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/turven");
  revalidatePath("/maandoverzicht");
  revalidatePath("/klassement");
  revalidatePath("/correcties");
}

// Een turf actie toevoegen (snel turven of via het volledige formulier).
export async function addTurf(input: {
  residentId: string;
  productId: string;
  quantity?: number;
  occurredAt?: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Niet ingelogd." };

  const quantity = Math.round(input.quantity ?? 1);

  // Validatie
  if (!input.residentId) return { ok: false, error: "Kies een bewoner." };
  if (!input.productId) return { ok: false, error: "Kies een product." };
  if (!quantity || quantity <= 0)
    return { ok: false, error: "Aantal moet groter zijn dan 0." };

  const supabase = await createClient();

  // Bestaan bewoner en product (en is bewoner actief)?
  const [{ data: resident }, { data: product }] = await Promise.all([
    supabase
      .from("residents")
      .select("id,name,active")
      .eq("id", input.residentId)
      .maybeSingle(),
    supabase
      .from("products")
      .select("id,name,active")
      .eq("id", input.productId)
      .maybeSingle(),
  ]);

  if (!resident) return { ok: false, error: "Bewoner bestaat niet." };
  if (!resident.active)
    return { ok: false, error: "Deze bewoner is op inactief gezet." };
  if (!product) return { ok: false, error: "Product bestaat niet." };

  const { error } = await supabase.from("turf_entries").insert({
    resident_id: input.residentId,
    product_id: input.productId,
    quantity,
    created_by: user.id,
    occurred_at: input.occurredAt ?? new Date().toISOString(),
  });

  if (error) return { ok: false, error: error.message };

  revalidateAll();
  return {
    ok: true,
    message: `${quantity}× ${product.name} voor ${resident.name} geturfd.`,
  };
}

// Eigen laatste actie ongedaan maken (binnen 5 min) of admin verwijdert.
// RLS handhaaft de 5-minuten-regel; we loggen de correctie.
export async function undoEntry(entryId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Niet ingelogd." };

  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("turf_entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle();

  if (!entry) return { ok: false, error: "Turf actie niet gevonden." };

  const { error } = await supabase
    .from("turf_entries")
    .delete()
    .eq("id", entryId);

  if (error) {
    return {
      ok: false,
      error:
        "Verwijderen niet toegestaan. Je kunt alleen je eigen actie binnen 5 minuten ongedaan maken.",
    };
  }

  await supabase.from("corrections").insert({
    entry_id: entryId,
    action: "undo",
    old_values: entry,
    performed_by: user.id,
    reason: "Ongedaan gemaakt door bewoner/admin",
  });

  revalidateAll();
  return { ok: true, message: "Turf actie ongedaan gemaakt." };
}
