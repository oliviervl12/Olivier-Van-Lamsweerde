"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "./turf";

function revalidate() {
  revalidatePath("/correcties");
  revalidatePath("/dashboard");
  revalidatePath("/maandoverzicht");
  revalidatePath("/klassement");
}

// Admin past een turf actie aan (aantal, product, bewoner of datum).
export async function adminUpdateEntry(input: {
  id: string;
  residentId?: string;
  productId?: string;
  quantity?: number;
  occurredAt?: string;
  reason?: string;
}): Promise<ActionResult> {
  const admin_user = await requireAdmin();
  const admin = createAdminClient();

  const { data: before } = await admin
    .from("turf_entries")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();
  if (!before) return { ok: false, error: "Turf actie niet gevonden." };

  const patch: Record<string, unknown> = {};
  if (input.residentId) patch.resident_id = input.residentId;
  if (input.productId) patch.product_id = input.productId;
  if (input.quantity !== undefined) {
    if (input.quantity <= 0)
      return { ok: false, error: "Aantal moet groter zijn dan 0." };
    patch.quantity = Math.round(input.quantity);
  }
  if (input.occurredAt) patch.occurred_at = input.occurredAt;

  const { data: after, error } = await admin
    .from("turf_entries")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };

  await admin.from("corrections").insert({
    entry_id: input.id,
    action: "update",
    old_values: before,
    new_values: after,
    performed_by: admin_user.id,
    reason: input.reason ?? "Aangepast door admin",
  });

  revalidate();
  return { ok: true, message: "Turf actie aangepast." };
}

// Admin verwijdert een turf actie (met audit log).
export async function adminDeleteEntry(
  id: string,
  reason?: string,
): Promise<ActionResult> {
  const admin_user = await requireAdmin();
  const admin = createAdminClient();

  const { data: before } = await admin
    .from("turf_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!before) return { ok: false, error: "Turf actie niet gevonden." };

  const { error } = await admin.from("turf_entries").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await admin.from("corrections").insert({
    entry_id: id,
    action: "delete",
    old_values: before,
    performed_by: admin_user.id,
    reason: reason ?? "Verwijderd door admin",
  });

  revalidate();
  return { ok: true, message: "Turf actie verwijderd." };
}
