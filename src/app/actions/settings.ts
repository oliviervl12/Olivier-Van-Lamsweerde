"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "./turf";
import type { UserRole } from "@/lib/types";

// Eigen weergavenaam aanpassen.
export async function updateMyProfile(displayName: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Niet ingelogd." };
  const name = displayName.trim();
  if (!name) return { ok: false, error: "Naam mag niet leeg zijn." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ display_name: name })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/instellingen");
  revalidatePath("/", "layout");
  return { ok: true, message: "Profiel bijgewerkt." };
}

// Admin: rol en/of gekoppelde bewoner van een gebruiker aanpassen.
export async function adminUpdateUser(input: {
  id: string;
  role?: UserRole;
  residentId?: string | null;
}): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const patch: Record<string, unknown> = {};
  if (input.role) patch.role = input.role;
  if (input.residentId !== undefined)
    patch.resident_id = input.residentId || null;

  const { error } = await admin.from("users").update(patch).eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/instellingen");
  return { ok: true, message: "Gebruiker bijgewerkt." };
}
