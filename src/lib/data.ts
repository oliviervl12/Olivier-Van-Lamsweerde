// Data-access laag: aggregaties voor dashboard, maandoverzicht en klassement.
// Aggregatie gebeurt in JS (volume van een studentenhuis is klein).
import { createClient } from "@/lib/supabase/server";
import { previousPeriod } from "@/lib/format";
import type {
  Product,
  Resident,
  TurfEntryDetailed,
} from "@/lib/types";

export async function getProducts(includeInactive = false): Promise<Product[]> {
  const supabase = await createClient();
  let q = supabase.from("products").select("*").order("sort_order");
  if (!includeInactive) q = q.eq("active", true);
  const { data } = await q;
  return (data ?? []) as Product[];
}

export async function getResidents(
  includeInactive = false,
): Promise<Resident[]> {
  const supabase = await createClient();
  let q = supabase.from("residents").select("*").order("name");
  if (!includeInactive) q = q.eq("active", true);
  const { data } = await q;
  return (data ?? []) as Resident[];
}

export async function getMonthEntries(
  period: string,
): Promise<TurfEntryDetailed[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("turf_entries")
    .select(
      `*,
       resident:residents(id,name,avatar_emoji),
       product:products(id,name,emoji,color,slug)`,
    )
    .eq("period_month", period)
    .order("occurred_at", { ascending: false });
  return (data ?? []) as unknown as TurfEntryDetailed[];
}

export async function getRecentEntries(
  limit = 10,
): Promise<TurfEntryDetailed[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("turf_entries")
    .select(
      `*,
       resident:residents(id,name,avatar_emoji),
       product:products(id,name,emoji,color,slug)`,
    )
    .order("occurred_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as TurfEntryDetailed[];
}

// Levenslange turf-totalen per bewoner (voor de bewonerspagina).
export async function getResidentLifetimeTotals(): Promise<
  Record<string, { actions: number; quantity: number }>
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("turf_entries")
    .select("resident_id,quantity");
  const out: Record<string, { actions: number; quantity: number }> = {};
  for (const e of (data ?? []) as { resident_id: string; quantity: number }[]) {
    const row = out[e.resident_id] ?? { actions: 0, quantity: 0 };
    row.actions += 1;
    row.quantity += e.quantity;
    out[e.resident_id] = row;
  }
  return out;
}

// Alle app-gebruikers (alleen leesbaar voor admin via RLS).
export async function getAppUsers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("*")
    .order("created_at");
  return data ?? [];
}

// Import-historie.
export async function getImports() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("imports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

// Audit log (correcties) met naam van de uitvoerder.
export async function getCorrections() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("corrections")
    .select("*, performer:users(display_name,email)")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

// -- Aggregatie helpers -------------------------------------------------------

export interface ProductTotal {
  product: Product;
  total: number;
}

export interface ResidentTotals {
  resident: Pick<Resident, "id" | "name" | "avatar_emoji">;
  perProduct: Record<string, number>; // productId -> aantal
  total: number;
  costCents: number;
}

export function totalsPerProduct(
  entries: TurfEntryDetailed[],
  products: Product[],
): ProductTotal[] {
  return products.map((product) => ({
    product,
    total: entries
      .filter((e) => e.product_id === product.id)
      .reduce((s, e) => s + e.quantity, 0),
  }));
}

export function totalsPerResident(
  entries: TurfEntryDetailed[],
  products: Product[],
): ResidentTotals[] {
  const priceById = new Map(products.map((p) => [p.id, p.price_cents]));
  const byResident = new Map<string, ResidentTotals>();

  for (const e of entries) {
    if (!e.resident) continue;
    let row = byResident.get(e.resident.id);
    if (!row) {
      row = {
        resident: e.resident,
        perProduct: {},
        total: 0,
        costCents: 0,
      };
      byResident.set(e.resident.id, row);
    }
    row.perProduct[e.product_id] =
      (row.perProduct[e.product_id] ?? 0) + e.quantity;
    row.total += e.quantity;
    row.costCents += e.quantity * (priceById.get(e.product_id) ?? 0);
  }

  return [...byResident.values()].sort((a, b) => b.total - a.total);
}

export interface RankRow {
  resident: Pick<Resident, "id" | "name" | "avatar_emoji">;
  value: number;
}

// Ranking per product (op aantal), aflopend.
export function rankingForProduct(
  entries: TurfEntryDetailed[],
  productId: string,
): RankRow[] {
  const map = new Map<string, RankRow>();
  for (const e of entries) {
    if (e.product_id !== productId || !e.resident) continue;
    const row = map.get(e.resident.id) ?? { resident: e.resident, value: 0 };
    row.value += e.quantity;
    map.set(e.resident.id, row);
  }
  return [...map.values()]
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
}

// Totaal aantal turf-acties (regels, niet aantallen) per bewoner.
export function actionCountPerResident(
  entries: TurfEntryDetailed[],
): RankRow[] {
  const map = new Map<string, RankRow>();
  for (const e of entries) {
    if (!e.resident) continue;
    const row = map.get(e.resident.id) ?? { resident: e.resident, value: 0 };
    row.value += 1;
    map.set(e.resident.id, row);
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
}

// Totaal aantal getapte/gegeten items per bewoner.
export function quantityPerResident(entries: TurfEntryDetailed[]): RankRow[] {
  const map = new Map<string, RankRow>();
  for (const e of entries) {
    if (!e.resident) continue;
    const row = map.get(e.resident.id) ?? { resident: e.resident, value: 0 };
    row.value += e.quantity;
    map.set(e.resident.id, row);
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
}

// Grootste stijger: vergelijk totaal aantal items deze maand vs vorige maand.
export async function biggestRiser(
  period: string,
): Promise<{ resident: RankRow["resident"]; delta: number } | null> {
  const prev = previousPeriod(period);
  const [cur, before] = await Promise.all([
    getMonthEntries(period),
    getMonthEntries(prev),
  ]);

  const sum = (entries: TurfEntryDetailed[]) => {
    const m = new Map<
      string,
      { resident: RankRow["resident"]; value: number }
    >();
    for (const e of entries) {
      if (!e.resident) continue;
      const row = m.get(e.resident.id) ?? { resident: e.resident, value: 0 };
      row.value += e.quantity;
      m.set(e.resident.id, row);
    }
    return m;
  };

  const curMap = sum(cur);
  const beforeMap = sum(before);

  let best: { resident: RankRow["resident"]; delta: number } | null = null;
  for (const [id, row] of curMap) {
    const prevVal = beforeMap.get(id)?.value ?? 0;
    const delta = row.value - prevVal;
    if (delta > 0 && (!best || delta > best.delta)) {
      best = { resident: row.resident, delta };
    }
  }
  return best;
}
