"use client";

import { useMemo, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import {
  detectMapping,
  normalizeRows,
  validateRow,
  FIELD_LABELS,
  type FieldKey,
  type NormalizedRow,
} from "@/lib/import-utils";
import { commitImport, type CommitRow, type CommitResult } from "@/app/actions/import";
import type { Product, Resident } from "@/lib/types";

async function sha256(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function nameKey(s: string) {
  return s.trim().toLowerCase();
}

export function ImportWizard({
  residents,
  products,
}: {
  residents: Resident[];
  products: Product[];
}) {
  const [filename, setFilename] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<string, FieldKey>>({});
  // resolutie per onbekende naam: 'new' (aanmaken) of een resident id (koppelen)
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const residentByName = useMemo(
    () => new Map(residents.map((r) => [nameKey(r.name), r.id])),
    [residents],
  );

  // -- Bestand inlezen --------------------------------------------------------
  async function onFile(file: File) {
    setError(null);
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const hash = await sha256(buf);
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: "",
        raw: false,
      });
      if (json.length === 0) {
        setError("Het bestand bevat geen rijen.");
        return;
      }
      const hdrs = Object.keys(json[0]);
      setFilename(file.name);
      setFileHash(hash);
      setHeaders(hdrs);
      setRows(json);
      setMapping(detectMapping(hdrs));
      setResolutions({});
    } catch (e) {
      setError("Kon het bestand niet lezen. Is het een geldig Excel/CSV bestand?");
    }
  }

  // -- Genormaliseerde regels -------------------------------------------------
  const normalized: NormalizedRow[] = useMemo(() => {
    if (rows.length === 0) return [];
    return normalizeRows(rows, mapping)
      .map((r) => ({ ...r, error: validateRow(r) ?? undefined }))
      // volledig lege regels niet meenemen
      .filter((r) => r.residentName || r.productSlug || r.quantity);
  }, [rows, mapping]);

  // Onbekende namen (niet gevonden onder bestaande bewoners).
  const unknownNames = useMemo(() => {
    const set = new Set<string>();
    for (const r of normalized) {
      if (r.residentName && !residentByName.has(nameKey(r.residentName))) {
        set.add(r.residentName.trim());
      }
    }
    return [...set];
  }, [normalized, residentByName]);

  const validCount = normalized.filter((r) => !r.error).length;
  const errorCount = normalized.length - validCount;

  const fieldOptions: { value: FieldKey; label: string }[] = [
    { value: "resident", label: FIELD_LABELS.resident },
    { value: "product", label: FIELD_LABELS.product },
    { value: "quantity", label: FIELD_LABELS.quantity },
    { value: "month", label: FIELD_LABELS.month },
    { value: "date", label: FIELD_LABELS.date },
    ...products.map((p) => ({
      value: `product:${p.slug}` as FieldKey,
      label: `Kolom = ${p.name} (aantal)`,
    })),
    { value: "ignore", label: FIELD_LABELS.ignore },
  ];

  // -- Commit -----------------------------------------------------------------
  function commit() {
    setError(null);
    const commitRows: CommitRow[] = normalized
      .filter((r) => !r.error)
      .map((r) => {
        const key = nameKey(r.residentName);
        let residentId: string | null = residentByName.get(key) ?? null;
        if (!residentId) {
          const res = resolutions[r.residentName.trim()];
          if (res && res !== "new") residentId = res; // koppelen aan bestaande
          // 'new' of niet ingevuld => null => server maakt aan
        }
        return {
          rowNumber: r.rowNumber,
          residentName: r.residentName,
          residentId,
          productSlug: r.productSlug,
          quantity: r.quantity,
          period: r.period,
          occurredAt: r.occurredAt,
          raw: r.raw,
        };
      });

    if (commitRows.length === 0) {
      setError("Geen geldige regels om te importeren.");
      return;
    }

    startTransition(async () => {
      const res = await commitImport({
        filename,
        fileHash,
        mapping,
        rows: commitRows,
      });
      setResult(res);
      if (!res.ok) setError(res.error ?? "Import mislukt.");
      if (res.ok) {
        // reset bestand-state na succes
        setRows([]);
        setHeaders([]);
        setFilename("");
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* 1. Upload */}
      <div className="card">
        <h2 className="mb-1 text-lg font-bold">1. Upload bestand</h2>
        <p className="mb-3 text-sm text-slate-500">
          Excel (.xlsx, .xls) of CSV. De eerste rij moet kolomkoppen bevatten.
        </p>
        <input
          type="file"
          accept=".csv,.xlsx,.xls,text/csv"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          className="block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-slate-800"
        />
        {filename && (
          <p className="mt-2 text-sm text-slate-500">
            📄 {filename} · {rows.length} rijen
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 font-medium text-red-700">
          {error}
        </p>
      )}

      {result?.ok && (
        <div className="card bg-emerald-50">
          <p className="font-bold text-emerald-800">
            ✅ {result.successRows} regels toegevoegd
            {result.errorRows ? `, ${result.errorRows} fout` : ""}.
          </p>
          {result.errors && result.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-red-700">
              {result.errors.slice(0, 20).map((e) => (
                <li key={e.rowNumber}>
                  Rij {e.rowNumber}: {e.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {headers.length > 0 && (
        <>
          {/* 2. Kolommen koppelen */}
          <div className="card">
            <h2 className="mb-1 text-lg font-bold">2. Kolommen koppelen</h2>
            <p className="mb-3 text-sm text-slate-500">
              We hebben de structuur automatisch herkend. Pas aan waar nodig.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {headers.map((h) => (
                <div key={h}>
                  <label className="label truncate">{h}</label>
                  <select
                    className="input py-2"
                    value={mapping[h] ?? "ignore"}
                    onChange={(e) =>
                      setMapping((m) => ({
                        ...m,
                        [h]: e.target.value as FieldKey,
                      }))
                    }
                  >
                    {fieldOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Namen controleren */}
          {unknownNames.length > 0 && (
            <div className="card">
              <h2 className="mb-1 text-lg font-bold">3. Onbekende namen</h2>
              <p className="mb-3 text-sm text-slate-500">
                Deze namen bestaan nog niet. Maak ze aan of koppel ze aan een
                bestaande bewoner.
              </p>
              <div className="space-y-2">
                {unknownNames.map((name) => (
                  <div
                    key={name}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2"
                  >
                    <span className="font-medium text-slate-800">{name}</span>
                    <select
                      className="input w-auto py-1.5"
                      value={resolutions[name] ?? "new"}
                      onChange={(e) =>
                        setResolutions((r) => ({ ...r, [name]: e.target.value }))
                      }
                    >
                      <option value="new">➕ Nieuwe bewoner aanmaken</option>
                      {residents.map((r) => (
                        <option key={r.id} value={r.id}>
                          Koppel aan: {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Preview */}
          <div className="card">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">4. Preview</h2>
              <div className="flex gap-2 text-sm">
                <span className="chip bg-emerald-100 text-emerald-700">
                  {validCount} geldig
                </span>
                {errorCount > 0 && (
                  <span className="chip bg-red-100 text-red-700">
                    {errorCount} met fouten
                  </span>
                )}
              </div>
            </div>
            <div className="max-h-80 overflow-auto rounded-xl ring-1 ring-slate-100">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="text-left text-xs uppercase text-slate-400">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Bewoner</th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2 text-right">Aantal</th>
                    <th className="px-3 py-2">Maand/datum</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {normalized.slice(0, 50).map((r, i) => (
                    <tr key={i} className={r.error ? "bg-red-50/50" : ""}>
                      <td className="px-3 py-1.5 text-slate-400">{r.rowNumber}</td>
                      <td className="px-3 py-1.5">{r.residentName || "—"}</td>
                      <td className="px-3 py-1.5">
                        {r.productSlug ?? (
                          <span className="text-red-600">{r.productRaw || "?"}</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {r.quantity}
                      </td>
                      <td className="px-3 py-1.5 text-slate-500">
                        {r.period ?? r.occurredAt?.slice(0, 10) ?? "—"}
                      </td>
                      <td className="px-3 py-1.5">
                        {r.error ? (
                          <span className="text-xs font-medium text-red-600">
                            {r.error}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-emerald-600">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {normalized.length > 50 && (
              <p className="mt-2 text-xs text-slate-400">
                Eerste 50 van {normalized.length} regels getoond.
              </p>
            )}

            <button
              onClick={commit}
              disabled={pending || validCount === 0}
              className="btn-primary mt-4 w-full py-3 text-lg"
            >
              {pending
                ? "Bezig met importeren…"
                : `Importeer ${validCount} regels`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
