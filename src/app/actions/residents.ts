"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "./turf";

function revalidate() {
  revalidatePath("/bewoners");
  revalidatePath("/dashboard");
  revalidatePath("/turven");
  revalidatePath("/maandoverzicht");
  revalidatePath("/klassement");
}

export async function createResident(input: {
  name: string;
  emoji?: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Naam mag niet leeg zijn." };

  const admin = createAdminClient();
  const { error } = await admin.from("residents").insert({
    name,
    avatar_emoji: input.emoji || "🧑",
  });
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: `${name} toegevoegd.` };
}

export async function updateResident(input: {
  id: string;
  name?: string;
  emoji?: string;
  active?: boolean;
}): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) return { ok: false, error: "Naam mag niet leeg zijn." };
    patch.name = input.name.trim();
  }
  if (input.emoji !== undefined) patch.avatar_emoji = input.emoji;
  if (input.active !== undefined) patch.active = input.active;

  const { error } = await admin
    .from("residents")
    .update(patch)
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Bewoner bijgewerkt." };
}

export async function setResidentActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  return updateResident({ id, active });
}

// Verwijderen mag oude data niet kapotmaken: alleen toegestaan als de bewoner
// nog geen turf acties heeft. Anders: zet op inactief.
export async function deleteResident(id: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();

  const { count } = await admin
    .from("turf_entries")
    .select("id", { count: "exact", head: true })
    .eq("resident_id", id);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error:
        "Deze bewoner heeft turf-historie. Zet hem/haar op inactief zodat oude maandrapportages blijven kloppen.",
    };
  }

  const { error } = await admin.from("residents").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, message: "Bewoner verwijderd." };
}
