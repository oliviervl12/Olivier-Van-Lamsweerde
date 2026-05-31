"use client";

import { useActionState } from "react";
import { loginAction, type AuthState } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    loginAction,
    {},
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-slate-50 to-blue-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-3xl">
            🏠
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Huisturf
          </h1>
          <p className="mt-1 text-slate-500">
            Turf bier, koffie en eieren in huis.
          </p>
        </div>

        <form action={formAction} className="card space-y-4">
          <div>
            <label className="label" htmlFor="email">
              E-mailadres
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input"
              placeholder="jij@huisturf.nl"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Wachtwoord
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
              placeholder="••••••••"
            />
          </div>

          {state.error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {state.error}
            </p>
          )}

          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Bezig met inloggen…" : "Inloggen"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Nog geen account? Vraag een huisgenoot met admin-rechten om je toe te
          voegen.
        </p>
      </div>
    </main>
  );
}
