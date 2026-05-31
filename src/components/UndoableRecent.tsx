"use client";

import { useState, useTransition } from "react";
import { undoEntry } from "@/app/actions/turf";
import { formatRelative } from "@/lib/format";
import { Avatar } from "./Avatar";
import type { TurfEntryDetailed } from "@/lib/types";

// Recente acties met een "ongedaan maken" knop.
// Bewoners kunnen alleen hun eigen actie binnen 5 minuten verwijderen (RLS).
export function UndoableRecent({
  entries,
  currentUserId,
  isAdmin,
}: {
  entries: TurfEntryDetailed[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function canUndo(e: TurfEntryDetailed): boolean {
    if (isAdmin) return true;
    if (e.created_by !== currentUserId) return false;
    return Date.now() - new Date(e.created_at).getTime() < 5 * 60 * 1000;
  }

  function onUndo(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await undoEntry(id);
      if (!res.ok) setError(res.error ?? "Kon niet ongedaan maken.");
    });
  }

  if (entries.length === 0) {
    return <p className="py-6 text-center text-slate-400">Nog geen acties.</p>;
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {entries.map((e) => (
        <div
          key={e.id}
          className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            <Avatar emoji={e.resident?.avatar_emoji} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">
                {e.resident?.name} · {e.product?.emoji} {e.quantity}×{" "}
                {e.product?.name}
              </p>
              <p className="text-xs text-slate-400">
                {formatRelative(e.occurred_at)}
              </p>
            </div>
          </div>
          {canUndo(e) && (
            <button
              onClick={() => onUndo(e.id)}
              disabled={pending}
              className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Ongedaan
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
