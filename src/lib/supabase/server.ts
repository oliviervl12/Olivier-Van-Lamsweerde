import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

// Supabase client voor Server Components en Server Actions.
// Leest/schrijft de auth sessie via cookies, met respect voor RLS.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.supabaseUrl(),
    env.supabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Aangeroepen vanuit een Server Component zonder schrijfrechten op
            // cookies. Dit kan genegeerd worden als er middleware draait die
            // de sessie ververst.
          }
        },
      },
    },
  );
}
