// Badge-definities voor het klassement. Grappig maar niet kinderachtig.
export interface BadgeDef {
  key: string;
  label: string;
  emoji: string;
  description: string;
}

export const BADGES: Record<string, BadgeDef> = {
  bierkoning: {
    key: "bierkoning",
    label: "Bierkoning",
    emoji: "👑",
    description: "Meeste bier deze maand",
  },
  koffiebaas: {
    key: "koffiebaas",
    label: "Koffiebaas",
    emoji: "☕",
    description: "Meeste koffie deze maand",
  },
  eiermachine: {
    key: "eiermachine",
    label: "Eiermachine",
    emoji: "🥚",
    description: "Meeste eieren deze maand",
  },
  alleskunner: {
    key: "alleskunner",
    label: "Alleskunner",
    emoji: "🌟",
    description: "Meest actieve bewoner (alle producten samen)",
  },
  comeback: {
    key: "comeback",
    label: "Comeback van de maand",
    emoji: "📈",
    description: "Grootste stijger t.o.v. vorige maand",
  },
  huislegende: {
    key: "huislegende",
    label: "Huislegende",
    emoji: "🏆",
    description: "Legende van de maand: hoogste totaalscore",
  },
};

// Koppel een productslug aan de bijbehorende ranking-badge.
export function badgeForProductSlug(slug: string): BadgeDef | null {
  if (slug === "bier") return BADGES.bierkoning;
  if (slug === "koffie") return BADGES.koffiebaas;
  if (slug === "ei") return BADGES.eiermachine;
  return null;
}
