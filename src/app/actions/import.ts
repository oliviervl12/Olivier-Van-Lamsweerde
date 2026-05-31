"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "./turf";

// Eén rij die de client klaar heeft gezet om op te slaan.
export interface CommitRow {
  rowNumber: number;
  residentName: string;
  residentId: string | null; // null => nieuwe bewoner aanmaken (op naam)
  productSlug: string | null;
  quantity: number;
  period: string | null; // 'YYYY-MM'
  occurredAt: string | null; // ISO
  raw: Record<string, unknown>;
}

export interface CommitInput {
  filename: string;
  fileHash: string;
  mapping: Record<string, string>;
  rows: CommitRow[];
}

export interface CommitResult extends ActionResult {
  successRows?: number;
  errorRows?: number;
  errors?: { rowNumber: number; error: string }[];
}

function occurredFromRow(row: CommitRow): string | null {
  if (row.occurredAt) return row.occurredAt;
  if (row.period) return `${row.period}-15T12:00:00.000Z`; // midden van de maand
  return null;
}

export async function commitImport(input: CommitInput): Promise<CommitResult> {
  await requireAdmin();
  const admin = createAdminClient();

  // 1. Dubbele import voorkomen (zelfde bestand al eens gecommit).
  const { data: dupe } = await admin
    .from("imports")
    .select("id")
    .eq("file_hash", input.fileHash)
    .eq("status", "committed")
    .maybeSingle();
  if (dupe) {
    return {
      ok: false,
      error:
        "Dit bestand is al eerder geïmporteerd (zelfde inhoud). Import geannuleerd.",
    };
  }

  if (input.rows.length === 0) {
    return { ok: false, error: "Geen rijen om te importeren." };
  }

  // 2. Producten ophalen (slug -> id).
  const { data: products } = await admin.from("products").select("id,slug");
  const productBySlug = new Map(
    (products ?? []).map((p) => [p.slug as string, p.id as string]),
  );

  // 3. Importrecord aanmaken.
  const { data: importRec, error: impErr } = await admin
    .from("imports")
    .insert({
      filename: input.filename,
      file_hash: input.fileHash,
      status: "preview",
      mapping: input.mapping,
      total_rows: input.rows.length,
    })
    .select("id")
    .single();
  if (impErr || !importRec) {
    return { ok: false, error: impErr?.message ?? "Kon import niet aanmaken." };
  }
  const importId = importRec.id as string;

  // Cache voor nieuw aangemaakte bewoners (op genormaliseerde naam).
  const createdByName = new Map<string, string>();

  // Bestaande bewoners op naam (voor "nieuwe" namen die toch al bestaan).
  const { data: existing } = await admin
    .from("residents")
    .select("id,name");
  const existingByName = new Map(
    (existing ?? []).map((r) => [
      (r.name as string).trim().toLowerCase(),
      r.id as string,
    ]),
  );

  let success = 0;
  let errors = 0;
  const errorList: { rowNumber: number; error: string }[] = [];
  const importRowsPayload: Record<string, unknown>[] = [];

  for (const row of input.rows) {
    let error: string | null = null;
    let residentId = row.residentId;
    const productId = row.productSlug
      ? productBySlug.get(row.productSlug) ?? null
      : null;
    const occurredAt = occurredFromRow(row);

    // Validatie (geen lege regels opslaan).
    if (!row.residentName?.trim() && !residentId) error = "Geen bewoner";
    else if (!productId) error = `Onbekend product: "${row.productSlug ?? ""}"`;
    else if (!row.quantity || row.quantity <= 0)
      error = "Aantal moet groter zijn dan 0";
    else if (!occurredAt) error = "Geen geldige maand of datum";

    // Bewoner aanmaken/koppelen indien nodig.
    if (!error && !residentId) {
      const key = row.residentName.trim().toLowerCase();
      residentId =
        createdByName.get(key) ?? existingByName.get(key) ?? null;
      if (!residentId) {
        const { data: newRes, error: resErr } = await admin
          .from("residents")
          .insert({ name: row.residentName.trim() })
          .select("id")
          .single();
        if (resErr || !newRes) {
          error = `Kon bewoner niet aanmaken: ${resErr?.message ?? ""}`;
        } else {
          residentId = newRes.id as string;
          createdByName.set(key, residentId);
        }
      }
    }

    if (error || !residentId || !productId || !occurredAt) {
      errors++;
      errorList.push({ rowNumber: row.rowNumber, error: error ?? "Onbekende fout" });
      importRowsPayload.push({
        import_id: importId,
        row_number: row.rowNumber,
        raw: row.raw,
        status: "error",
        error: error ?? "Onbekende fout",
      });
      continue;
    }

    // Turf entry opslaan.
    const { error: entryErr } = await admin.from("turf_entries").insert({
      resident_id: residentId,
      product_id: productId,
      quantity: Math.round(row.quantity),
      occurred_at: occurredAt,
      import_id: importId,
    });

    if (entryErr) {
      errors++;
      errorList.push({ rowNumber: row.rowNumber, error: entryErr.message });
      importRowsPayload.push({
        import_id: importId,
        row_number: row.rowNumber,
        raw: row.raw,
        status: "error",
        error: entryErr.message,
      });
    } else {
      success++;
      importRowsPayload.push({
        import_id: importId,
        row_number: row.rowNumber,
        raw: row.raw,
        resident_id: residentId,
        product_id: productId,
        quantity: Math.round(row.quantity),
        occurred_at: occurredAt,
        status: "ok",
      });
    }
  }

  // import_rows in batch opslaan.
  if (importRowsPayload.length > 0) {
    await admin.from("import_rows").insert(importRowsPayload);
  }

  // Importrecord afronden.
  await admin
    .from("imports")
    .update({
      status: "committed",
      success_rows: success,
      error_rows: errors,
      committed_at: new Date().toISOString(),
    })
    .eq("id", importId);

  revalidatePath("/import");
  revalidatePath("/dashboard");
  revalidatePath("/maandoverzicht");
  revalidatePath("/klassement");

  return {
    ok: true,
    successRows: success,
    errorRows: errors,
    errors: errorList,
    message: `${success} regels toegevoegd${errors ? `, ${errors} fout` : ""}.`,
  };
}
