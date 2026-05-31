// Demo/preview modus: levert realistische mockdata zodat de UI volledig
// gerenderd kan worden ZONDER Supabase backend. Alleen actief als de
// environment variabele DEMO_MODE=1 is gezet. Heeft geen effect in productie.
import { currentPeriod, previousPeriod } from "@/lib/format";
import type {
  AppUser,
  Correction,
  ImportRecord,
  Product,
  Resident,
  TurfEntryDetailed,
} from "@/lib/types";

export function isDemo(): boolean {
  return process.env.DEMO_MODE === "1";
}

// Deterministische pseudo-random (zodat previews stabiel zijn).
function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export const demoProducts: Product[] = [
  { id: "p-bier", slug: "bier", name: "Bier", emoji: "🍺", color: "#f59e0b", price_cents: 90, sort_order: 1, active: true, created_at: "2026-01-01" },
  { id: "p-koffie", slug: "koffie", name: "Koffie", emoji: "☕", color: "#2563eb", price_cents: 30, sort_order: 2, active: true, created_at: "2026-01-01" },
  { id: "p-ei", slug: "ei", name: "Eieren", emoji: "🥚", color: "#16a34a", price_cents: 35, sort_order: 3, active: true, created_at: "2026-01-01" },
];

const NAMES: [string, string][] = [
  ["Tom de Vries", "🧔"], ["Lisa Jansen", "👩"], ["Bas van Dijk", "🧑"],
  ["Milan Bakker", "👨"], ["Sanne Visser", "👩‍🦰"], ["Joris Smit", "🧑‍🦱"],
  ["Femke de Boer", "👱‍♀️"], ["Daan Mulder", "👨‍🦰"], ["Eva Hendriks", "👩‍🦱"],
  ["Ruben Koster", "🧑‍🦲"], ["Noa Willems", "👧"], ["Stijn Peeters", "🧑"],
];

export const demoResidents: Resident[] = NAMES.map(([name, emoji], i) => ({
  id: `r-${i + 1}`,
  name,
  active: i !== 11, // laatste is inactief (vertrokken huisgenoot)
  avatar_emoji: emoji,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
}));

function buildEntries(period: string, seed: number): TurfEntryDetailed[] {
  const rand = rng(seed);
  const out: TurfEntryDetailed[] = [];
  const [y, m] = period.split("-").map(Number);
  let id = 0;
  demoResidents.forEach((r, i) => {
    if (!r.active) return;
    const counts: Record<string, number> = {
      "p-bier": 10 + ((i * 7 + seed) % 35),
      "p-koffie": 15 + ((i * 11 + seed) % 55),
      "p-ei": 3 + ((i * 5 + seed) % 25),
    };
    for (const product of demoProducts) {
      const n = counts[product.id];
      for (let k = 0; k < n; k++) {
        const day = 1 + Math.floor(rand() * 27);
        const hour = 8 + Math.floor(rand() * 14);
        const min = Math.floor(rand() * 60);
        const occurred = new Date(Date.UTC(y, m - 1, day, hour, min)).toISOString();
        const qty = product.id === "p-koffie" ? 1 : rand() < 0.25 ? 2 : 1;
        out.push({
          id: `e-${period}-${id++}`,
          resident_id: r.id,
          product_id: product.id,
          quantity: qty,
          occurred_at: occurred,
          period_month: period,
          created_by: "u-1",
          import_id: null,
          note: null,
          created_at: occurred,
          resident: { id: r.id, name: r.name, avatar_emoji: r.avatar_emoji },
          product: { id: product.id, name: product.name, emoji: product.emoji, color: product.color, slug: product.slug },
        });
      }
    }
  });
  return out;
}

const cur = currentPeriod();
const prev = previousPeriod(cur);
const entriesByPeriod: Record<string, TurfEntryDetailed[]> = {
  [cur]: buildEntries(cur, 13),
  [prev]: buildEntries(prev, 29),
};

export function demoMonthEntries(period: string): TurfEntryDetailed[] {
  return entriesByPeriod[period] ?? [];
}

export function demoRecentEntries(limit: number): TurfEntryDetailed[] {
  return [...(entriesByPeriod[cur] ?? [])]
    .sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at))
    .slice(0, limit);
}

export function demoLifetimeTotals(): Record<string, { actions: number; quantity: number }> {
  const out: Record<string, { actions: number; quantity: number }> = {};
  for (const p of [cur, prev]) {
    for (const e of entriesByPeriod[p]) {
      const row = out[e.resident_id] ?? { actions: 0, quantity: 0 };
      row.actions += 1;
      row.quantity += e.quantity;
      out[e.resident_id] = row;
    }
  }
  return out;
}

export const demoUser: AppUser = {
  id: "u-1",
  email: "joris@huisturf.nl",
  display_name: "Joris",
  role: "admin",
  resident_id: "r-6",
  created_at: "2026-01-01",
};

export const demoUsers: AppUser[] = [
  demoUser,
  { id: "u-2", email: "lisa@huisturf.nl", display_name: "Lisa", role: "bewoner", resident_id: "r-2", created_at: "2026-01-01" },
  { id: "u-3", email: "tom@huisturf.nl", display_name: "Tom", role: "bewoner", resident_id: "r-1", created_at: "2026-01-01" },
];

export const demoImports: ImportRecord[] = [
  { id: "i-1", filename: "turflijst-april.xlsx", file_hash: "abc123", status: "committed", mapping: {}, total_rows: 48, success_rows: 46, error_rows: 2, created_by: "u-1", created_at: new Date(Date.now() - 86400000 * 3).toISOString(), committed_at: null },
  { id: "i-2", filename: "papieren-lijst-maart.csv", file_hash: "def456", status: "committed", mapping: {}, total_rows: 31, success_rows: 31, error_rows: 0, created_by: "u-1", created_at: new Date(Date.now() - 86400000 * 12).toISOString(), committed_at: null },
];

export const demoCorrections: (Correction & { performer?: { display_name?: string; email?: string } })[] = [
  { id: "c-1", entry_id: "e-1", action: "update", old_values: null, new_values: null, reason: "Verkeerd aantal ingevoerd", performed_by: "u-1", created_at: new Date(Date.now() - 3600000 * 2).toISOString(), performer: { display_name: "Joris" } },
  { id: "c-2", entry_id: "e-2", action: "delete", old_values: null, new_values: null, reason: "Dubbel geturfd", performed_by: "u-1", created_at: new Date(Date.now() - 86400000).toISOString(), performer: { display_name: "Joris" } },
  { id: "c-3", entry_id: null, action: "undo", old_values: null, new_values: null, reason: "Ongedaan gemaakt door bewoner", performed_by: "u-2", created_at: new Date(Date.now() - 86400000 * 2).toISOString(), performer: { display_name: "Lisa" } },
];
