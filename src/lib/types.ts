// Domeintypes + een (vereenvoudigd) Database type voor de Supabase client.

export type UserRole = "bewoner" | "admin";
export type ImportStatus = "preview" | "committed" | "failed" | "reverted";
export type ImportRowStatus = "pending" | "ok" | "error" | "skipped";
export type CorrectionAction = "create" | "update" | "delete" | "undo";

export interface AppUser {
  id: string;
  email: string | null;
  display_name: string | null;
  role: UserRole;
  resident_id: string | null;
  created_at: string;
}

export interface Resident {
  id: string;
  name: string;
  active: boolean;
  avatar_emoji: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  color: string;
  price_cents: number;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface TurfEntry {
  id: string;
  resident_id: string;
  product_id: string;
  quantity: number;
  occurred_at: string;
  period_month: string;
  created_by: string | null;
  import_id: string | null;
  note: string | null;
  created_at: string;
}

export interface TurfEntryDetailed extends TurfEntry {
  resident: Pick<Resident, "id" | "name" | "avatar_emoji"> | null;
  product: Pick<Product, "id" | "name" | "emoji" | "color" | "slug"> | null;
}

export interface ImportRecord {
  id: string;
  filename: string;
  file_hash: string;
  status: ImportStatus;
  mapping: Record<string, string>;
  total_rows: number;
  success_rows: number;
  error_rows: number;
  created_by: string | null;
  created_at: string;
  committed_at: string | null;
}

export interface Correction {
  id: string;
  entry_id: string | null;
  action: CorrectionAction;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  reason: string | null;
  performed_by: string | null;
  created_at: string;
}

// Minimaal Database type zodat de Supabase client typecheckt.
// (Voor volledige typegeneratie: `supabase gen types typescript`.)
export type Database = {
  public: {
    Tables: {
      users: { Row: AppUser; Insert: Partial<AppUser>; Update: Partial<AppUser> };
      residents: {
        Row: Resident;
        Insert: Partial<Resident>;
        Update: Partial<Resident>;
      };
      products: {
        Row: Product;
        Insert: Partial<Product>;
        Update: Partial<Product>;
      };
      turf_entries: {
        Row: TurfEntry;
        Insert: Partial<TurfEntry>;
        Update: Partial<TurfEntry>;
      };
      imports: {
        Row: ImportRecord;
        Insert: Partial<ImportRecord>;
        Update: Partial<ImportRecord>;
      };
      import_rows: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      corrections: {
        Row: Correction;
        Insert: Partial<Correction>;
        Update: Partial<Correction>;
      };
      monthly_snapshots: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
