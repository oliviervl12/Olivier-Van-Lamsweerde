// Centrale, gevalideerde toegang tot environment variabelen.
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Ontbrekende environment variabele: ${name}. ` +
        `Kopieer .env.example naar .env.local en vul je Supabase waarden in.`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: () =>
    required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: () =>
    required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  supabaseServiceRoleKey: () =>
    required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
};
