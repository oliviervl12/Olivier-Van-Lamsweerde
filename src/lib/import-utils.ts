// Pure helpers voor de Excel/CSV import: kolomherkenning, normalisatie en
// het omzetten van ruwe rijen naar genormaliseerde turf-regels.

// De velden waaraan een kolom gekoppeld kan worden.
export type FieldKey =
  | "resident" // naam / persoon / bewoner
  | "product" // product / item (waarde = productnaam)
  | "quantity" // aantal
  | "month" // maand (YYYY-MM of "mei 2026")
  | "date" // datum
  | "ignore"
  | `product:${string}`; // brede kolom: kolomkop IS het product (bv. "Bier")

export const FIELD_LABELS: Record<string, string> = {
  resident: "Bewoner / naam",
  product: "Product (waarde)",
  quantity: "Aantal",
  month: "Maand",
  date: "Datum",
  ignore: "Negeren",
};

// Bekende product-aliassen -> canonieke slug.
const PRODUCT_ALIASES: Record<string, string> = {
  bier: "bier",
  bieren: "bier",
  pils: "bier",
  biertje: "bier",
  beer: "bier",
  koffie: "koffie",
  koffies: "koffie",
  coffee: "koffie",
  kof: "koffie",
  ei: "ei",
  ei_: "ei",
  eieren: "ei",
  eitje: "ei",
  eitjes: "ei",
  egg: "ei",
  eggs: "ei",
};

const RESIDENT_HEADERS = ["naam", "persoon", "bewoner", "naam bewoner", "name", "huisgenoot"];
const QUANTITY_HEADERS = ["aantal", "qty", "quantity", "amount", "stuks", "x"];
const PRODUCT_HEADERS = ["product", "item", "drankje", "soort"];
const MONTH_HEADERS = ["maand", "month", "periode"];
const DATE_HEADERS = ["datum", "date", "dag", "tijd", "tijdstip", "wanneer"];

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// Map een willekeurige productaanduiding naar een canonieke slug (of null).
export function normalizeProductSlug(value: string): string | null {
  const key = norm(value).replace(/[^a-z]/g, "");
  return PRODUCT_ALIASES[key] ?? PRODUCT_ALIASES[norm(value)] ?? null;
}

// Detecteer automatisch per kolom welk veld het waarschijnlijk is.
export function detectMapping(headers: string[]): Record<string, FieldKey> {
  const mapping: Record<string, FieldKey> = {};
  for (const h of headers) {
    const n = norm(h);
    if (RESIDENT_HEADERS.includes(n)) mapping[h] = "resident";
    else if (QUANTITY_HEADERS.includes(n)) mapping[h] = "quantity";
    else if (PRODUCT_HEADERS.includes(n)) mapping[h] = "product";
    else if (MONTH_HEADERS.includes(n)) mapping[h] = "month";
    else if (DATE_HEADERS.includes(n)) mapping[h] = "date";
    else if (normalizeProductSlug(h)) mapping[h] = `product:${normalizeProductSlug(h)}`;
    else mapping[h] = "ignore";
  }
  return mapping;
}

// Parse een maand-aanduiding naar 'YYYY-MM'. Ondersteunt o.a.
// "2026-05", "05-2026", "mei 2026", "mei", "5/2026".
const MONTHS_NL: Record<string, number> = {
  januari: 1, jan: 1, februari: 2, feb: 2, maart: 3, mrt: 3, april: 4, apr: 4,
  mei: 5, juni: 6, jun: 6, juli: 7, jul: 7, augustus: 8, aug: 8,
  september: 9, sep: 9, sept: 9, oktober: 10, okt: 10, november: 11, nov: 11,
  december: 12, dec: 12,
};

export function parseMonth(value: string, fallbackYear?: number): string | null {
  if (!value) return null;
  const v = norm(value);

  // 2026-05 of 2026/05
  let m = v.match(/^(\d{4})[-/](\d{1,2})$/);
  if (m) return `${m[1]}-${String(Number(m[2])).padStart(2, "0")}`;

  // 05-2026 of 5/2026
  m = v.match(/^(\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[2]}-${String(Number(m[1])).padStart(2, "0")}`;

  // "mei 2026" of "mei"
  m = v.match(/^([a-z]+)\.?\s*(\d{4})?$/);
  if (m && MONTHS_NL[m[1]]) {
    const year = m[2] ? Number(m[2]) : fallbackYear ?? new Date().getFullYear();
    return `${year}-${String(MONTHS_NL[m[1]]).padStart(2, "0")}`;
  }

  return null;
}

// Parse een datum naar ISO. Ondersteunt o.a. "2026-05-21", "21-05-2026",
// "21/05/2026" en Excel-datumstrings.
export function parseDate(value: string): string | null {
  if (!value) return null;
  const v = value.trim();

  // ISO
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  // DD-MM-YYYY of DD/MM/YYYY
  m = v.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Een genormaliseerde regel klaar voor matching/opslag.
export interface NormalizedRow {
  rowNumber: number;
  residentName: string;
  productSlug: string | null;
  productRaw: string;
  quantity: number;
  period: string | null; // 'YYYY-MM'
  occurredAt: string | null; // ISO
  raw: Record<string, unknown>;
  error?: string;
}

// Zet ruwe data (array of objects) + mapping om naar genormaliseerde regels.
// Brede kolommen (product:slug) worden uitgeklapt naar meerdere regels.
export function normalizeRows(
  rows: Record<string, unknown>[],
  mapping: Record<string, FieldKey>,
): NormalizedRow[] {
  const out: NormalizedRow[] = [];
  const entries = Object.entries(mapping);

  const residentCol = entries.find(([, f]) => f === "resident")?.[0];
  const quantityCol = entries.find(([, f]) => f === "quantity")?.[0];
  const productCol = entries.find(([, f]) => f === "product")?.[0];
  const monthCol = entries.find(([, f]) => f === "month")?.[0];
  const dateCol = entries.find(([, f]) => f === "date")?.[0];
  const wideCols = entries.filter(([, f]) => f.startsWith("product:")) as [
    string,
    `product:${string}`,
  ][];

  let counter = 0;
  for (const raw of rows) {
    counter++;
    const residentName = residentCol ? String(raw[residentCol] ?? "").trim() : "";

    const dateStr = dateCol ? String(raw[dateCol] ?? "") : "";
    const monthStr = monthCol ? String(raw[monthCol] ?? "") : "";
    const occurredAt = dateStr ? parseDate(dateStr) : null;
    const period =
      parseMonth(monthStr) ??
      (occurredAt ? occurredAt.slice(0, 7) : null);

    if (wideCols.length > 0) {
      // Breed formaat: één rij -> meerdere regels (per productkolom).
      for (const [col, field] of wideCols) {
        const slug = field.split(":")[1];
        const qty = Number(String(raw[col] ?? "").replace(",", "."));
        if (!qty || qty <= 0) continue; // lege/0 cellen overslaan
        out.push({
          rowNumber: counter,
          residentName,
          productSlug: slug,
          productRaw: col,
          quantity: Math.round(qty),
          period,
          occurredAt,
          raw,
        });
      }
    } else {
      // Lang formaat: één regel per rij.
      const productRaw = productCol ? String(raw[productCol] ?? "").trim() : "";
      const qty = quantityCol
        ? Number(String(raw[quantityCol] ?? "").replace(",", "."))
        : 1;
      out.push({
        rowNumber: counter,
        residentName,
        productSlug: normalizeProductSlug(productRaw),
        productRaw,
        quantity: Number.isFinite(qty) ? Math.round(qty) : 0,
        period,
        occurredAt,
        raw,
      });
    }
  }
  return out;
}

// Valideer een genormaliseerde regel. Retourneert een foutmelding of null.
export function validateRow(row: NormalizedRow): string | null {
  if (!row.residentName) return "Geen naam/bewoner gevonden";
  if (!row.productSlug) return `Onbekend product: "${row.productRaw}"`;
  if (!row.quantity || row.quantity <= 0) return "Aantal moet groter zijn dan 0";
  if (!row.period && !row.occurredAt) return "Geen maand of datum gevonden";
  return null;
}
