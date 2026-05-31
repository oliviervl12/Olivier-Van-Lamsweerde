"use client";

import * as XLSX from "xlsx";

// Exporteert een maandoverzicht naar CSV of Excel (.xlsx).
export interface ExportRow {
  Bewoner: string;
  [product: string]: string | number;
}

export function ExportButtons({
  rows,
  filename,
}: {
  rows: ExportRow[];
  filename: string;
}) {
  function download(type: "csv" | "xlsx") {
    const ws = XLSX.utils.json_to_sheet(rows);
    if (type === "csv") {
      const csv = XLSX.utils.sheet_to_csv(ws);
      triggerDownload(
        new Blob([csv], { type: "text/csv;charset=utf-8;" }),
        `${filename}.csv`,
      );
    } else {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Maandoverzicht");
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      triggerDownload(
        new Blob([out], { type: "application/octet-stream" }),
        `${filename}.xlsx`,
      );
    }
  }

  return (
    <div className="flex gap-2">
      <button onClick={() => download("csv")} className="btn-ghost text-sm">
        ⬇️ CSV
      </button>
      <button onClick={() => download("xlsx")} className="btn-ghost text-sm">
        ⬇️ Excel
      </button>
    </div>
  );
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
