"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { Avatar } from "./Avatar";
import type { UserRole } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/turven", label: "Snel turven", icon: "⚡" },
  { href: "/maandoverzicht", label: "Maandoverzicht", icon: "📅" },
  { href: "/klassement", label: "Klassement", icon: "🏆" },
  { href: "/bewoners", label: "Bewoners", icon: "👥", adminOnly: true },
  { href: "/import", label: "Import Excel/CSV", icon: "📥", adminOnly: true },
  { href: "/producten", label: "Producten", icon: "🛒", adminOnly: true },
  { href: "/correcties", label: "Correcties", icon: "✏️", adminOnly: true },
  { href: "/instellingen", label: "Instellingen", icon: "⚙️" },
];

// Mobiele snelkoppelingen onderaan.
const BOTTOM: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/turven", label: "Turven", icon: "⚡" },
  { href: "/klassement", label: "Top", icon: "🏆" },
  { href: "/maandoverzicht", label: "Maand", icon: "📅" },
];

export function AppShell({
  children,
  userName,
  role,
}: {
  children: React.ReactNode;
  userName: string;
  role: UserRole;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = NAV.filter((i) => !i.adminOnly || role === "admin");

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2 px-6 py-5">
          <span className="text-2xl">🏠</span>
          <span className="text-xl font-extrabold tracking-tight">Huisturf</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition ${
                isActive(item.href)
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 flex items-center gap-2 px-2 text-sm">
            <Avatar size="sm" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-800">{userName}</p>
              <p className="text-xs capitalize text-slate-400">{role}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button className="btn-ghost w-full text-sm">Uitloggen</button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar (mobiel) */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏠</span>
            <span className="font-extrabold">Huisturf</span>
          </div>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="btn-ghost px-3 py-2"
            aria-label="Menu"
          >
            ☰
          </button>
        </header>

        {/* Slide-over menu (mobiel) */}
        {menuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <div
              className="absolute right-0 top-0 h-full w-72 bg-white p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center gap-2 px-2">
                <Avatar size="sm" />
                <div>
                  <p className="font-semibold">{userName}</p>
                  <p className="text-xs capitalize text-slate-400">{role}</p>
                </div>
              </div>
              <nav className="space-y-1">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium ${
                      isActive(item.href)
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>
              <form action={logoutAction} className="mt-3">
                <button className="btn-ghost w-full">Uitloggen</button>
              </form>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pt-6 lg:pb-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>

        {/* Bottom tab bar (mobiel) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          {BOTTOM.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                isActive(item.href) ? "text-slate-900" : "text-slate-400"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
