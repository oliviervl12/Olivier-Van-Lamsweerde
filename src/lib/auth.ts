import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/lib/types";

// Haalt de ingelogde gebruiker + zijn profiel (rol) op.
// Retourneert null als er geen sessie is.
export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) return profile as AppUser;

  // Fallback als het profiel (nog) niet bestaat.
  return {
    id: user.id,
    email: user.email ?? null,
    display_name: user.email?.split("@")[0] ?? null,
    role: "bewoner",
    resident_id: null,
    created_at: user.created_at ?? new Date().toISOString(),
  };
}

// Vereist een ingelogde gebruiker, anders redirect naar /login.
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Vereist een admin, anders redirect naar het dashboard.
export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
