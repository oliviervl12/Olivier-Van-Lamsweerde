import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Service-role client. Omzeilt RLS. ALLEEN server-side gebruiken voor
// admin acties (bewoners-accounts aanmaken, imports committen, correcties).
// NOOIT importeren in een Client Component.
export function createAdminClient() {
  return createClient(
    env.supabaseUrl(),
    env.supabaseServiceRoleKey(),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
